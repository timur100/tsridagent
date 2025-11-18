"""
Script to update existing tenant locations with continent and country information.
This script adds 'continent' and 'country' fields to all locations in the tenant_locations collection.
"""

import os
from pymongo import MongoClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

# German state to country mapping
GERMAN_STATES = {
    'BB': 'Deutschland',
    'BE': 'Deutschland',
    'BW': 'Deutschland',
    'BY': 'Deutschland',
    'HB': 'Deutschland',
    'HE': 'Deutschland',
    'HH': 'Deutschland',
    'MV': 'Deutschland',
    'NI': 'Deutschland',
    'NW': 'Deutschland',
    'RP': 'Deutschland',
    'SH': 'Deutschland',
    'SL': 'Deutschland',
    'SN': 'Deutschland',
    'ST': 'Deutschland',
    'TH': 'Deutschland'
}

def update_locations():
    """Update all locations with continent and country information"""
    
    # Find all locations without continent or country
    locations_to_update = db.tenant_locations.find({
        '$or': [
            {'continent': {'$exists': False}},
            {'country': {'$exists': False}},
            {'continent': None},
            {'country': None}
        ]
    })
    
    updated_count = 0
    skipped_count = 0
    
    for location in locations_to_update:
        state = location.get('state', '')
        
        # Determine country based on state
        country = GERMAN_STATES.get(state)
        
        if country:
            # Update with continent and country
            db.tenant_locations.update_one(
                {'_id': location['_id']},
                {
                    '$set': {
                        'continent': 'Europa',
                        'country': country
                    }
                }
            )
            updated_count += 1
            print(f"✅ Updated location {location.get('location_code', 'Unknown')} - {state} → {country}, Europa")
        else:
            # For non-German states, set generic values or skip
            db.tenant_locations.update_one(
                {'_id': location['_id']},
                {
                    '$set': {
                        'continent': 'Europa',
                        'country': 'Deutschland'  # Default to Deutschland
                    }
                }
            )
            skipped_count += 1
            print(f"⚠️ Updated location {location.get('location_code', 'Unknown')} with default values (state: {state})")
    
    print(f"\n✅ Migration Complete!")
    print(f"   Updated: {updated_count} locations")
    print(f"   Defaulted: {skipped_count} locations")
    
    # Summary
    total_locations = db.tenant_locations.count_documents({})
    print(f"\n📊 Total locations in database: {total_locations}")
    
    # Show sample
    print("\n📍 Sample of updated locations:")
    sample_locations = db.tenant_locations.find({}).limit(5)
    for loc in sample_locations:
        print(f"   {loc.get('location_code')} - {loc.get('city')}, {loc.get('state')} → {loc.get('country')}, {loc.get('continent')}")

if __name__ == '__main__':
    print("🚀 Starting location geography update...")
    print(f"   Database: portal_db")
    print(f"   Collection: tenant_locations\n")
    
    update_locations()
