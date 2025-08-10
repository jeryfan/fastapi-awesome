from fastapi import Depends, APIRouter, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.db import get_db
from app.schemas.user import UserCreate, User, LoginRequest
from app.schemas.token import Token, TokenData
from app.crud.user import user_crud
from app.core.security import verify_password, create_access_token, decode_access_token
from app.config import settings
from datetime import timedelta, datetime, timezone
from typing import Annotated, Optional
from uuid import UUID
import uuid
import logging

from app.core.oauth import get_oauth_authorization_url, get_oauth_token_and_userinfo
from app.schemas.response import ApiResponse, MessageResponse
from app.core.router import APIRoute

router = APIRouter(route_class=APIRoute)
logger = logging.getLogger(__name__)

# OAuth2PasswordBearer 用于从请求头中获取 token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    获取当前认证用户，从 JWT token 中解析用户 ID。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)  # 解码 token
    if payload is None:
        raise credentials_exception
    user_id: Optional[str] = payload.get("sub")  # 获取用户 ID
    if user_id is None:
        raise credentials_exception
    try:
        user = await user_crud.get_by_id(db, UUID(user_id))  # 根据 ID 从数据库获取用户
    except ValueError:  # If user_id is not a valid UUID
        raise credentials_exception
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    获取当前活跃用户，确保用户没有被禁用。
    """
    # if not current_user.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户已被禁用")
    return current_user


@router.post(
    "/auth/register",
    response_model=ApiResponse[User],
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    user_in: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    用户注册接口，通过邮箱和密码注册。
    """
    try:
        # 检查邮箱是否已被注册
        user = await user_crud.get_by_email(db, user_in.email)
        if user:
            return ApiResponse(code=status.HTTP_400_BAD_REQUEST, msg="该邮箱已被注册")
        # 创建新用户
        new_user = await user_crud.create_user(db, user_in)
        return ApiResponse(data=new_user, msg="注册成功")
    except Exception as e:
        logger.exception(f"注册失败: {e}")
        return ApiResponse(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=f"注册失败: {e}"
        )


@router.post("/auth/login", response_model=ApiResponse[Token])
async def login_for_access_token(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    通过邮箱和密码获取 access token。
    """
    print(db)
    try:
        user = await user_crud.get_by_email(db, login_data.email)
        # 验证用户是否存在、是否有密码、密码是否正确
        if (
            not user
            or not user.password
            or not verify_password(login_data.password, user.password)
        ):
            return ApiResponse(
                code=status.HTTP_401_UNAUTHORIZED, msg="邮箱或密码不正确"
            )

        # 创建 access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},  # token payload 中的 sub 字段通常是用户 ID
            expires_delta=access_token_expires,
        )
    except Exception as e:
        logger.exception(f"登录失败: {e}")
        return ApiResponse(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=f"登录失败: {e}"
        )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(current_user: Annotated[User, Depends(get_current_user)]):
    # Here you can add logic to invalidate the token, e.g., add it to a blacklist.
    # For simplicity, we'll just return a success message.
    pass


@router.get("/me", response_model=ApiResponse[User])
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    获取当前登录用户的信息。
    """
    return current_user
