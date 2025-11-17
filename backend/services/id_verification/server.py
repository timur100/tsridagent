from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routes
from routes import (
    scans_router,
    sync_router,
    verification_router,
    banned_router
)
from utils.db import close_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ID Verification Service",
    description="Microservice for document verification and scanning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": "id-verification",
        "status": "healthy",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ID Verification Service",
        "version": "1.0.0",
        "endpoints": {
            "scans": "/api/verification/scans",
            "sync": "/api/verification/sync",
            "verification": "/api/verification/verification",
            "banned_documents": "/api/verification/banned-documents"
        }
    }

# Include routers with /api/verification prefix
app.include_router(scans_router, prefix="/api/verification")
app.include_router(sync_router, prefix="/api/verification")
app.include_router(verification_router, prefix="/api/verification")
app.include_router(banned_router, prefix="/api/verification")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Server startup"""
    logger.info("🚀 ID Verification Service starting...")
    logger.info(f"📊 Database: {os.environ.get('DB_NAME', 'verification_db')}")
    logger.info(f"🌐 CORS Origins: {os.environ.get('CORS_ORIGINS', '*')}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Server shutdown"""
    logger.info("🛑 ID Verification Service shutting down...")
    await close_database()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
