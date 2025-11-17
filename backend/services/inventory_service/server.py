from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

# Import routes
from routes import items, categories, goods_receipt

# Get configuration from environment
SERVICE_PORT = int(os.environ.get('SERVICE_PORT', 8102))
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'Inventory Service')

# Create FastAPI app
app = FastAPI(
    title=SERVICE_NAME,
    description="Microservice for Inventory Management",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items.router, prefix="/api/inventory")
app.include_router(categories.router, prefix="/api/inventory")
app.include_router(goods_receipt.router, prefix="/api/inventory")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": SERVICE_NAME,
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": SERVICE_NAME
    }

if __name__ == "__main__":
    print(f"Starting {SERVICE_NAME} on port {SERVICE_PORT}...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=False
    )
