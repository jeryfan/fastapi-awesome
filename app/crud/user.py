from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.user import User, OAuthAccount
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from uuid import UUID
from typing import Optional


class CRUDUser(CRUDBase[User]):
    async def get_by_id(self, db: AsyncSession, user_id: UUID) -> Optional[User]:
        """根据用户ID获取用户。"""

        return await self.get(db, primary_key=user_id)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """根据邮箱获取用户。"""

        return await self.get(db, email=email)

    async def create_user(self, db: AsyncSession, user: UserCreate) -> User:
        """创建新用户。"""

        # 允许 OAuth-only 用户没有密码
        if user.password:
            hashed_password = get_password_hash(user.password)
            user.password = hashed_password

        return await self.insert(db, obj_in=user)

    async def create_oauth_only_user(
        self, db: AsyncSession, email: Optional[str] = None
    ) -> User:
        """为OAuth登录创建仅OAuth用户 (没有密码)。"""
        user = UserCreate(name="", email=email, password=None)
        return await self.insert(db, obj_in=user)

    async def update_user(
        self, db: AsyncSession, db_user: User, user_in: UserUpdate
    ) -> User:
        """更新用户信息。"""
        
        return await self.update(db,db_obj=db_user, obj_in=user_in)
    
    

    async def delete_user(self, db: AsyncSession, db_user: User):
        """删除用户。"""
        
        pass

    async def get_oauth_account(
        self, db: AsyncSession, provider: str, provider_user_id: str
    ) -> Optional[OAuthAccount]:
        """根据提供商和提供商用户ID获取OAuth账号。"""
        stmt = (
            select(OAuthAccount)
            .where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id,
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_oauth_account(
        self,
        db: AsyncSession,
        user_id: UUID,
        provider: str,
        provider_user_id: str,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        expires_at: Optional[int] = None,
    ) -> OAuthAccount:
        """创建新的OAuth账号。"""
        data = {
            "user_id": user_id,
            "provider": provider,
            "provider_user_id": provider_user_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }
        # expires_at 如果是时间戳（秒），可转换为 datetime；这里直接忽略或保持 None
        return await CRUDBase[OAuthAccount](OAuthAccount).insert(db, obj_in=data)


user_crud = CRUDUser(User)
