from typing import Any, Dict, List, Optional, Type, TypeVar, Union, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_, and_, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.inspection import inspect
from pydantic import BaseModel


ModelType = TypeVar("ModelType")


class CRUDBase(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def orm_to_dict(self, obj: ModelType) -> Dict[str, Any]:
        return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}

    def build_filters(self, filters: Dict[str, Any]):
        conditions = []
        for field_expr, value in filters.items():
            if "__" in field_expr:
                field, op = field_expr.split("__", 1)
            else:
                field, op = field_expr, "eq"

            column = getattr(self.model, field, None)
            if not column:
                continue

            if op == "eq":
                conditions.append(column == value)
            elif op == "like":
                conditions.append(column.like(f"%{value}%"))
            elif op == "ilike":
                conditions.append(column.ilike(f"%{value}%"))
            elif op == "in":
                conditions.append(column.in_(value))
            elif op == "gte":
                conditions.append(column >= value)
            elif op == "lte":
                conditions.append(column <= value)
            elif op == "ne":
                conditions.append(column != value)
        return conditions

    def build_or_conditions(self, or_filters: List[Dict[str, Any]]):
        or_conditions = []
        for group in or_filters:
            and_conditions = self.build_filters(group)
            if and_conditions:
                or_conditions.append(and_(*and_conditions))
        return or_conditions

    async def get(
        self, db: AsyncSession, *, primary_key: Any = None, **filters
    ) -> Optional[ModelType]:
        if primary_key is not None:
            return await db.get(self.model, primary_key)
        stmt = select(self.model).filter(*self.build_filters(filters))
        result = await db.execute(stmt)
        return result.scalars().first()

    async def query(
        self,
        db: AsyncSession,
        *,
        page: int = 1,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        or_filters: Optional[List[Dict[str, Any]]] = None,
        order_by: Optional[Union[str, List[str]]] = None,
        exclude_fields: Optional[List[str]] = None,
        return_total: bool = False,
        select_fields: Optional[List[str]] = None,
        joins: Optional[List[Any]] = None,
    ) -> Union[List[ModelType], Dict[str, Any]]:
        stmt = select(self.model)

        if joins:
            for rel in joins:
                stmt = stmt.options(selectinload(rel))

        conditions = []
        if filters:
            conditions += self.build_filters(filters)
        if or_filters:
            or_clauses = self.build_or_conditions(or_filters)
            if or_clauses:
                conditions.append(or_(*or_clauses))
        if conditions:
            stmt = stmt.filter(*conditions)

        if order_by:
            if isinstance(order_by, str):
                order_by = [order_by]
            order_clauses = []
            for field in order_by:
                column = getattr(self.model, field.lstrip("-"), None)
                if column is not None:
                    order_clauses.append(
                        desc(column) if field.startswith("-") else asc(column)
                    )
            if order_clauses:
                stmt = stmt.order_by(*order_clauses)
        skip = (page - 1) * limit
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)

        if select_fields:
            all_rows = result.scalars().all()
            trimmed = [
                {field: getattr(row, field, None) for field in select_fields}
                for row in all_rows
            ]
        else:
            trimmed = result.scalars().all()

        if exclude_fields:
            for item in trimmed:
                for field in exclude_fields:
                    if isinstance(item, dict):
                        item.pop(field, None)
                    elif hasattr(item, field):
                        setattr(item, field, None)

        if return_total:
            count_stmt = select(func.count()).select_from(self.model)
            if conditions:
                count_stmt = count_stmt.filter(*conditions)
            count_result = await db.execute(count_stmt)
            total = count_result.scalar()
            return {"total": total, "list": trimmed}

        return trimmed

    async def count(
        self,
        db: AsyncSession,
        *,
        filters: Optional[Dict[str, Any]] = None,
        or_filters: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        stmt = select(func.count()).select_from(self.model)
        conditions = []
        if filters:
            conditions += self.build_filters(filters)
        if or_filters:
            or_clauses = self.build_or_conditions(or_filters)
            if or_clauses:
                conditions.append(or_(*or_clauses))
        if conditions:
            stmt = stmt.filter(*conditions)
        result = await db.execute(stmt)
        return result.scalar()

    async def insert(
        self, db: AsyncSession, *, obj_in: Union[Dict[str, Any], BaseModel]
    ) -> ModelType:
        data = obj_in.model_dump() if isinstance(obj_in, BaseModel) else obj_in
        db_obj = self.model(**data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def insert_many(
        self, db: AsyncSession, *, objs_in: List[Union[Dict[str, Any], BaseModel]]
    ) -> List[ModelType]:
        db_objs = [
            self.model(**(obj.model_dump() if isinstance(obj, BaseModel) else obj))
            for obj in objs_in
        ]
        db.add_all(db_objs)
        await db.commit()
        for obj in db_objs:
            await db.refresh(obj)
        return db_objs

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[Dict[str, Any], BaseModel],
    ) -> ModelType:
        update_data = (
            obj_in.model_dump(exclude_unset=True)
            if isinstance(obj_in, BaseModel)
            else obj_in
        )
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_many(
        self, db: AsyncSession, *, ids: List[Any], obj_in: Dict[str, Any]
    ) -> int:
        model_fields = self.model.__table__.columns.keys()
        safe_obj_in = {k: v for k, v in obj_in.items() if k in model_fields}
        if not safe_obj_in:
            return 0
        stmt = update(self.model).where(self.model.id.in_(ids)).values(**safe_obj_in)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount

    async def delete(
        self,
        db: AsyncSession,
        *,
        primary_key: Optional[Any] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Optional[ModelType]:

        stmt = delete(self.model)
        if primary_key is not None:
            if isinstance(primary_key, (list, tuple)):
                stmt = stmt.where(self.model.id.in_(primary_key))
            else:
                stmt = stmt.where(self.model.id == primary_key)
        elif filters:
            stmt = stmt.where(*self.build_filters(filters))
        else:
            raise ValueError(
                "Either primary_key or filters must be provided for deletion."
            )
        await db.execute(stmt)
        await db.commit()
