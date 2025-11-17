"""
Import Europcar station data from URL into MongoDB
"""
import asyncio
import csv
import urllib.request
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['test_database']

# CSV URL from assets
CSV_URL = "https://customer-assets.emergentagent.com/job_id-verify-system-2/artifacts/b2an22tz_Standorte%20mit%20ID%20Checker%20-%20Stationsdatenbank_Physische_Sta%20%281%29.csv"

async def import_data():
    """Import Europcar station data into MongoDB"""
    
    try:
        # Download CSV from URL
        print(f"📥 Downloading CSV from {CSV_URL}...")
        response = urllib.request.urlopen(CSV_URL)
        csv_content = response.read().decode('utf-8')
        
        # Parse CSV data
        csv_reader = csv.DictReader(csv_content.strip().split('\n'))
        stations = []
        
        for row in csv_reader:
            # Parse ID Checker count
            id_checker_count = 0
            try:
                id_checker_str = row.get('ID Checker', '0').strip()
                if id_checker_str and id_checker_str.isdigit():
                    id_checker_count = int(id_checker_str)
            except (ValueError, AttributeError):
                id_checker_count = 0
            
            # Determine online status
            online_str = row.get('Online', '').strip().lower()
            is_online = online_str == 'ja' or online_str == 'yes'
            
            station = {
                'status': row.get('STATUS', '').strip(),
                'main_code': row.get('Main Code', '').strip(),
                'plz': row.get('PLZ', '').strip(),
                'ort': row.get('ORT', '').strip(),
                'str': row.get('STR', '').strip(),
                'telefon': row.get('Telefon', '').strip(),
                'telefon_intern': row.get('Telefon Intern', '').strip(),
                'email': row.get('E Mail', '').strip(),
                'main_typ': row.get('Main Typ', '').strip(),
                'stationsname': row.get('Stationsname', '').strip(),
                'mgr': row.get('Mgr', '').strip(),
                'bundesl': row.get('Bundesl', '').strip(),
                'lc_alt': row.get('6LC alt', '').strip(),
                'id_checker': id_checker_count,
                'online': is_online,
                'switch': row.get('Switch', '').strip(),
                'port': row.get('Port', '').strip(),
                'richtiges_vlan': row.get('richtiges VLAN', '').strip(),
                'it_kommentar': row.get('IT Kommentar', '').strip(),
                'tsr_remarks': row.get('TSR REMARKS', '').strip(),
                'sn_pc': row.get('SN-PC', '').strip(),
                'sn_sc': row.get('SN-SC', '').strip(),
                'pp': row.get('PP', '').strip(),
                'sw': row.get('SW', '').strip(),
                'fw': row.get('FW', '').strip(),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            stations.append(station)
        
        # Clear existing data
        await db.europcar_stations.delete_many({})
        
        # Insert new data
        if stations:
            result = await db.europcar_stations.insert_many(stations)
            print(f"✅ Imported {len(result.inserted_ids)} Europcar stations into MongoDB")
            
            # Print summary
            total = len(stations)
            ready_count = sum(1 for s in stations if 'READY' in s['status'].upper())
            online_count = sum(1 for s in stations if s['online'])
            offline_count = total - online_count
            
            print("\n📊 Summary:")
            print(f"   Total Stations: {total}")
            print(f"   Ready: {ready_count}")
            print(f"   Online: {online_count}")
            print(f"   Offline: {offline_count}")
        else:
            print("❌ No stations found to import")
    
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(import_data())
