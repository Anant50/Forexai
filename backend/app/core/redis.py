"""
ForexAI Pro — Redis Client
Async Redis connection using redis-py 5.x.
Used for: caching, pub/sub (WebSocket), rate limiting, session storage, Celery broker.
"""
import json
from typing import Any, Optional
import redis.asyncio as aioredis
from redis.asyncio import ConnectionPool

from app.core.config import settings


# ─── Connection Pool ──────────────────────────────────────────────────────────
_pool: Optional[ConnectionPool] = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=50,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            retry_on_timeout=True,
            health_check_interval=30,
        )
    return _pool


def get_redis() -> aioredis.Redis:
    """Get an async Redis client from the shared pool."""
    return aioredis.Redis(connection_pool=get_pool())


# ─── Cache Helpers ────────────────────────────────────────────────────────────
class RedisCache:
    """High-level caching helpers wrapping raw Redis commands."""

    def __init__(self):
        self.client = get_redis()

    # ── Price / Indicator Cache ────────────────────────────────────────────
    async def set_json(self, key: str, value: Any, ttl: int = 60) -> None:
        """Serialize `value` to JSON and cache with TTL (seconds)."""
        await self.client.setex(key, ttl, json.dumps(value, default=str))

    async def get_json(self, key: str) -> Optional[Any]:
        """Retrieve and deserialize a cached JSON value."""
        raw = await self.client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern. Returns count deleted."""
        keys = await self.client.keys(pattern)
        if keys:
            return await self.client.delete(*keys)
        return 0

    # ── Rate Limiting ──────────────────────────────────────────────────────
    async def check_rate_limit(
        self, identifier: str, limit: int, window_seconds: int
    ) -> tuple[bool, int]:
        """
        Sliding window rate limiter.
        Returns (is_allowed: bool, remaining: int).
        """
        key = f"rate:{identifier}"
        pipe = self.client.pipeline(transaction=True)
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        results = await pipe.execute()
        count = results[0]
        remaining = max(0, limit - count)
        return count <= limit, remaining

    # ── Pub/Sub (WebSocket feeds) ─────────────────────────────────────────
    async def publish(self, channel: str, message: Any) -> None:
        """Publish a JSON-serialized message to a Redis channel."""
        await self.client.publish(channel, json.dumps(message, default=str))

    def pubsub(self) -> aioredis.client.PubSub:
        """Return a PubSub object for subscribing to channels."""
        return self.client.pubsub()

    # ── Session / Token Blacklist ─────────────────────────────────────────
    async def blacklist_token(self, jti: str, expire_seconds: int) -> None:
        """Add a JWT ID to the blacklist (for logout/revocation)."""
        await self.client.setex(f"blacklist:{jti}", expire_seconds, "1")

    async def is_token_blacklisted(self, jti: str) -> bool:
        return bool(await self.client.exists(f"blacklist:{jti}"))


# ─── Singleton ────────────────────────────────────────────────────────────────
cache = RedisCache()


async def close_redis() -> None:
    """Close all Redis connections on app shutdown."""
    global _pool
    if _pool:
        await _pool.disconnect()
        _pool = None
