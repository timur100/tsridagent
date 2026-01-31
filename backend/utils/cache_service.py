"""
Simple In-Memory Cache Service for API Performance
Caches frequently accessed data with TTL (Time-To-Live)
"""
import time
from typing import Any, Optional, Callable
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
        self._default_ttl = 60  # Default 60 seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        if key not in self._cache:
            return None
        
        timestamp = self._timestamps.get(key, 0)
        ttl = self._cache.get(f"{key}_ttl", self._default_ttl)
        
        if time.time() - timestamp > ttl:
            # Expired - remove from cache
            self.delete(key)
            return None
        
        return self._cache.get(key)
    
    def set(self, key: str, value: Any, ttl: int = None) -> None:
        """Set cache value with optional TTL"""
        self._cache[key] = value
        self._timestamps[key] = time.time()
        if ttl:
            self._cache[f"{key}_ttl"] = ttl
    
    def delete(self, key: str) -> None:
        """Remove item from cache"""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
        self._cache.pop(f"{key}_ttl", None)
    
    def clear(self) -> None:
        """Clear entire cache"""
        self._cache.clear()
        self._timestamps.clear()
    
    def invalidate_prefix(self, prefix: str) -> None:
        """Invalidate all keys starting with prefix"""
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for key in keys_to_delete:
            self.delete(key)


# Global cache instance
cache = CacheService()


def cached(ttl: int = 60, key_prefix: str = ""):
    """
    Decorator for caching async function results
    
    Usage:
        @cached(ttl=30, key_prefix="inventory")
        async def get_inventory(tenant_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Check cache first
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # Execute function and cache result
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator


def invalidate_cache(prefix: str):
    """
    Decorator to invalidate cache after data modification
    
    Usage:
        @invalidate_cache("inventory")
        async def update_inventory_item(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            cache.invalidate_prefix(prefix)
            logger.debug(f"Cache invalidated: {prefix}*")
            return result
        return wrapper
    return decorator
