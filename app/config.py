from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    配置类
    """

    MYSQL_USER: str = "fastapi"
    MYSQL_PASSWORD: str = "fastapi"
    MYSQL_HOST: str = "mysql"
    MYSQL_PORT: int = 3306
    MYSQL_DATABASE: str = "fastapi"
    MYSQL_CHARSET: str = "utf8mb4"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 3600
    SECRET_KEY: str = "sSIf8zhJFU68jo_-s73KzxWo3CHEr4vHSJdSjxb2Sio"
    ALGORITHM: str = "HS256"

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""

    FEISHU_APP_ID: str = ""
    FEISHU_APP_SECRET: str = ""

    PGUSER: str = "fastapi"
    POSTGRES_PASSWORD: str = "fastapi"
    POSTGRES_DB: str = "fastapi"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    CELERY_BROKER_DB: int = 5
    CELERY_RESULT_DB: int = 6
    CELERY_BROKER_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/{CELERY_BROKER_DB}"
    CELERY_RESULT_BACKEND: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/{CELERY_RESULT_DB}"

    class Config:
        env_file = ".env"


settings = Settings()
