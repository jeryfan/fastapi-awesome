from uuid import UUID
from typing import Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.crud.base import CRUDBase
from app.models.chat import Conversation, Message
from app.schemas.chat import ConversationCreate, MessageCreate, MessageUpdate
from sqlalchemy.orm import selectinload


class CRUDConversation(CRUDBase[Conversation]):
    async def get_by_id(self, db: AsyncSession, id: UUID) -> Optional[Conversation]:
        """根据会话ID获取会话"""
        return await self.get(db, primary_key=id)

    async def list_conversations(
        self,
        db: AsyncSession,
        limit: int = 50,
        page: int = 1,
        **kwargs,
    ) -> List[Conversation]:
        """列出用户的会话"""

        return await self.query(db, page=page, limit=limit, filters=kwargs)

    async def create_conversation(
        self, db: AsyncSession, obj_in: ConversationCreate, created_by: UUID
    ) -> Conversation:
        """创建新会话"""
        data = obj_in.model_dump()
        data["created_by"] = created_by
        return await self.insert(db, obj_in=data)


class CRUDMessage(CRUDBase[Message]):
    async def get_by_id(self, db: AsyncSession, id: UUID) -> Optional[Message]:
        """根据消息ID获取消息"""
        return await self.get(db, primary_key=id)

    async def list_messages(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        page: int = 1,
        limit: int = 100,
        **kwargs,
    ) -> List[Conversation]:
        """列出会话的消息"""

        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )

        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        return conversation

    async def create_message(
        self, db: AsyncSession, obj_in: MessageCreate, created_by: UUID
    ) -> Message:
        """创建消息"""
        data = obj_in.model_dump()
        data["created_by"] = created_by
        return await self.insert(db, obj_in=data)

    async def update_message(
        self, db: AsyncSession, db_obj: Message, obj_in: MessageUpdate
    ) -> Message:
        """更新消息"""
        return await self.update(db, db_obj=db_obj, obj_in=obj_in)


conversation_crud = CRUDConversation(Conversation)
message_crud = CRUDMessage(Message)
