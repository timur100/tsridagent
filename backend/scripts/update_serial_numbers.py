"""
Update SN-PC and SN-SC serial numbers for Europcar locations from CSV
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from datetime import datetime, timezone
import csv

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

# Europcar tenant
TENANT_ID = "1d3653db-86cb-4dd1-9ef5-0236b116def8"

def update_serial_numbers():
    """Update serial numbers from CSV"""
    csv_file = 'serial_numbers.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    updated = 0
    not_found = 0
    skipped = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                location_code = row.get('LOCATIONCODE', '').strip()
                sn_pc = row.get('SN-PC', '').strip()
                sn_sc = row.get('SN-SC', '').strip()
                
                if not location_code:
                    skipped += 1
                    continue
                
                # Find location
                location = db.tenant_locations.find_one({
                    "tenant_id": TENANT_ID,
                    "location_code": location_code
                })
                
                if not location:
                    print(f"⚠️  Location not found: {location_code}")
                    not_found += 1
                    continue
                
                # Update serial numbers
                update_data = {
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if sn_pc:
                    update_data["sn_pc"] = sn_pc
                if sn_sc:
                    update_data["sn_sc"] = sn_sc
                
                db.tenant_locations.update_one(
                    {"tenant_id": TENANT_ID, "location_code": location_code},
                    {"$set": update_data}
                )
                
                print(f"✅ Updated: {location_code} - SN-PC: {sn_pc}, SN-SC: {sn_sc}")
                updated += 1
                
            except Exception as e:
                print(f"❌ Error processing row: {str(e)}")
                skipped += 1
    
    print(f"\n{'='*60}")
    print(f"Update Summary:")
    print(f"  ✅ Updated: {updated}")
    print(f"  ⚠️  Not Found: {not_found}")
    print(f"  ⏭️  Skipped: {skipped}")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("Starting Serial Numbers Update...")
    print(f"Target Tenant ID: {TENANT_ID}")
    print(f"Target Collection: portal_db.tenant_locations")
    print(f"CSV File: serial_numbers.csv")
    print(f"{'='*60}\n")
    
    # Confirm
    response = input("Continue with update? (yes/no): ")
    if response.lower() != 'yes':
        print("Update cancelled.")
        sys.exit(0)
    
    update_serial_numbers()
