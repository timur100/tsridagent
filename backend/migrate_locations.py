#!/usr/bin/env python3
"""
Location Data Migration Script
Fetches location data from Google Apps Script endpoint and populates MongoDB
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import requests
from typing import List, Dict, Any

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDY769qmJbvHWLqpJw_6MrC5arq89PglY54T2DRIhvl55-Dv047UftcrF7oW5ia22UGQ/exec"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Sample location codes to try fetching (from the PowerShell script context)
SAMPLE_LOCATION_CODES = [
    "BERN01", "MUC01", "FRA01", "HAM01", "CGN01", "DUS01", "STR01",
    "BERX01", "MUCO2", "FRAO2"
]


def fetch_location_from_google(location_code: str) -> Dict[str, Any] | None:
    """Fetch a single location from Google Apps Script"""
    try:
        response = requests.get(
            GOOGLE_SCRIPT_URL,
            params={"LOCATIONCODE": location_code},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]  # Return first result
        return None
    except Exception as e:
        print(f"Error fetching {location_code}: {e}")
        return None


def parse_location_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse and structure location data for MongoDB"""
    # This structure should match what the Google Sheet returns
    # Adjust field names based on actual data structure
    return {
        "locationCode": raw_data.get("locationCode", ""),
        "deviceNumber": raw_data.get("deviceNumber", ""),
        "locationName": raw_data.get("locationName", ""),
        "street": raw_data.get("street", ""),
        "zip": raw_data.get("zip", ""),
        "city": raw_data.get("city", ""),
        "state": raw_data.get("state", ""),
        "country": raw_data.get("country", ""),
        "continent": raw_data.get("continent", ""),
        "phone": raw_data.get("phone", ""),
        "email": raw_data.get("email", ""),
        "tvid": raw_data.get("tvid", ""),
        "snStation": raw_data.get("snStation", ""),
        "snScanner": raw_data.get("snScanner", "")
    }


async def seed_sample_locations(db):
    """Seed database with sample locations"""
    locations_collection = db['locations']
    
    # Check if already seeded
    count = await locations_collection.count_documents({})
    if count > 0:
        print(f"⚠️  Database already contains {count} locations")
        response = input("Do you want to clear and re-seed? (y/N): ")
        if response.lower() != 'y':
            print("Migration cancelled")
            return
        
        # Clear existing data
        await locations_collection.delete_many({})
        print("✓ Cleared existing locations")
    
    sample_locations = [
        {
            "locationCode": "BERN01",
            "deviceNumber": "01",
            "locationName": "Berlin North Reinickendorf -IKC-",
            "street": "Kapweg 4",
            "zip": "13405",
            "city": "Berlin",
            "state": "Berlin",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (30) 4548920",
            "email": "destBERN01@europcar.com",
            "tvid": "528168516",
            "snStation": "047926771453",
            "snScanner": "201734 00732"
        },
        {
            "locationCode": "MUC01",
            "deviceNumber": "01",
            "locationName": "Munich Airport Terminal 2",
            "street": "Flughafen München",
            "zip": "85356",
            "city": "München",
            "state": "Bayern",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (89) 97592500",
            "email": "destMUC01@europcar.com",
            "tvid": "528168517",
            "snStation": "047926771454",
            "snScanner": "201734 00733"
        },
        {
            "locationCode": "FRA01",
            "deviceNumber": "01",
            "locationName": "Frankfurt Airport Terminal 1",
            "street": "Hugo-Eckener-Ring",
            "zip": "60549",
            "city": "Frankfurt am Main",
            "state": "Hessen",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (69) 69007800",
            "email": "destFRA01@europcar.com",
            "tvid": "528168518",
            "snStation": "047926771455",
            "snScanner": "201734 00734"
        },
        {
            "locationCode": "HAM01",
            "deviceNumber": "01",
            "locationName": "Hamburg Airport",
            "street": "Flughafenstraße 1-3",
            "zip": "22335",
            "city": "Hamburg",
            "state": "Hamburg",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (40) 50750770",
            "email": "destHAM01@europcar.com",
            "tvid": "528168519",
            "snStation": "047926771456",
            "snScanner": "201734 00735"
        },
        {
            "locationCode": "CGN01",
            "deviceNumber": "01",
            "locationName": "Cologne Bonn Airport",
            "street": "Kennedystraße",
            "zip": "51147",
            "city": "Köln",
            "state": "Nordrhein-Westfalen",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (221) 94034920",
            "email": "destCGN01@europcar.com",
            "tvid": "528168520",
            "snStation": "047926771457",
            "snScanner": "201734 00736"
        },
        {
            "locationCode": "DUS01",
            "deviceNumber": "01",
            "locationName": "Düsseldorf Airport",
            "street": "Flughafenstraße 120",
            "zip": "40474",
            "city": "Düsseldorf",
            "state": "Nordrhein-Westfalen",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (211) 42170800",
            "email": "destDUS01@europcar.com",
            "tvid": "528168521",
            "snStation": "047926771458",
            "snScanner": "201734 00737"
        },
        {
            "locationCode": "STR01",
            "deviceNumber": "01",
            "locationName": "Stuttgart Airport",
            "street": "Flughafenstraße 32",
            "zip": "70629",
            "city": "Stuttgart",
            "state": "Baden-Württemberg",
            "country": "Germany",
            "continent": "Europe",
            "phone": "+49 (711) 94859400",
            "email": "destSTR01@europcar.com",
            "tvid": "528168522",
            "snStation": "047926771459",
            "snScanner": "201734 00738"
        }
    ]
    
    result = await locations_collection.insert_many(sample_locations)
    print(f"✓ Successfully seeded {len(result.inserted_ids)} locations")
    return len(result.inserted_ids)


