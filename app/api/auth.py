from fastapi import Depends, APIRouter, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
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


# ================= OAuth 通过后端回调的登录 =================

@router.get("/oauth/authorize/{provider}")
async def oauth_authorize(provider: str, request: Request):
    """
    生成并跳转到第三方授权页，回调地址由后端处理。
    前端可在查询参数中传入 `next`，登录成功后会重定向到该地址。
    """
    # 构造后端回调地址
    base_url = str(request.base_url).rstrip("/")
    callback_uri = f"{base_url}/api/oauth/callback/{provider}"

    # 透传 next 用于回跳
    next_url = request.query_params.get("next", "/")
    # 使用简单 state，将 next 编码进去。生产建议将 state 与 CSRF 缓存绑定。
    state = next_url
    auth_url = await get_oauth_authorization_url(provider, callback_uri, state)
    return RedirectResponse(url=auth_url)


@router.get("/oauth/callback/{provider}")
async def oauth_callback(
    provider: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    后端接收第三方回调，换取用户信息，创建/绑定本地用户，签发本地 JWT，
    然后以 302 重定向回前端携带 token（或通过HttpOnly Cookie）。
    """
    code = request.query_params.get("code")
    state = request.query_params.get("state", "/")
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少授权码code")

    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/oauth/callback/{provider}"

    # 与第三方交换 token 并获取用户信息
    oauth_ret = await get_oauth_token_and_userinfo(provider, code, redirect_uri)
    user_info = oauth_ret.get("user_info", {})

    # 解析第三方的唯一ID及邮箱、昵称
    provider_user_id = None
    email = None
    name = None
    if provider == "github":
        provider_user_id = str(user_info.get("id"))
        email = user_info.get("email")
        name = user_info.get("name") or user_info.get("login")
    elif provider == "google":
        provider_user_id = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
    elif provider == "wechat":
        provider_user_id = user_info.get("unionid") or user_info.get("openid")
        name = user_info.get("nickname")
        # 微信一般无邮箱
    elif provider == "feishu":
        provider_user_id = user_info.get("user_id") or user_info.get("open_id")
        email = user_info.get("email")
        name = user_info.get("name")

    if not provider_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无法获取第三方用户ID")

    # 查找是否已有对应的 oauth 绑定
    oauth_account = await user_crud.get_oauth_account(db, provider, provider_user_id)
    if oauth_account:
        user = await user_crud.get_by_id(db, oauth_account.user_id)
    else:
        # 若未绑定，则按邮箱查找用户；否则创建仅OAuth用户
        user = None
        if email:
            user = await user_crud.get_by_email(db, email)
        if not user:
            user = await user_crud.create_user(db, UserCreate(name=name or "", email=email, password=None))
        await user_crud.create_oauth_account(
            db,
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token=oauth_ret.get("access_token"),
        )

    # 颁发本地 JWT 并重定向到前端
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    # 将 token 通过前端路由参数返回，或设置为 Cookie。这里采用路由参数并重定向到前端域名。
    next_url = state or "/"
    # 如果 state 是绝对地址可能引起开放重定向，生产应校验白名单。这里简单防护：仅允许相对路径。
    if next_url.startswith("http://") or next_url.startswith("https://"):
        next_url = "/"
    frontend_base = settings.FRONTEND_BASE_URL.rstrip('/')
    login_path = settings.FRONTEND_LOGIN_PATH or "/login"
    redirect_target = f"{frontend_base}{login_path}?access_token={access_token}#oauth_success"
    if next_url and next_url != login_path:
        redirect_target += f"&next={next_url}"
    return RedirectResponse(url=redirect_target)
