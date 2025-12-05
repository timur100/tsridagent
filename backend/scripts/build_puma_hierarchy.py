"""
Build Puma Hierarchie (ähnlich wie Europcar)
Struktur: Organization -> Continent -> Country -> State/Region -> City -> Location
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
PUMA_TENANT_ID = '94317b6b-a478-4df5-9a81-d1fd3c5983c8'

# Puma Store-Struktur (basierend auf Web-Recherche)
PUMA_STRUCTURE = {
    'Europa': {
        'Deutschland': {
            'Bayern': ['München', 'Nürnberg'],
            'Berlin': ['Berlin'],
            'Nordrhein-Westfalen': ['Köln', 'Düsseldorf', 'Dortmund'],
            'Hessen': ['Frankfurt am Main'],
            'Hamburg': ['Hamburg'],
            'Baden-Württemberg': ['Stuttgart']
        },
        'Vereinigtes Königreich': {
            'England': ['London', 'Manchester', 'Birmingham']
        },
        'Frankreich': {
            'Île-de-France': ['Paris'],
            'Auvergne-Rhône-Alpes': ['Lyon'],
            'Provence-Alpes-Côte d\'Azur': ['Marseille']
        },
        'Spanien': {
            'Cataluña': ['Barcelona'],
            'Madrid': ['Madrid'],
            'Andalucía': ['Sevilla']
        },
        'Italien': {
            'Lazio': ['Roma'],
            'Lombardia': ['Milano'],
            'Campania': ['Napoli']
        },
        'Niederlande': {
            'Noord-Holland': ['Amsterdam'],
            'Zuid-Holland': ['Rotterdam']
        }
    },
    'Nordamerika': {
        'USA': {
            'California': ['Los Angeles', 'San Francisco'],
            'New York': ['New York City'],
            'Massachusetts': ['Boston'],
            'Nevada': ['Las Vegas'],
            'Florida': ['Miami']
        },
        'Kanada': {
            'Ontario': ['Toronto'],
            'Quebec': ['Montreal']
        }
    },
    'Asien': {
        'China': {
            'Shanghai': ['Shanghai'],
            'Beijing': ['Beijing'],
            'Guangdong': ['Guangzhou']
        },
        'Japan': {
            'Tokyo': ['Tokyo'],
            'Osaka': ['Osaka']
        }
    }
}

async def build_puma_hierarchy():
    client = AsyncIOMotorClient(MONGO_URL)
    portal_db = client['portal_db']
    tsrid_db = client['tsrid_db']
    
    print("=" * 80)
    print("🐆 BUILDING PUMA HIERARCHY")
    print("=" * 80)
    
    # Step 1: Load existing Puma location (Soltau/Berlin)
    print("\n📍 Step 1: Loading existing Puma location...")
    puma_locations = await portal_db.tenant_locations.find({
        'tenant_id': PUMA_TENANT_ID
    }).to_list(100)
    print(f"   ✓ Found {len(puma_locations)} existing location(s)")
    for loc in puma_locations:
        print(f"      - {loc.get('station_name')} in {loc.get('city')}")
    
    # Step 2: Set Organization level
    print("\n🏢 Step 2: Setting Organization level...")
    await tsrid_db.tenants.update_one(
        {'tenant_id': PUMA_TENANT_ID},
        {
            '$set': {
                'tenant_id': PUMA_TENANT_ID,
                'tenant_level': 'organization',
                'parent_tenant_id': None,
                'display_name': 'Puma',
                'name': 'Puma',
                'enabled': True
            }
        },
        upsert=True
    )
    print(f"   ✓ Organization: Puma")
    
    continent_count = 0
    country_count = 0
    state_count = 0
    city_count = 0
    
    # Step 3: Build international structure
    print("\n🌍 Step 3: Building international structure...")
    
    for continent_name, countries in PUMA_STRUCTURE.items():
        continent_id = f"{PUMA_TENANT_ID}-{continent_name.lower().replace(' ', '-')}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': continent_id},
            {
                '$set': {
                    'tenant_id': continent_id,
                    'name': f'Puma {continent_name}',
                    'display_name': continent_name,
                    'tenant_level': 'continent',
                    'parent_tenant_id': PUMA_TENANT_ID,
                    'enabled': True
                }
            },
            upsert=True
        )
        continent_count += 1
        print(f"   ✓ Continent: {continent_name}")
        
        for country_name, regions in countries.items():
            country_normalized = country_name.lower().replace(' ', '-')
            country_id = f"{PUMA_TENANT_ID}-{country_normalized}"
            
            await tsrid_db.tenants.update_one(
                {'tenant_id': country_id},
                {
                    '$set': {
                        'tenant_id': country_id,
                        'name': f'Puma {country_name}',
                        'display_name': country_name,
                        'tenant_level': 'country',
                        'parent_tenant_id': continent_id,
                        'enabled': True
                    }
                },
                upsert=True
            )
            country_count += 1
            print(f"      Country: {country_name}")
            
            # Build regions and cities
            for region_name, cities in regions.items():
                region_normalized = region_name.lower().replace(' ', '-').replace("'", '')
                region_id = f"{country_id}-{region_normalized}"
                
                await tsrid_db.tenants.update_one(
                    {'tenant_id': region_id},
                    {
                        '$set': {
                            'tenant_id': region_id,
                            'name': f'Puma {region_name}',
                            'display_name': region_name,
                            'tenant_level': 'state',
                            'parent_tenant_id': country_id,
                            'enabled': True
                        }
                    },
                    upsert=True
                )
                state_count += 1
                
                for city_name in cities:
                    city_id = f"{region_id}-{city_name.lower().replace(' ', '-')}"
                    
                    await tsrid_db.tenants.update_one(
                        {'tenant_id': city_id},
                        {
                            '$set': {
                                'tenant_id': city_id,
                                'name': f'Puma {city_name}',
                                'display_name': city_name,
                                'tenant_level': 'city',
                                'parent_tenant_id': region_id,
                                'enabled': True
                            }
                        },
                        upsert=True
                    )
                    city_count += 1
    
    # Step 4: Create location tenant for existing Puma location
    print("\n📍 Step 4: Creating location tenant for existing store...")
    location_count = 0
    
    for loc in puma_locations:
        location_code = loc.get('location_code', 'soltau')
        station_name = loc.get('station_name', 'Soltau')
        city = loc.get('city', 'Berlin')
        
        # Find Berlin city tenant
        berlin_city_id = f"{PUMA_TENANT_ID}-deutschland-berlin-berlin"
        
        location_tenant_id = f"{PUMA_TENANT_ID}-{location_code.lower()}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': location_tenant_id},
            {
                '$set': {
                    'tenant_id': location_tenant_id,
                    'name': f'Puma {station_name}',
                    'display_name': station_name,
                    'tenant_level': 'location',
                    'parent_tenant_id': berlin_city_id,
                    'country_code': 'DE',
                    'enabled': True,
                    'location_code': location_code,
                    'location_id': loc.get('location_id')
                }
            },
            upsert=True
        )
        location_count += 1
        print(f"   ✓ Location: {station_name} in Berlin")
    
    # Step 5: Summary
    print("\n" + "=" * 80)
    print("✅ PUMA HIERARCHY BUILD COMPLETE")
    print("=" * 80)
    
    # Count final hierarchy
    org_count = await tsrid_db.tenants.count_documents({
        'tenant_id': PUMA_TENANT_ID
    })
    cont_count = await tsrid_db.tenants.count_documents({
        'tenant_level': 'continent',
        'tenant_id': {'$regex': f'^{PUMA_TENANT_ID}'}
    })
    country_count_final = await tsrid_db.tenants.count_documents({
        'tenant_level': 'country',
        'tenant_id': {'$regex': f'^{PUMA_TENANT_ID}'}
    })
    state_count_final = await tsrid_db.tenants.count_documents({
        'tenant_level': 'state',
        'tenant_id': {'$regex': f'^{PUMA_TENANT_ID}'}
    })
    city_count_final = await tsrid_db.tenants.count_documents({
        'tenant_level': 'city',
        'tenant_id': {'$regex': f'^{PUMA_TENANT_ID}'}
    })
    location_count_final = await tsrid_db.tenants.count_documents({
        'tenant_level': 'location',
        'tenant_id': {'$regex': f'^{PUMA_TENANT_ID}'}
    })
    
    print(f"\n📊 Final Puma Hierarchy Stats:")
    print(f"   Organization:  {org_count}")
    print(f"   Continents:    {cont_count}")
    print(f"   Countries:     {country_count_final}")
    print(f"   States/Regions:{state_count_final}")
    print(f"   Cities:        {city_count_final}")
    print(f"   Locations:     {location_count_final} ← echte Standorte")
    total = org_count + cont_count + country_count_final + state_count_final + city_count_final + location_count_final
    print(f"   TOTAL:         {total}")
    
    print("\n🐆 Puma hierarchy successfully built!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(build_puma_hierarchy())
