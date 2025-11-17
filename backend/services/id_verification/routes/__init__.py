from .scans import router as scans_router
from .sync import router as sync_router
from .verification import router as verification_router
from .banned_documents import router as banned_router

__all__ = [
    'scans_router',
    'sync_router',
    'verification_router',
    'banned_router'
]
