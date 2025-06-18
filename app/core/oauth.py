# app/core/oauth.py
# 封装不同 OAuth 提供商的授权和信息获取逻辑。
# 注意：生产环境需要更严格的错误处理、状态管理 (CSRF) 和更复杂的提供商API细节。

from fastapi import HTTPException, status
from httpx import AsyncClient # 用于发送 HTTP 请求
from app.config import settings
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

