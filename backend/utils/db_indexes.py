"""
Database Index Setup for Performance Optimization
Creates indexes on frequently queried fields
"""
import logging

logger = logging.getLogger(__name__)

async def create_indexes(db, portal_db, multi_tenant_db):
    """Create MongoDB indexes for optimal query performance"""
    
    try:
        # ==================== Portal DB Indexes ====================
        
        # Tenant Locations - frequently filtered by tenant_id, city, status
        await portal_db.tenant_locations.create_index("tenant_id")
        await portal_db.tenant_locations.create_index("city")
        await portal_db.tenant_locations.create_index("status")
        await portal_db.tenant_locations.create_index("location_code")
        await portal_db.tenant_locations.create_index([("tenant_id", 1), ("city", 1)])
        
        # Portal Users
        await portal_db.portal_users.create_index("email", unique=True)
        await portal_db.portal_users.create_index("tenant_ids")
        await portal_db.portal_users.create_index("is_active")
        
        # Device Kits
        await portal_db.device_kits.create_index("tenant_id")
        await portal_db.device_kits.create_index("status")
        await portal_db.device_kits.create_index("kit_name")
        await portal_db.device_kits.create_index("assigned_location")
        
        # ==================== Main DB Indexes ====================
        
        # Activation Codes
        await db.activation_codes.create_index("code", unique=True)
        await db.activation_codes.create_index("status")
        await db.activation_codes.create_index("tenant_id")
        await db.activation_codes.create_index("created_at")
        await db.activation_codes.create_index([("tenant_id", 1), ("status", 1)])
        
        # Support Tickets
        await db.support_tickets.create_index("ticket_number")
        await db.support_tickets.create_index("status")
        await db.support_tickets.create_index("priority")
        await db.support_tickets.create_index("tenant_id")
        await db.support_tickets.create_index("created_at")
        await db.support_tickets.create_index([("tenant_id", 1), ("status", 1)])
        
        # Inventory
        await db.inventory.create_index("tenant_id")
        await db.inventory.create_index("category")
        await db.inventory.create_index("barcode")
        await db.inventory.create_index("name")
        await db.inventory.create_index([("tenant_id", 1), ("category", 1)])
        
        # Orders
        await db.orders.create_index("tenant_id")
        await db.orders.create_index("status")
        await db.orders.create_index("order_date")
        await db.orders.create_index("customer_id")
        await db.orders.create_index([("tenant_id", 1), ("status", 1)])
        
        # Licenses
        await db.licenses.create_index("license_key", unique=True)
        await db.licenses.create_index("customer_email")
        await db.licenses.create_index("status")
        await db.licenses.create_index("end_date")
        
        # ID Scans
        await db.id_scans.create_index("device_id")
        await db.id_scans.create_index("scanned_at")
        await db.id_scans.create_index("tenant_id")
        await db.id_scans.create_index([("device_id", 1), ("scanned_at", -1)])
        
        # Agent Devices
        await db.agent_devices.create_index("device_id", unique=True)
        await db.agent_devices.create_index("status")
        await db.agent_devices.create_index("last_seen")
        
        # ==================== Multi-Tenant DB Indexes ====================
        
        # Europcar Devices
        await multi_tenant_db.europcar_devices.create_index("device_id")
        await multi_tenant_db.europcar_devices.create_index("location_code")
        await multi_tenant_db.europcar_devices.create_index("status")
        
        # Assets
        await multi_tenant_db.assets.create_index("tenant_id")
        await multi_tenant_db.assets.create_index("asset_id")
        await multi_tenant_db.assets.create_index("category_id")
        await multi_tenant_db.assets.create_index("status")
        await multi_tenant_db.assets.create_index([("tenant_id", 1), ("category_id", 1)])
        
        # ==================== Portal DB - TSRID Assets ====================
        # WICHTIG: partialFilterExpression erlaubt null-Werte für nicht zugewiesene Geräte
        try:
            # Drop old indexes if they exist
            existing_indexes = await portal_db.tsrid_assets.index_information()
            for idx_name in list(existing_indexes.keys()):
                if idx_name != "_id_":
                    try:
                        await portal_db.tsrid_assets.drop_index(idx_name)
                    except:
                        pass
        except:
            pass
        
        # Create partial indexes for assets (allows null values for unassigned devices)
        await portal_db.tsrid_assets.create_index(
            "asset_id", 
            unique=True, 
            partialFilterExpression={"asset_id": {"$type": "string"}}
        )
        await portal_db.tsrid_assets.create_index(
            "manufacturer_sn", 
            unique=True,
            partialFilterExpression={"manufacturer_sn": {"$type": "string"}}
        )
        await portal_db.tsrid_assets.create_index("status")
        await portal_db.tsrid_assets.create_index("type")
        await portal_db.tsrid_assets.create_index("location_id", sparse=True)
        await portal_db.tsrid_assets.create_index("assigned_to_kit", sparse=True)
        
        # TSRID Locations
        await portal_db.tsrid_locations.create_index("location_id", unique=True)
        await portal_db.tsrid_locations.create_index("country")
        await portal_db.tsrid_locations.create_index("status")
        
        # TSRID Kit Templates
        await portal_db.tsrid_kit_templates.create_index("template_id", unique=True)
        
        logger.info("✅ Database indexes created successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating indexes: {e}")
        return False
