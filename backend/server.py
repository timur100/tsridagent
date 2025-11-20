from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone
from routes.locations import router as locations_router
from routes.flagged_scans import router as flagged_scans_router
from routes.license_classes import router as license_classes_router
from routes.banned_documents import router as banned_documents_router
from routes.settings import router as settings_router
from routes.license import router as license_router
from routes.master_sync import router as master_sync_router
from routes.scanner import router as scanner_router
from routes.pdf_documents import router as pdf_documents_router
from routes.portal_auth import router as portal_auth_router
from routes.portal_devices import router as portal_devices_router
from routes.portal_locations import router as portal_locations_router
from routes.portal_settings import router as portal_settings_router
from routes.portal_users import router as portal_users_router
from routes.sync import router as sync_router
from routes.electron import router as electron_router
from routes.customer_data import router as customer_data_router
from routes.devices import router as devices_router
from routes.device_file_upload import router as device_file_upload_router
from routes.tenant_devices import router as tenant_devices_router
from routes.teamviewer_integration import router as teamviewer_router
from routes.regula_scanner import router as regula_scanner_router
from routes.scanner_settings import router as scanner_settings_router
# from routes.inventory import router as inventory_router  # Moved to Inventory Microservice
from routes.orders import router as orders_router
from routes.global_search import router as global_search_router
from routes.license_management import router as license_management_router
from routes.hardware_licenses import router as hardware_licenses_router
from routes.api_keys import router as api_keys_router
from routes.sla_settings import router as sla_settings_router
from routes.scan_stats import router as scan_stats_router
from routes.components import router as components_router
from routes.fulfillment import router as fulfillment_router
from routes.euroboxes import router as euroboxes_router
from routes.categories import router as categories_router
from routes.resources import router as resources_router
from routes.customers import router as customers_router
from routes.services_config import router as services_config_router
from routes.scanner_pin_settings import router as scanner_pin_router
from routes.service_proxy import router as service_proxy_router
from routes.service_mongodb_info import router as service_mongodb_info_router
from routes.mongodb_summary import router as mongodb_summary_router
from routes.tenants_proxy import router as tenants_proxy_router
from routes.roles_proxy import router as roles_proxy_router
from routes.users_proxy import router as users_proxy_router
from routes.documents import router as documents_router
from routes.tenant_locations import router as tenant_locations_router
from routes.websocket import router as websocket_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include location routes in api_router
api_router.include_router(locations_router)

# Include flagged scans routes in api_router
api_router.include_router(flagged_scans_router)

# Include license classes routes in api_router
api_router.include_router(license_classes_router)

# Include banned documents routes in api_router
api_router.include_router(banned_documents_router)

# Include settings routes in api_router
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])

# Include license routes in api_router
api_router.include_router(license_router, prefix="/license", tags=["license"])

# Include master sync routes in api_router
api_router.include_router(master_sync_router, prefix="/master-sync", tags=["master-sync"])

# Include scanner routes in api_router
api_router.include_router(scanner_router, prefix="/scanner", tags=["scanner"])

# Include PDF documents routes in api_router
api_router.include_router(pdf_documents_router)

# Include portal routes
app.include_router(portal_auth_router)
app.include_router(portal_devices_router)
app.include_router(portal_locations_router)
app.include_router(portal_settings_router)
app.include_router(portal_users_router)
app.include_router(sync_router)
app.include_router(customer_data_router)
app.include_router(devices_router)
app.include_router(device_file_upload_router)
app.include_router(tenant_devices_router)
app.include_router(teamviewer_router)
app.include_router(regula_scanner_router)
app.include_router(scanner_settings_router)
# app.include_router(inventory_router)  # Moved to Inventory Microservice - use service_proxy instead
app.include_router(orders_router)
app.include_router(global_search_router)

# Import and include backup router
from routes.backup import router as backup_router
app.include_router(backup_router)

# Import and include branding router
from routes.branding import router as branding_router
app.include_router(branding_router)

# Import and include tickets router
# from routes.tickets import router as tickets_router  # Moved to Ticketing Microservice
# app.include_router(tickets_router)  # Moved to Ticketing Microservice - use service_proxy instead

# Import and include catalog router
from routes.catalog import router as catalog_router
app.include_router(catalog_router)

# License management router
app.include_router(license_management_router)

# Hardware licenses router
app.include_router(hardware_licenses_router)
app.include_router(api_keys_router)
app.include_router(sla_settings_router)
app.include_router(scan_stats_router)

# Components router
app.include_router(components_router)

# Fulfillment router
app.include_router(fulfillment_router)

# Euroboxes router
app.include_router(euroboxes_router)

# Categories
app.include_router(categories_router)

# Resources (Dropbox)
api_router.include_router(resources_router, prefix="/resources", tags=["resources"])

# Customers (Multi-Tenancy)
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])

# Services Configuration (Microservices Management)
app.include_router(services_config_router)

# Scanner PIN Settings
app.include_router(scanner_pin_router)

# Service Proxy (for accessing microservices externally)
app.include_router(service_proxy_router)

# Service MongoDB Info
app.include_router(service_mongodb_info_router)

# MongoDB Summary (separate router)
app.include_router(mongodb_summary_router)

# Tenants Proxy (proxy to Auth & Identity Service)
app.include_router(tenants_proxy_router)

# Roles Proxy (proxy to Auth & Identity Service)
app.include_router(roles_proxy_router)

# Users Proxy (proxy to Auth & Identity Service)
app.include_router(users_proxy_router)

# Documents (PDF uploads, contracts, etc.)
app.include_router(documents_router)

# Tenant Locations
app.include_router(tenant_locations_router)

# Include electron routes
app.include_router(electron_router)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    """
    Start background tasks on server startup
    """
    logger.info("Starting server...")
    
    # Start TeamViewer Auto-Sync (every 30 seconds)
    try:
        from teamviewer_auto_sync import auto_sync_service
        await auto_sync_service.start()
        logger.info("✅ TeamViewer Auto-Sync started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start TeamViewer Auto-Sync: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    """
    Cleanup on server shutdown
    """
    # Stop auto-sync
    try:
        from teamviewer_auto_sync import auto_sync_service
        await auto_sync_service.stop()
        logger.info("✅ TeamViewer Auto-Sync stopped")
    except Exception as e:
        logger.error(f"❌ Failed to stop TeamViewer Auto-Sync: {e}")
    
    # Close MongoDB client
    client.close()
    logger.info("Server shutdown complete")