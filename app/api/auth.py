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


# --- OAuth Endpoints ---


# 重定向到 OAuth 提供商进行授权
@router.get("/oauth/authorize/{provider}")
async def oauth_authorize(provider: str, request: Request):
    """
    发起 OAuth 授权请求，重定向到第三方 OAuth 提供商的授权页面。
    """
    # 构造回调 URI，这应该是 OAuth 提供商在授权后将用户重定向回来的地址
    # 示例: http://localhost:8000/api/oauth/callback/github
    # 确保这个 URI 在您的 OAuth 提供商应用设置中是已注册的回调地址
    current_base_url = str(request.url).split("/api/oauth/authorize")[0]  # 获取基础URL
    redirect_uri = f"{current_base_url}/api/oauth/callback/{provider}"

    # 重要的 CSRF 保护：生成并存储一个随机 state 值。
    # 生产环境中，这个 state 应该存储在用户的会话中（例如 Redis 或数据库），并在回调时验证。
    # 这里为了简化示例，生成一个简单的 UUID 作为 state。
    state = str(uuid.uuid4())
    logger.info(f"Generated OAuth state for {provider}: {state}")
    # TODO: 将 state 存储在安全的地方，例如 Redis 或用户的 session cookie。
    # 并在回调时验证此 state。

    try:
        auth_url = await get_oauth_authorization_url(provider, redirect_uri, state)
        # HTTP 302 Found 状态码和 Location 头用于重定向
        return Response(
            status_code=status.HTTP_302_FOUND, headers={"Location": auth_url}
        )
    except HTTPException as e:
        logger.error(f"OAuth authorization failed for {provider}: {e.detail}")
        return ApiResponse(code=e.status_code, msg=f"OAuth 授权失败: {e.detail}")
    except Exception as e:
        logger.exception(f"Unexpected error during OAuth authorization for {provider}")
        return ApiResponse(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=f"OAuth 授权失败: {e}"
        )


# OAuth 回调接口
@router.get("/oauth/callback/{provider}", response_model=ApiResponse[Token])
async def oauth_callback(
    provider: str,
    code: str,  # OAuth 提供商返回的授权码
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    state: Optional[str] = None,  # 用于 CSRF 保护的状态参数
):
    """
    处理 OAuth 提供商重定向回来的回调请求，交换 access token 并进行用户登录/注册。
    """
    try:
        # TODO: 在生产环境中，这里需要验证 state 参数是否与之前存储的匹配，防止 CSRF 攻击。
        # 例如：if stored_state != state: raise HTTPException(...)
        logger.info(
            f"Received OAuth callback for {provider} with code: {code}, state: {state}"
        )

        # 构造回调 URI，确保与授权时使用的 URI 完全一致
        current_base_url = str(request.url).split("/api/oauth/callback")[
            0
        ]  # 获取基础URL
        # 移除查询参数部分，只保留路径，因为redirect_uri通常不包含查询参数
        redirect_uri = f"{current_base_url}/api/oauth/callback/{provider}"

        # 获取 access token 和用户信息
        oauth_data = await get_oauth_token_and_userinfo(provider, code, redirect_uri)
        user_info = oauth_data["user_info"]
        access_token_provider = oauth_data[
            "access_token"
        ]  # 从OAuth提供商获取的access_token

        provider_user_id: Optional[str] = None
        user_email: Optional[str] = None

        # 根据不同的提供商提取用户唯一 ID 和邮箱
        if provider == "github":
            provider_user_id = str(user_info.get("id"))
            # GitHub 的 email 可能为 null，尤其在用户没有公开邮箱时
            user_email = user_info.get("email")
            # 如果需要私有邮箱，可能需要额外的API请求（取决于scope和权限）
            # if not user_email and user_info.get("private_emails_url"): pass
        elif provider == "google":
            provider_user_id = user_info.get("sub")  # Google 的 sub 字段是用户唯一 ID
            user_email = user_info.get("email")
        elif provider == "wechat":
            # 微信的 openid 是用户在该应用下的唯一标识
            provider_user_id = user_info.get("openid")
            # 微信通常不直接提供邮箱
            user_email = None
            # 如果需要 UnionID (跨应用唯一)，需要在 UnionID 机制下获取
        elif provider == "feishu":
            # 飞书通常使用 union_id 或 open_id 作为用户唯一标识
            provider_user_id = user_info.get("data", {}).get(
                "union_id"
            ) or user_info.get("data", {}).get("open_id")
            user_email = user_info.get("data", {}).get("email")
        else:
            return ApiResponse(
                code=status.HTTP_400_BAD_REQUEST,
                msg=f"不支持的 OAuth 提供商: {provider}",
            )

        if not provider_user_id:
            return ApiResponse(
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                msg="未能从 OAuth 提供商获取用户唯一ID",
            )

        # 检查是否已存在该 OAuth 账号
        oauth_account = await user_crud.get_oauth_account(
            db, provider, provider_user_id
        )

        user: Optional[User] = None
        if oauth_account:
            # 如果 OAuth 账号已存在，则表示该用户已经通过此 OAuth 登录过
            # 获取关联的用户信息
            user = await user_crud.get_by_id(db, oauth_account.user_id)
            if not user:
                # 理论上不应该发生，除非数据库出现不一致
                return ApiResponse(
                    code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg="关联用户未找到"
                )
            logger.info(
                f"Existing OAuth account found for {provider}, user ID: {user.id}"
            )
        else:
            # 如果没有找到现有用户，则创建新用户 (仅限 OAuth 登录，无密码)
            user = await user_crud.create_oauth_only_user(db, email=user_email)
            logger.info(
                f"Created new user via OAuth, user ID: {user.id}, email: {user.email}"
            )

            # 创建 OAuth 账号并关联到用户
            expires_in = oauth_data["token_data"].get("expires_in")
            expires_at_timestamp = None
            if expires_in is not None:
                expires_at_timestamp = (
                    int(datetime.now(timezone.utc).timestamp()) + expires_in
                )

            await user_crud.create_oauth_account(
                db,
                user.id,
                provider,
                provider_user_id,
                access_token=access_token_provider,  # 存储从OAuth提供商获取的access_token
                expires_at=expires_at_timestamp,
            )
            logger.info(
                f"Created new OAuth account for user {user.id} with provider {provider}, provider_user_id {provider_user_id}"
            )

        # 为用户生成应用内部的 JWT access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        app_access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        return ApiResponse(
            data={"access_token": app_access_token, "token_type": "bearer"},
            msg="OAuth 登录成功",
        )

    except HTTPException as e:
        logger.error(f"OAuth callback failed for {provider}: {e.detail}")
        return ApiResponse(code=e.status_code, msg=f"OAuth 回调失败: {e.detail}")
    except Exception as e:
        logger.exception(f"Unexpected error during OAuth callback for {provider}")
        return ApiResponse(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=f"OAuth 回调失败: {e}"
        )
