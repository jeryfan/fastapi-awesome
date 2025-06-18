





# app/crud/user.py
# 封装数据库的增删改查 (CRUD) 操作。

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
            email=user.email,
            hashed_password=hashed_password,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
        )
        db.add(db_user) # 添加到会话
        await db.commit() # 提交事务
        await db.refresh(db_user) # 刷新对象以获取数据库生成的值（如 ID）
        return db_user
    
    async def create_oauth_only_user(self, db: AsyncSession, email: Optional[str] = None) -> User:
        """为OAuth登录创建仅OAuth用户 (没有密码)。"""
        db_user = User(
            email=email,
            hashed_password=None, # OAuth用户没有密码
            is_active=True,
            is_superuser=False,
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update_user(self, db: AsyncSession, db_user: User, user_in: UserUpdate) -> User:
        """更新用户信息。"""
        if user_in.password:
            db_user.hashed_password = get_password_hash(user_in.password)
        if user_in.email:
            db_user.email = user_in.email
        if user_in.is_active is not None:
            db_user.is_active = user_in.is_active
        if user_in.is_superuser is not None:
            db_user.is_superuser = user_in.is_superuser

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

# 实例化 CRUDUser，方便在路由中使用
user_crud = CRUDUser()


# app/core/oauth.py
# 封装不同 OAuth 提供商的授权和信息获取逻辑。
# 注意：生产环境需要更严格的错误处理、状态管理 (CSRF) 和更复杂的提供商API细节。

from fastapi import HTTPException, status
from httpx import AsyncClient # 用于发送 HTTP 请求
from app.core.config import settings
from typing import Dict, Any, Optional

# OAuth 提供商配置字典
OAUTH_PROVIDERS = {
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "scope": "user:email", # 请求用户邮箱权限
    },
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "scope": "openid email profile", # 请求OpenID、邮箱和个人资料
    },
    # 微信开放平台（PC 网站应用）
    # 注意：微信的OAuth流程相对复杂，这里是简化版本，实际可能需要额外的步骤（如静默登录、unionid获取）
    "wechat": {
        "authorize_url": "https://open.weixin.qq.com/connect/qrconnect", # PC端扫码登录授权URL
        "token_url": "https://api.weixin.qq.com/sns/oauth2/access_token",
        "userinfo_url": "https://api.weixin.qq.com/sns/userinfo",
        "client_id": settings.WECHAT_APP_ID,
        "client_secret": settings.WECHAT_APP_SECRET,
        "scope": "snsapi_login", # 扫码登录所需scope
    },
    # 飞书开放平台
    "feishu": {
        "authorize_url": "https://open.feishu.cn/open-apis/authen/v1/index",
        "token_url": "https://open.feishu.cn/open-apis/authen/v1/access_token",
        "userinfo_url": "https://open.feishu.cn/open-apis/authen/v1/user_info",
        "client_id": settings.FEISHU_APP_ID,
        "client_secret": settings.FEISHU_APP_SECRET,
        "scope": "authen_info", # 认证信息scope
    }
}

async def get_oauth_authorization_url(provider: str, redirect_uri: str, state: str) -> str:
    """
    根据提供商和回调URI生成OAuth授权URL。
    state 参数用于防止 CSRF 攻击，必须是唯一且一次性的。
    """
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的 OAuth 提供商")

    provider_config = OAUTH_PROVIDERS[provider]
    client_id = provider_config["client_id"]
    scope = provider_config.get("scope", "")

    # 根据不同提供商构造授权URL
    if provider == "wechat":
        # 微信 PC 扫码登录
        return (f"{provider_config['authorize_url']}?appid={client_id}&redirect_uri={redirect_uri}"
                f"&response_type=code&scope={scope}&state={state}#wechat_redirect")
    elif provider == "feishu":
        # 飞书
        return (f"{provider_config['authorize_url']}?app_id={client_id}&redirect_uri={redirect_uri}"
                f"&response_type=code&state={state}")
    else:
        # 通用 OAuth 2.0 授权码模式 (GitHub, Google)
        return (f"{provider_config['authorize_url']}?client_id={client_id}&redirect_uri={redirect_uri}"
                f"&response_type=code&scope={scope}&state={state}")

