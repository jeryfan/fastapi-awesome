from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    配置类
    """
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "123456"
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "fastapi_db"
    MYSQL_CHARSET: str = "utf8mb4"

    class Config:
        env_file = ".env"