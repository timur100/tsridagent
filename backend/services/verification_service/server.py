from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add current service directory to Python path so utils and models can be imported
sys.path.insert(0, os.path.dirname(__file__))

from routes.id_scans import router as id_scans_router

app = FastAPI(title="Verification Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(id_scans_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "verification_service"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8105))
    print(f"Starting Verification Service on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