async def get_oauth_token_and_userinfo(provider: str, code: str, redirect_uri: str) -> Dict[str, Any]:
    """
    根据授权码获取 OAuth access token 和用户信息。
    """
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的 OAuth 提供商")

    provider_config = OAUTH_PROVIDERS[provider]
    client_id = provider_config["client_id"]
    client_secret = provider_config["client_secret"]
    token_url = provider_config["token_url"]
    userinfo_url = provider_config["userinfo_url"]

    async with AsyncClient() as client:
        # 第一步：交换授权码获取 access token
        token_data = {}
        access_token: Optional[str] = None
        
        if provider == "github":
            response = await client.post(
                token_url,
                headers={"Accept": "application/json"}, # GitHub 要求 Accept 头
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            response.raise_for_status() # 检查 HTTP 错误
            token_data = response.json()
            access_token = token_data.get("access_token")
        elif provider == "google":
            response = await client.post(
                token_url,
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            token_data = response.json()
            access_token = token_data.get("access_token")
        elif provider == "wechat":
            # 微信的 access_token 接口是 GET 请求
            response = await client.get(
                f"{token_url}?appid={client_id}&secret={client_secret}&code={code}&grant_type=authorization_code"
            )
            response.raise_for_status()
            token_data = response.json()
            if "errcode" in token_data: # 微信错误码处理
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"WeChat OAuth error: {token_data.get('errmsg')}")
            access_token = token_data.get("access_token")
            # 微信用户信息需要 access_token 和 openid
            openid = token_data.get("openid")
            userinfo_url = f"{userinfo_url}?access_token={access_token}&openid={openid}"
        elif provider == "feishu":
            # 飞书的 access_token 接口是 POST 请求，且参数格式不同
            response = await client.post(
                token_url,
                headers={"Content-Type": "application/json"},
                json={
                    "app_id": client_id,
                    "app_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            token_data = response.json()
            if token_data.get("code") != 0: # 飞书错误码处理
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Feishu OAuth error: {token_data.get('msg')}")
            access_token = token_data.get("data", {}).get("access_token")
            # 飞书获取用户信息可能需要 `user_access_token` 或 `access_token`
            user_access_token = token_data.get("data", {}).get("user_access_token") 
            if user_access_token: 
                access_token = user_access_token # 优先使用 user_access_token

        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="未能从 OAuth 提供商获取 access token")

        # 第二步：使用 access token 获取用户信息
        headers = {"Authorization": f"Bearer {access_token}"}
        # 微信和飞书的 userinfo 获取方式可能不同，已在上面处理或单独处理
        if provider == "wechat":
            userinfo_response = await client.get(userinfo_url) # 微信GET请求不需要 Authorization header
        elif provider == "feishu":
             # 飞书用户详情接口可能需要不同的 Authorization 方式或请求体
             # 这里假设 Authorization: Bearer {user_access_token} 即可
             userinfo_response = await client.get(userinfo_url, headers=headers)
             if userinfo_response.json().get("code") != 0: # 飞书用户详情接口的错误码
                 raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Feishu user info error: {userinfo_response.json().get('msg')}")
        else:
            userinfo_response = await client.get(userinfo_url, headers=headers)
        
        userinfo_response.raise_for_status()
        user_info = userinfo_response.json()

        return {
            "access_token": access_token,
            "token_data": token_data, # 原始的 token 数据
            "user_info": user_info,
        }


# app/api/auth.py
# 认证相关的 API 路由，包括注册、登录和 OAuth 流程。

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.user import UserCreate, User
from app.schemas.token import Token, TokenData
from app.crud.user import user_crud
from app.core.security import verify_password, create_access_token, decode_access_token
from app.core.config import settings
from datetime import timedelta
from typing import Annotated, Optional
from uuid import UUID
import uuid # 用于生成临时的 state 值
import logging

from app.core.oauth import get_oauth_authorization_url, get_oauth_token_and_userinfo

router = APIRouter()
logger = logging.getLogger(__name__)

# OAuth2PasswordBearer 用于从请求头中获取 token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[AsyncSession, Depends(get_db)]) -> User:
    """
    获取当前认证用户，从 JWT token 中解析用户 ID。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token) # 解码 token
    if payload is None:
        raise credentials_exception
    user_id: Optional[str] = payload.get("sub") # 获取用户 ID
    if user_id is None:
        raise credentials_exception
    try:
        user = await user_crud.get_by_id(db, UUID(user_id)) # 根据 ID 从数据库获取用户
    except ValueError: # If user_id is not a valid UUID
        raise credentials_exception
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    获取当前活跃用户，确保用户没有被禁用。
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户已被禁用")
    return current_user

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    """
    用户注册接口，通过邮箱和密码注册。
    """
    # 检查邮箱是否已被注册
    user = await user_crud.get_by_email(db, user_in.email)
    if user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已被注册")
    # 创建新用户
    new_user = await user_crud.create_user(db, user_in)
    return new_user

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], # 使用 OAuth2PasswordRequestForm 获取用户名和密码
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    通过邮箱和密码获取 access token。
    """
    user = await user_crud.get_by_email(db, form_data.username) # form_data.username 实际上是邮箱
    # 验证用户是否存在、是否有密码、密码是否正确
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用",
        )
    
    # 创建 access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, # token payload 中的 sub 字段通常是用户 ID
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
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
    # 示例: http://localhost:8000/auth/oauth/callback/github
    # 确保这个 URI 在您的 OAuth 提供商应用设置中是已注册的回调地址
    current_base_url = str(request.url).split('/auth/oauth/authorize')[0] # 获取基础URL
    redirect_uri = f"{current_base_url}/auth/oauth/callback/{provider}"
    
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
        return Response(status_code=status.HTTP_302_FOUND, headers={"Location": auth_url})
    except HTTPException as e:
        logger.error(f"OAuth authorization failed for {provider}: {e.detail}")
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error during OAuth authorization for {provider}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OAuth 授权失败: {e}")

# OAuth 回调接口
@router.get("/oauth/callback/{provider}", response_model=Token)
async def oauth_callback(
    provider: str,
    code: str, # OAuth 提供商返回的授权码
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    state: Optional[str] = None, # 用于 CSRF 保护的状态参数
):
    """
    处理 OAuth 提供商重定向回来的回调请求，交换 access token 并进行用户登录/注册。
    """
    # TODO: 在生产环境中，这里需要验证 state 参数是否与之前存储的匹配，防止 CSRF 攻击。
    # 例如：if stored_state != state: raise HTTPException(...)
    logger.info(f"Received OAuth callback for {provider} with code: {code}, state: {state}")

    # 构造回调 URI，确保与授权时使用的 URI 完全一致
    current_base_url = str(request.url).split('/auth/oauth/callback')[0] # 获取基础URL
    # 移除查询参数部分，只保留路径，因为redirect_uri通常不包含查询参数
    redirect_uri = f"{current_base_url}/auth/oauth/callback/{provider}" 

    try:
        # 获取 access token 和用户信息
        oauth_data = await get_oauth_token_and_userinfo(provider, code, redirect_uri)
        user_info = oauth_data["user_info"]
        access_token_provider = oauth_data["access_token"] # 从OAuth提供商获取的access_token
        
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
            provider_user_id = user_info.get("sub") # Google 的 sub 字段是用户唯一 ID
            user_email = user_info.get("email")
        elif provider == "wechat":
            # 微信的 openid 是用户在该应用下的唯一标识
            provider_user_id = user_info.get("openid") 
            # 微信通常不直接提供邮箱
            user_email = None 
            # 如果需要 UnionID (跨应用唯一)，需要在 UnionID 机制下获取
        elif provider == "feishu":
            # 飞书通常使用 union_id 或 open_id 作为用户唯一标识
            provider_user_id = user_info.get("data", {}).get("union_id") or user_info.get("data", {}).get("open_id")
            user_email = user_info.get("data", {}).get("email")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"不支持的 OAuth 提供商: {provider}")

        if not provider_user_id:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="未能从 OAuth 提供商获取用户唯一ID")

        # 检查是否已存在该 OAuth 账号
        oauth_account = await user_crud.get_oauth_account(db, provider, provider_user_id)

        user: Optional[User] = None
        if oauth_account:
            # 如果 OAuth 账号已存在，则表示该用户已经通过此 OAuth 登录过
            # 获取关联的用户信息
            user = await user_crud.get_by_id(db, oauth_account.user_id)
            if not user:
                # 理论上不应该发生，除非数据库出现不一致
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="关联用户未找到")
            logger.info(f"Existing OAuth account found for {provider}, user ID: {user.id}")
        else:
            # 如果 OAuth 账号不存在，则需要创建新用户或关联现有用户
            if user_email:
                # 尝试通过邮箱查找现有用户
                user = await user_crud.get_by_email(db, user_email)
                logger.info(f"Attempting to find user by email {user_email}: {'Found' if user else 'Not found'}")

            if not user:
                # 如果没有找到现有用户，则创建新用户 (仅限 OAuth 登录，无密码)
                user = await user_crud.create_oauth_only_user(db, email=user_email)
                logger.info(f"Created new user via OAuth, user ID: {user.id}, email: {user.email}")
            
            # 创建 OAuth 账号并关联到用户
            expires_in = oauth_data["token_data"].get("expires_in")
            expires_at_timestamp = None
            if expires_in is not None:
                expires_at_timestamp = int(datetime.now(timezone.utc).timestamp()) + expires_in

            await user_crud.create_oauth_account(
                db, 
                user.id, 
                provider, 
                provider_user_id,
                access_token=access_token_provider, # 存储从OAuth提供商获取的access_token
                expires_at=expires_at_timestamp
            )
            logger.info(f"Created new OAuth account for user {user.id} with provider {provider}, provider_user_id {provider_user_id}")

        # 检查用户是否活跃
        if not user.is_active:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户已被禁用")

        # 为用户生成应用内部的 JWT access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        app_access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        return {"access_token": app_access_token, "token_type": "bearer"}

    except HTTPException as e:
        logger.error(f"OAuth callback failed for {provider}: {e.detail}")
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error during OAuth callback for {provider}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OAuth 回调失败: {e}")


# app/main.py
# FastAPI 主应用文件。

from fastapi import FastAPI
from app.api import auth # 导入认证路由
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="用户系统 API",
    description="支持邮箱密码登录和多种 OAuth 登录 (GitHub, Google, WeChat, Feishu) 的用户系统",
    version="1.0.0",
)

# 包含认证路由
app.include_router(auth.router, prefix="/auth", tags=["认证"])

@app.get("/")
async def root():
    return {"message": "欢迎来到用户系统 API！"}

