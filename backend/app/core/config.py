"""
ForexAI Pro — Application Configuration
Uses Pydantic BaseSettings for environment-based config with validation.
"""
from functools import lru_cache
from typing import List, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ───────────────────────────────────────────────────────────────
    APP_NAME: str = "ForexAI Pro"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"          # development | production
    DEBUG: bool = True
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND_HEX_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Server ────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ─── Database ──────────────────────────────────────────────────────────
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "forexai"
    POSTGRES_PASSWORD: str = "forexai_secret"
    POSTGRES_DB: str = "forexai_pro"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """Sync URL for Alembic migrations."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ─── Redis ─────────────────────────────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # ─── Market Data Providers ─────────────────────────────────────────────
    ALPHA_VANTAGE_API_KEY: Optional[str] = None          # Free tier: 25 req/day
    ALPHA_VANTAGE_BASE_URL: str = "https://www.alphavantage.co/query"
    YFINANCE_ENABLED: bool = True
    OANDA_API_KEY: Optional[str] = None                  # Optional premium
    OANDA_ACCOUNT_ID: Optional[str] = None
    OANDA_ENV: str = "practice"                           # practice | live

    # ─── News ──────────────────────────────────────────────────────────────
    NEWSAPI_KEY: Optional[str] = None                    # Free: 100 req/day
    FOREX_FACTORY_RSS: str = "https://www.forexfactory.com/ff_cal_week.xml"

    # ─── Google OAuth ──────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ─── Email / Notifications ─────────────────────────────────────────────
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@forexai.pro"
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # ─── ML Pipeline ───────────────────────────────────────────────────────
    MODEL_ARTIFACTS_DIR: str = "./ml/artifacts"
    TRAINING_DATA_DIR: str = "./ml/data"
    MIN_BACKTEST_WINDOW_DAYS: int = 30
    MODEL_ACCURACY_IMPROVEMENT_THRESHOLD: float = 0.02   # 2% minimum improvement
    LIVE_ACCURACY_DROP_ROLLBACK_THRESHOLD: float = 0.10  # 10% drop → auto-rollback

    # ─── Celery ─────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ─── Vector DB ──────────────────────────────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "forexai_knowledge"

    # ─── Forex Pairs ────────────────────────────────────────────────────────
    DEFAULT_PAIRS: List[str] = [
        "EUR/USD", "GBP/USD", "USD/JPY",
        "GBP/JPY", "USD/CHF", "AUD/USD",
        "USD/CAD", "NZD/USD", "EUR/GBP",
    ]
    DEFAULT_TIMEFRAMES: List[str] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere."""
    return Settings()


settings = get_settings()
