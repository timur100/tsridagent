"""
Build Europcar Tenant Hierarchy from existing 214 locations
Generates: Organization -> Continent -> Country -> City -> Location structure
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from collections import defaultdict

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
EUROPCAR_TENANT_ID = '1d3653db-86cb-4dd1-9ef5-0236b116def8'

async def build_hierarchy():
    client = AsyncIOMotorClient(MONGO_URL)
    portal_db = client['portal_db']
    tsrid_db = client['tsrid_db']
    
    print("=" * 80)
    print("🏗️  BUILDING EUROPCAR HIERARCHY FROM 214 LOCATIONS")
    print("=" * 80)
    
    # Step 1: Load all 214 locations
    print("\n📍 Step 1: Loading locations...")
    locations = await portal_db.tenant_locations.find({
        'tenant_id': EUROPCAR_TENANT_ID
    }).to_list(300)
    
    # Filter out test data
    valid_locations = [loc for loc in locations if loc.get('country') == 'Deutschland']
    print(f"   ✓ Loaded {len(valid_locations)} locations in Deutschland")
    
    # Step 2: Delete old test hierarchy
    print("\n🗑️  Step 2: Removing old test hierarchy...")
    test_tenant_ids = [
        'europcar', 'europcar-global', 'europcar-europe', 'europcar-germany',
        'europcar-munich', 'europcar-munich-airport', 'europcar-munich-hbf',
        'europcar-munich-downtown', 'europcar-berlin', 'europcar-berlin-txl',
        'europcar-berlin-hbf', 'europcar-berlin-alexanderplatz', 'europcar-frankfurt',
        'europcar-frankfurt-fra', 'europcar-frankfurt-hbf', 'europcar-france',
        'europcar-paris', 'europcar-paris-cdg', 'europcar-paris-orly',
        'europcar-paris-gare-du-nord', 'europcar-lyon', 'europcar-lyon-lys',
        'europcar-lyon-part-dieu', 'europcar-spain', 'europcar-madrid',
        'europcar-madrid-mad', 'europcar-madrid-atocha', 'europcar-barcelona',
        'europcar-barcelona-bcn', 'europcar-barcelona-sants', 'europcar-north-america',
        'europcar-usa', 'europcar-new-york', 'europcar-new-york-jfk',
        'europcar-new-york-laguardia'
    ]
    
    delete_result = await tsrid_db.tenants.delete_many({
        'tenant_id': {'$in': test_tenant_ids}
    })
    print(f"   ✓ Deleted {delete_result.deleted_count} test tenants")
    
    # Step 3: Update main Europcar tenant to be Organization level
    print("\n🏢 Step 3: Setting up Organization level...")
    await tsrid_db.tenants.update_one(
        {'tenant_id': EUROPCAR_TENANT_ID},
        {
            '$set': {
                'tenant_level': 'organization',
                'parent_tenant_id': None,
                'country_code': None,
                'allow_cross_location_search': True,
                'enabled': True,
                'name': 'Europcar',
                'display_name': 'Europcar'
            }
        },
        upsert=True
    )
    print(f"   ✓ Organization: Europcar ({EUROPCAR_TENANT_ID})")
    
    # Step 4: Create Continent level (Europa)
    print("\n🌍 Step 4: Creating Continent level...")
    continent_id = f"{EUROPCAR_TENANT_ID}-europe"
    await tsrid_db.tenants.update_one(
        {'tenant_id': continent_id},
        {
            '$set': {
                'tenant_id': continent_id,
                'name': 'Europcar Europa',
                'display_name': 'Europa',
                'tenant_level': 'continent',
                'parent_tenant_id': EUROPCAR_TENANT_ID,
                'country_code': None,
                'allow_cross_location_search': True,
                'enabled': True
            }
        },
        upsert=True
    )
    print(f"   ✓ Continent: Europa ({continent_id})")
    
    # Step 5: Create Country level (Deutschland)
    print("\n🇩🇪 Step 5: Creating Country level...")
    country_id = f"{EUROPCAR_TENANT_ID}-germany"
    await tsrid_db.tenants.update_one(
        {'tenant_id': country_id},
        {
            '$set': {
                'tenant_id': country_id,
                'name': 'Europcar Deutschland',
                'display_name': 'Deutschland',
                'tenant_level': 'country',
                'parent_tenant_id': continent_id,
                'country_code': 'DE',
                'allow_cross_location_search': True,
                'enabled': True
            }
        },
        upsert=True
    )
    print(f"   ✓ Country: Deutschland ({country_id})")
    
    # Step 6: Extract unique cities and create city-level tenants
    print("\n🏙️  Step 6: Creating City level tenants...")
    city_counts = defaultdict(list)
    for loc in valid_locations:
        city = loc.get('city')
        if city:
            city_counts[city].append(loc)
    
    city_tenant_map = {}
    for city, city_locations in sorted(city_counts.items()):
        city_normalized = city.replace(' ', '-').lower()
        city_id = f"{EUROPCAR_TENANT_ID}-{city_normalized}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': city_id},
            {
                '$set': {
                    'tenant_id': city_id,
                    'name': f'Europcar {city}',
                    'display_name': city,
                    'tenant_level': 'city',
                    'parent_tenant_id': country_id,
                    'country_code': 'DE',
                    'allow_cross_location_search': True,
                    'enabled': True
                }
            },
            upsert=True
        )
        city_tenant_map[city] = city_id
        print(f"   ✓ City: {city} ({len(city_locations)} Standorte)")
    
    print(f"\n   Total: {len(city_tenant_map)} cities created")
    
    # Step 7: Create location-level tenants for each of the 214 locations
    print("\n📍 Step 7: Creating Location level tenants (214 locations)...")
    location_tenants_created = 0
    
    for loc in valid_locations:
        city = loc.get('city')
        location_code = loc.get('location_code')
        station_name = loc.get('station_name')
        
        if not city or not location_code:
            print(f"   ⚠️  Skipping location without city or code: {loc.get('location_id')}")
            continue
        
        parent_city_id = city_tenant_map.get(city)
        if not parent_city_id:
            print(f"   ⚠️  No city tenant found for: {city}")
            continue
        
        location_tenant_id = f"{EUROPCAR_TENANT_ID}-{location_code.lower()}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': location_tenant_id},
            {
                '$set': {
                    'tenant_id': location_tenant_id,
                    'name': f'Europcar {station_name}',
                    'display_name': station_name or location_code,
                    'tenant_level': 'location',
                    'parent_tenant_id': parent_city_id,
                    'country_code': 'DE',
                    'allow_cross_location_search': False,  # Individual locations can opt-in
                    'enabled': True,
                    'location_code': location_code,
                    'location_id': loc.get('location_id')  # Link to portal_db location
                }
            },
            upsert=True
        )
        location_tenants_created += 1
        
        if location_tenants_created % 50 == 0:
            print(f"   ... {location_tenants_created} locations processed")
    
    print(f"   ✓ Created {location_tenants_created} location tenants")
    
    # Step 8: Summary
    print("\n" + "=" * 80)
    print("✅ HIERARCHY BUILD COMPLETE")
    print("=" * 80)
    
    # Count final hierarchy
    org_count = await tsrid_db.tenants.count_documents({'tenant_level': 'organization'})
    continent_count = await tsrid_db.tenants.count_documents({'tenant_level': 'continent'})
    country_count = await tsrid_db.tenants.count_documents({'tenant_level': 'country'})
    city_count = await tsrid_db.tenants.count_documents({'tenant_level': 'city'})
    location_count = await tsrid_db.tenants.count_documents({'tenant_level': 'location'})
    
    print(f"\n📊 Final Hierarchy Stats:")
    print(f"   Organization: {org_count}")
    print(f"   Continents:   {continent_count}")
    print(f"   Countries:    {country_count}")
    print(f"   Cities:       {city_count}")
    print(f"   Locations:    {location_count}")
    print(f"   TOTAL:        {org_count + continent_count + country_count + city_count + location_count}")
    
    print("\n🎉 Europcar hierarchy successfully built from 214 locations!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(build_hierarchy())