async def migrate_from_google_sheet(db):
    """Attempt to fetch real data from Google Apps Script"""
    locations_collection = db['locations']
    
    print("Attempting to fetch locations from Google Apps Script...")
    fetched_count = 0
    failed_codes = []
    
    for location_code in SAMPLE_LOCATION_CODES:
        print(f"  Fetching {location_code}...", end=" ")
        data = fetch_location_from_google(location_code)
        
        if data:
            parsed = parse_location_data(data)
            await locations_collection.update_one(
                {"locationCode": location_code},
                {"$set": parsed},
                upsert=True
            )
            fetched_count += 1
            print("✓")
        else:
            failed_codes.append(location_code)
            print("✗")
    
    print(f"\nFetched {fetched_count} locations from Google Apps Script")
    if failed_codes:
        print(f"Failed to fetch: {', '.join(failed_codes)}")
    
    return fetched_count


async def main():
    """Main migration function"""
    print("=" * 60)
    print("TSRID Location Data Migration")
    print("=" * 60)
    print(f"MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    print(f"Google Script: {GOOGLE_SCRIPT_URL}")
    print("=" * 60)
    print()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Test connection
        await client.server_info()
        print("✓ Connected to MongoDB\n")
        
        # Choose migration method
        print("Migration Options:")
        print("1. Seed with sample German locations (7 locations)")
        print("2. Attempt to fetch from Google Apps Script")
        print("3. Both (sample + Google fetch)")
        print()
        
        choice = input("Select option (1/2/3): ").strip()
        
        if choice == "1":
            await seed_sample_locations(db)
        elif choice == "2":
            count = await migrate_from_google_sheet(db)
            if count == 0:
                print("\n⚠️  No data fetched. Consider using sample data instead.")
        elif choice == "3":
            await seed_sample_locations(db)
            print()
            await migrate_from_google_sheet(db)
        else:
            print("Invalid choice. Exiting.")
            return
        
        # Show final count
        total_count = await db['locations'].count_documents({})
        print(f"\n✓ Migration complete! Total locations in database: {total_count}")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
