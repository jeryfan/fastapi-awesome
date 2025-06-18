from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, OAuthAccount
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from uuid import UUID
from typing import Optional

class CRUDUser:
    async def get_by_id(self, db: AsyncSession, user_id: UUID) -> Optional[User]:
        """根据用户ID获取用户。"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """根据邮箱获取用户。"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def create_user(self, db: AsyncSession, user: UserCreate) -> User:
        """创建新用户。"""
        # 对密码进行哈希
        hashed_password = get_password_hash(user.password)
        db_user = User(
            name=user.name,
            email=user.email,
            password=hashed_password,
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
    
    async def create_oauth_only_user(self, db: AsyncSession, email: Optional[str] = None) -> User:
        """为OAuth登录创建仅OAuth用户 (没有密码)。"""
        db_user = User(
            name="",
            email=email,
            password=None
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update_user(self, db: AsyncSession, db_user: User, user_in: UserUpdate) -> User:
        """更新用户信息。"""
        if user_in.name:
            db_user.name = user_in.name
        if user_in.password:
            db_user.password = get_password_hash(user_in.password)
        if user_in.email:
            db_user.email = user_in.email
        # if user_in.is_active is not None:
        #     db_user.is_active = user_in.is_active
        # if user_in.is_superuser is not None:
        #     db_user.is_superuser = user_in.is_superuser

        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def delete_user(self, db: AsyncSession, db_user: User):
        """删除用户。"""
        await db.delete(db_user)
        await db.commit()

    async def get_oauth_account(self, db: AsyncSession, provider: str, provider_user_id: str) -> Optional[OAuthAccount]:
        """根据提供商和提供商用户ID获取OAuth账号。"""
        result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id
            )
        )
        return result.scalars().first()

    async def create_oauth_account(self, db: AsyncSession, user_id: UUID, provider: str, provider_user_id: str, access_token: Optional[str] = None, refresh_token: Optional[str] = None, expires_at: Optional[int] = None) -> OAuthAccount:
        """创建新的OAuth账号。"""
        oauth_account = OAuthAccount(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at
        )
        db.add(oauth_account)
        await db.commit()
        await db.refresh(oauth_account)
        return oauth_account


user_crud = CRUDUser()