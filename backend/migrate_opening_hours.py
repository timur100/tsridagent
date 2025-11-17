#!/usr/bin/env python3
"""
Migration script to add opening hours to all europcar_stations
"""
from pymongo import MongoClient
import os

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(mongo_url)
db = client['test_database']

# Standard opening hours (Mon-Fri: 08:00-18:00, Sat: 09:00-13:00, Sun: Closed)
standard_opening_hours = {
    "monday": {"open": "08:00", "close": "18:00", "closed": False},
    "tuesday": {"open": "08:00", "close": "18:00", "closed": False},
    "wednesday": {"open": "08:00", "close": "18:00", "closed": False},
    "thursday": {"open": "08:00", "close": "18:00", "closed": False},
    "friday": {"open": "08:00", "close": "18:00", "closed": False},
    "saturday": {"open": "09:00", "close": "13:00", "closed": False},
    "sunday": {"open": "", "close": "", "closed": True}
}

def migrate_opening_hours():
    """Add opening hours to all stations"""
    # Count total stations
    total = db.europcar_stations.count_documents({})
    print(f"Found {total} stations")
    
    # Update all stations with opening hours
    result = db.europcar_stations.update_many(
        {},  # Empty filter = all documents
        {"$set": {"opening_hours": standard_opening_hours}}
    )
    
    print(f"Updated {result.modified_count} stations with opening hours")
    
    # Verify BERN03
    bern03 = db.europcar_stations.find_one({"main_code": "BERN03"})
    if bern03:
        print(f"\nVerification - BERN03 opening hours:")
        print(bern03.get("opening_hours"))

if __name__ == "__main__":
    migrate_opening_hours()
