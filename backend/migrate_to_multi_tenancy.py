#!/usr/bin/env python3
"""
SAFE Multi-Tenancy Migration Script

This script:
1. Creates BACKUP of all collections
2. Creates 'customers' collection
3. Creates default customer "Europcar"
4. Adds customer_id to all relevant collections
5. Does NOT delete anything

Run with: python migrate_to_multi_tenancy.py
"""
import os
from pymongo import MongoClient
from datetime import datetime
import uuid
import json

# Connect to MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(mongo_url)
db = client['test_database']

# Collections that need customer_id
TENANT_COLLECTIONS = [
    'europcar_stations',  # Will be renamed to 'locations' eventually
    'tickets',
    'devices',
    'orders',
    'components',
    'eurobox',
    'employees',
    'software_licenses'
]

def create_backup():
    """Create backup of all collections"""
    print("\n📦 Step 1: Creating backups...")
    backup_suffix = f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    for collection_name in TENANT_COLLECTIONS:
        if collection_name in db.list_collection_names():
            backup_name = f"{collection_name}{backup_suffix}"
            print(f"  Backing up {collection_name} → {backup_name}")
            
            # Copy all documents
            docs = list(db[collection_name].find({}))
            if docs:
                db[backup_name].insert_many(docs)
                print(f"    ✅ Backed up {len(docs)} documents")
            else:
                print(f"    ⚠️  Collection empty, skipped")
    
    print("  ✅ All backups created!")

def create_customers_collection():
    """Create customers collection"""
    print("\n🏢 Step 2: Creating customers collection...")
    
    if 'customers' in db.list_collection_names():
        print("  ⚠️  'customers' collection already exists, skipping")
        return
    
    # Create collection
    db.create_collection('customers')
    print("  ✅ Created 'customers' collection")

def create_default_customer():
    """Create default Europcar customer"""
    print("\n👤 Step 3: Creating default customer...")
    
    # Check if default customer exists
    existing = db.customers.find_one({"name": "Europcar"})
    if existing:
        print(f"  ⚠️  Customer 'Europcar' already exists with ID: {existing['id']}")
        return existing['id']
    
    # Create default customer
    customer_id = str(uuid.uuid4())
    customer = {
        "id": customer_id,
        "name": "Europcar",
        "domain": "europcar.de",
        "logo_url": None,
        "settings": {
            "branding": {},
            "features_enabled": ["tickets", "catalog", "devices", "kiosk", "wallboard"],
            "portal_settings": {}
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": None,
        "active": True
    }
    
    db.customers.insert_one(customer)
    print(f"  ✅ Created customer 'Europcar' with ID: {customer_id}")
    
    return customer_id

def add_customer_id_to_collections(customer_id: str):
    """Add customer_id to all tenant collections"""
    print(f"\n🔑 Step 4: Adding customer_id to collections...")
    print(f"    Using customer_id: {customer_id}")
    
    for collection_name in TENANT_COLLECTIONS:
        if collection_name not in db.list_collection_names():
            print(f"  ⚠️  Collection '{collection_name}' does not exist, skipping")
            continue
        
        # Count documents without customer_id
        count = db[collection_name].count_documents({"customer_id": {"$exists": False}})
        
        if count == 0:
            print(f"  ✅ {collection_name}: Already has customer_id on all documents")
            continue
        
        print(f"  Updating {collection_name}: {count} documents...")
        
        # Add customer_id to all documents that don't have it
        result = db[collection_name].update_many(
            {"customer_id": {"$exists": False}},
            {"$set": {"customer_id": customer_id}}
        )
        
        print(f"    ✅ Updated {result.modified_count} documents")
    
    print("  ✅ All collections updated!")

def create_indexes():
    """Create indexes on customer_id fields"""
    print("\n📊 Step 5: Creating indexes...")
    
    for collection_name in TENANT_COLLECTIONS:
        if collection_name not in db.list_collection_names():
            continue
        
        print(f"  Creating index on {collection_name}.customer_id...")
        db[collection_name].create_index("customer_id")
    
    print("  ✅ All indexes created!")

def verify_migration():
    """Verify migration was successful"""
    print("\n✅ Step 6: Verifying migration...")
    
    # Check customers collection
    customer_count = db.customers.count_documents({})
    print(f"  Customers: {customer_count}")
    
    # Check each collection
    for collection_name in TENANT_COLLECTIONS:
        if collection_name not in db.list_collection_names():
            continue
        
        total = db[collection_name].count_documents({})
        with_customer_id = db[collection_name].count_documents({"customer_id": {"$exists": True}})
        
        if total == with_customer_id:
            print(f"  ✅ {collection_name}: {with_customer_id}/{total} with customer_id")
        else:
            print(f"  ⚠️  {collection_name}: {with_customer_id}/{total} with customer_id (INCOMPLETE!)")

def main():
    """Main migration function"""
    print("=" * 60)
    print("MULTI-TENANCY MIGRATION")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Create backups of all collections")
    print("2. Create 'customers' collection")
    print("3. Create default customer 'Europcar'")
    print("4. Add customer_id to all tenant collections")
    print("5. Create indexes")
    print("6. Verify migration")
    print("\n⚠️  IMPORTANT: This does NOT delete any data!")
    print("=" * 60)
    
    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Migration cancelled")
        return
    
    try:
        # Run migration steps
        create_backup()
        create_customers_collection()
        customer_id = create_default_customer()
        add_customer_id_to_collections(customer_id)
        create_indexes()
        verify_migration()
        
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\nDefault Customer ID: {customer_id}")
        print("Default Customer Name: Europcar")
        print("\nNext steps:")
        print("1. Enable multi-tenancy: Set MULTI_TENANCY_ENABLED=true in .env")
        print("2. Test all features")
        print("3. Update JWT tokens to include customer_id")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        print("\n⚠️  Check backups and fix the issue before retrying")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
