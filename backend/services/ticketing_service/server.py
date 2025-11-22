from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routes
from routes import tickets, comments, workflow, location_details, sla, staff
from routes import change_requests, knowledge_base, chat_messages, ticket_templates

# Get configuration from environment
SERVICE_PORT = int(os.environ.get('SERVICE_PORT', 8103))
SERVICE_NAME = os.environ.get('SERVICE_NAME', 'Ticketing Service')

# Create FastAPI app
# redirect_slashes=False prevents FastAPI from auto-redirecting HTTP when adding trailing slashes
app = FastAPI(
    title=SERVICE_NAME,
    description="Microservice for Ticket Management",
    version="1.0.0",
    redirect_slashes=False
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
app.include_router(tickets.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
app.include_router(location_details.router, prefix="/api")
app.include_router(sla.router, prefix="/api")
app.include_router(staff.router, prefix="/api")

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
