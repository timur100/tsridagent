"""
Import Europcar Locations from CSV into MongoDB
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from datetime import datetime, timezone
import uuid
import csv

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

# Get tenant_id - Europcar tenant
TENANT_ID = "1d3653db-86cb-4dd1-9ef5-0236b116def8"

def parse_location_row(row):
    """Parse a CSV row into location dict"""
    try:
        # CSV columns: STATUS,Main Code,PLZ,ORT,STR,Telefon,Telefon Intern,E Mail,Main Typ,Stationsname,Manager,Bundesland,ID Checker,Switch,Port,IT Kommentar,TSR REMARKS,SN-PC,SN-SC,TV-ID
        
        location_code = row.get('Main Code', '').strip()
        if not location_code:
            return None
        
        # Parse ID Checker as integer
        id_checker_str = row.get('ID Checker', '').strip()
        id_checker = None
        if id_checker_str and id_checker_str.isdigit():
            id_checker = int(id_checker_str)
        
        return {
            "location_id": str(uuid.uuid4()),
            "tenant_id": TENANT_ID,
            "location_code": location_code,
            "postal_code": row.get('PLZ', '').strip(),
            "city": row.get('ORT', '').strip(),
            "street": row.get('STR', '').strip(),
            "phone": row.get('Telefon', '').strip(),
            "phone_internal": row.get('Telefon Intern', '').strip(),
            "email": row.get('E Mail', '').strip(),
            "main_type": row.get('Main Typ', '').strip(),
            "station_name": row.get('Stationsname', '').strip(),
            "manager": row.get('Manager', '').strip(),
            "state": row.get('Bundesland', '').strip(),
            "id_checker": id_checker,
            "switch_info": row.get('Switch', '').strip(),
            "port": row.get('Port', '').strip(),
            "it_comment": row.get('IT Kommentar', '').strip(),
            "tsr_remarks": row.get('TSR REMARKS', '').strip(),
            "sn_pc": row.get('SN-PC', '').strip(),
            "sn_sc": row.get('SN-SC', '').strip(),
            "tv_id": row.get('TV-ID', '').strip(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "csv_import"
        }
    except Exception as e:
        print(f"Error parsing row: {str(e)}")
        return None

def import_locations():
    """Import all locations from CSV"""
    csv_file = 'locations.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    imported = 0
    skipped = 0
    errors = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                location = parse_location_row(row)
                if not location:
                    skipped += 1
                    continue
                
                # Check if already exists
                existing = db.tenant_locations.find_one({
                    "tenant_id": TENANT_ID,
                    "location_code": location["location_code"]
                })
                
                if existing:
                    print(f"⚠️  Location {location['location_code']} already exists, updating...")
                    # Update instead of skip
                    db.tenant_locations.update_one(
                        {"tenant_id": TENANT_ID, "location_code": location["location_code"]},
                        {"$set": location}
                    )
                    skipped += 1
                    continue
                
                # Insert
                db.tenant_locations.insert_one(location)
                print(f"✅ Imported: {location['location_code']} - {location['station_name']}")
                imported += 1
                
            except Exception as e:
                print(f"❌ Error processing row: {str(e)}")
                errors += 1
    
    print(f"\n{'='*60}")
    print(f"Import Summary:")
    print(f"  ✅ Imported: {imported}")
    print(f"  ⚠️  Updated/Skipped: {skipped}")
    print(f"  ❌ Errors: {errors}")
    print(f"  📊 Total in DB: {db.tenant_locations.count_documents({'tenant_id': TENANT_ID})}")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("Starting Europcar Locations CSV Import...")
    print(f"Target Tenant ID: {TENANT_ID}")
    print(f"Target Collection: portal_db.tenant_locations")
    print(f"CSV File: locations.csv")
    print(f"{'='*60}\n")
    
    # Confirm
    response = input("Continue with import? (yes/no): ")
    if response.lower() != 'yes':
        print("Import cancelled.")
        sys.exit(0)
    
    import_locations()
