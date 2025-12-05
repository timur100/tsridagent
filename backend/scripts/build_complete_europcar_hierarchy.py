"""
Build Complete Europcar Hierarchie with International Locations
Struktur: Organization -> Continent -> Country -> State/Region -> City -> Location
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from collections import defaultdict

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
EUROPCAR_TENANT_ID = '1d3653db-86cb-4dd1-9ef5-0236b116def8'

# Deutsche Bundesländer Mapping
GERMAN_STATES = {
    'BB': 'Brandenburg',
    'BE': 'Berlin',
    'BW': 'Baden-Württemberg',
    'BY': 'Bayern',
    'HB': 'Bremen',
    'HE': 'Hessen',
    'HH': 'Hamburg',
    'MV': 'Mecklenburg-Vorpommern',
    'NI': 'Niedersachsen',
    'NW': 'Nordrhein-Westfalen',
    'RP': 'Rheinland-Pfalz',
    'SH': 'Schleswig-Holstein',
    'SL': 'Saarland',
    'SN': 'Sachsen',
    'ST': 'Sachsen-Anhalt',
    'TH': 'Thüringen'
}

# Internationale Struktur (basierend auf Web-Recherche)
INTERNATIONAL_STRUCTURE = {
    'Europa': {
        'Frankreich': {
            'Île-de-France': ['Paris', 'Versailles', 'Orly'],
            'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Chambéry'],
            'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Cannes', 'Toulon'],
            'Occitanie': ['Toulouse', 'Montpellier', 'Nîmes'],
            'Nouvelle-Aquitaine': ['Bordeaux', 'La Rochelle', 'Pau'],
            'Grand Est': ['Strasbourg', 'Reims', 'Metz'],
            'Hauts-de-France': ['Lille', 'Amiens'],
            'Bretagne': ['Rennes', 'Brest', 'Saint-Malo'],
            'Pays de la Loire': ['Nantes', 'Angers', 'Le Mans'],
            'Normandie': ['Rouen', 'Le Havre', 'Caen']
        },
        'Spanien': {
            'Cataluña': ['Barcelona', 'Girona', 'Tarragona'],
            'Madrid': ['Madrid'],
            'Andalucía': ['Sevilla', 'Málaga', 'Granada', 'Córdoba'],
            'Valencia': ['Valencia', 'Alicante', 'Castellón'],
            'Galicia': ['Santiago de Compostela', 'A Coruña', 'Vigo'],
            'País Vasco': ['Bilbao', 'San Sebastián'],
            'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife']
        },
        'Italien': {
            'Lazio': ['Roma', 'Latina'],
            'Lombardia': ['Milano', 'Bergamo', 'Brescia'],
            'Campania': ['Napoli', 'Salerno'],
            'Sicilia': ['Palermo', 'Catania', 'Messina'],
            'Veneto': ['Venezia', 'Verona', 'Padova'],
            'Toscana': ['Firenze', 'Pisa', 'Siena'],
            'Piemonte': ['Torino'],
            'Emilia-Romagna': ['Bologna', 'Rimini']
        },
        'Vereinigtes Königreich': {
            'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Bristol', 'Leeds', 'Newcastle'],
            'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen'],
            'Wales': ['Cardiff', 'Swansea'],
            'Northern Ireland': ['Belfast']
        },
        'Portugal': {
            'Lisboa': ['Lisboa', 'Cascais'],
            'Porto': ['Porto', 'Vila Nova de Gaia'],
            'Algarve': ['Faro', 'Albufeira', 'Lagos']
        },
        'Niederlande': {
            'Noord-Holland': ['Amsterdam', 'Haarlem'],
            'Zuid-Holland': ['Rotterdam', 'Den Haag'],
            'Noord-Brabant': ['Eindhoven', 'Breda']
        },
        'Belgien': {
            'Bruxelles': ['Brussels'],
            'Vlaanderen': ['Antwerpen', 'Gent', 'Brugge'],
            'Wallonie': ['Liège', 'Charleroi', 'Namur']
        },
        'Österreich': {
            'Wien': ['Wien'],
            'Tirol': ['Innsbruck'],
            'Salzburg': ['Salzburg']
        },
        'Schweiz': {
            'Zürich': ['Zürich'],
            'Genève': ['Genève'],
            'Bern': ['Bern']
        }
    },
    'Nordamerika': {
        'USA': {
            'California': ['Los Angeles', 'San Francisco', 'San Diego'],
            'New York': ['New York City', 'Buffalo'],
            'Florida': ['Miami', 'Orlando', 'Tampa'],
            'Texas': ['Houston', 'Dallas', 'Austin']
        }
    },
    'Asien-Pazifik': {
        'Australien': {
            'New South Wales': ['Sydney'],
            'Victoria': ['Melbourne'],
            'Queensland': ['Brisbane', 'Gold Coast']
        }
    }
}

async def build_complete_hierarchy():
    client = AsyncIOMotorClient(MONGO_URL)
    portal_db = client['portal_db']
    tsrid_db = client['tsrid_db']
    
    print("=" * 80)
    print("🌍 BUILDING COMPLETE EUROPCAR INTERNATIONAL HIERARCHY")
    print("=" * 80)
    
    # Step 1: Load existing German locations
    print("\n📍 Step 1: Loading German locations...")
    german_locations = await portal_db.tenant_locations.find({
        'tenant_id': EUROPCAR_TENANT_ID,
        'country': 'Deutschland'
    }).to_list(300)
    print(f"   ✓ Loaded {len(german_locations)} German locations")
    
    # Step 2: Clear old hierarchy (keep only the main Europcar tenant)
    print("\n🗑️  Step 2: Clearing old hierarchy...")
    result = await tsrid_db.tenants.delete_many({
        'tenant_id': {'$ne': EUROPCAR_TENANT_ID},
        '$or': [
            {'parent_tenant_id': {'$exists': True}},
            {'tenant_level': {'$exists': True}}
        ]
    })
    print(f"   ✓ Deleted {result.deleted_count} old hierarchy tenants")
    
    # Step 3: Set Organization level
    print("\n🏢 Step 3: Setting Organization level...")
    await tsrid_db.tenants.update_one(
        {'tenant_id': EUROPCAR_TENANT_ID},
        {
            '$set': {
                'tenant_level': 'organization',
                'parent_tenant_id': None,
                'display_name': 'Europcar',
                'name': 'Europcar',
                'enabled': True
            }
        },
        upsert=True
    )
    print(f"   ✓ Organization: Europcar")
    
    location_tenant_count = 0
    state_count = 0
    city_count = 0
    continent_count = 0
    country_count = 0
    
    # Step 4: Build international structure
    print("\n🌍 Step 4: Building international structure...")
    
    for continent_name, countries in INTERNATIONAL_STRUCTURE.items():
        continent_id = f"{EUROPCAR_TENANT_ID}-{continent_name.lower().replace(' ', '-')}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': continent_id},
            {
                '$set': {
                    'tenant_id': continent_id,
                    'name': f'Europcar {continent_name}',
                    'display_name': continent_name,
                    'tenant_level': 'continent',
                    'parent_tenant_id': EUROPCAR_TENANT_ID,
                    'enabled': True
                }
            },
            upsert=True
        )
        continent_count += 1
        print(f"   ✓ Continent: {continent_name}")
        
        for country_name, regions in countries.items():
            country_normalized = country_name.lower().replace(' ', '-')
            country_id = f"{EUROPCAR_TENANT_ID}-{country_normalized}"
            
            await tsrid_db.tenants.update_one(
                {'tenant_id': country_id},
                {
                    '$set': {
                        'tenant_id': country_id,
                        'name': f'Europcar {country_name}',
                        'display_name': country_name,
                        'tenant_level': 'country',
                        'parent_tenant_id': continent_id,
                        'enabled': True
                    }
                },
                upsert=True
            )
            country_count += 1
            
            print(f"      Country: {country_name} (id: {country_id})")
            
            # Special handling for Germany (use real data)
            if country_name == 'Deutschland':
                print(f"      → Building German hierarchy with {len(german_locations)} locations")
                counts = await build_german_hierarchy(tsrid_db, country_id, german_locations)
                state_count += counts['states']
                city_count += counts['cities']
                location_tenant_count += counts['locations']
                continue
            
            # Build structure for other countries (regions/states and cities)
            if regions:
                # Build structure for other countries
                for region_name, cities in regions.items():
                    region_normalized = region_name.lower().replace(' ', '-').replace("'", '')
                    region_id = f"{country_id}-{region_normalized}"
                    
                    await tsrid_db.tenants.update_one(
                        {'tenant_id': region_id},
                        {
                            '$set': {
                                'tenant_id': region_id,
                                'name': f'Europcar {region_name}',
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
                                    'name': f'Europcar {city_name}',
                                    'display_name': city_name,
                                    'tenant_level': 'city',
                                    'parent_tenant_id': region_id,
                                    'enabled': True
                                }
                            },
                            upsert=True
                        )
                        city_count += 1
            
            # Special handling for Germany (use real data)
            if country_name == 'Deutschland':
                counts = await build_german_hierarchy(tsrid_db, country_id, german_locations)
                state_count += counts['states']
                city_count += counts['cities']
                location_tenant_count += counts['locations']
    
    print(f"\n   Created: {continent_count} continents, {country_count} countries, {state_count} states/regions, {city_count} cities, {location_tenant_count} locations")
    
    # Step 5: Summary
    print("\n" + "=" * 80)
    print("✅ COMPLETE HIERARCHY BUILD FINISHED")
    print("=" * 80)
    
    # Count final hierarchy
    org_count = await tsrid_db.tenants.count_documents({'tenant_level': 'organization'})
    cont_count = await tsrid_db.tenants.count_documents({'tenant_level': 'continent'})
    country_count_final = await tsrid_db.tenants.count_documents({'tenant_level': 'country'})
    state_count_final = await tsrid_db.tenants.count_documents({'tenant_level': 'state'})
    city_count_final = await tsrid_db.tenants.count_documents({'tenant_level': 'city'})
    location_count_final = await tsrid_db.tenants.count_documents({'tenant_level': 'location'})
    
    print(f"\n📊 Final Hierarchy Stats:")
    print(f"   Organization:  {org_count}")
    print(f"   Continents:    {cont_count}")
    print(f"   Countries:     {country_count_final}")
    print(f"   States/Regions:{state_count_final}")
    print(f"   Cities:        {city_count_final}")
    print(f"   Locations:     {location_count_final} ← echte Standorte")
    total = org_count + cont_count + country_count_final + state_count_final + city_count_final + location_count_final
    print(f"   TOTAL:         {total}")
    
    client.close()

async def build_german_hierarchy(tsrid_db, country_id, locations):
    """Build Germany hierarchy with Bundesländer -> Cities -> Locations"""
    print(f"\n   🇩🇪 Building German hierarchy with Bundesländer...")
    
    # Group by Bundesland and City
    by_state = defaultdict(lambda: defaultdict(list))
    for loc in locations:
        state = loc.get('state', '').strip()
        city = loc.get('city', '').strip()
        if state and city:
            by_state[state][city].append(loc)
    
    state_count = 0
    city_count = 0
    location_count = 0
    
    for state_code, cities in sorted(by_state.items()):
        state_name = GERMAN_STATES.get(state_code, state_code)
        state_id = f"{country_id}-{state_code.lower()}"
        
        await tsrid_db.tenants.update_one(
            {'tenant_id': state_id},
            {
                '$set': {
                    'tenant_id': state_id,
                    'name': f'Europcar {state_name}',
                    'display_name': state_name,
                    'tenant_level': 'state',
                    'parent_tenant_id': country_id,
                    'country_code': 'DE',
                    'enabled': True
                }
            },
            upsert=True
        )
        state_count += 1
        
        for city_name, city_locations in sorted(cities.items()):
            city_id = f"{state_id}-{city_name.lower().replace(' ', '-')}"
            
            await tsrid_db.tenants.update_one(
                {'tenant_id': city_id},
                {
                    '$set': {
                        'tenant_id': city_id,
                        'name': f'Europcar {city_name}',
                        'display_name': city_name,
                        'tenant_level': 'city',
                        'parent_tenant_id': state_id,
                        'country_code': 'DE',
                        'enabled': True
                    }
                },
                upsert=True
            )
            city_count += 1
            
            # Create location tenants
            for loc in city_locations:
                location_code = loc.get('location_code')
                station_name = loc.get('station_name')
                
                if not location_code:
                    continue
                
                location_tenant_id = f"{EUROPCAR_TENANT_ID}-{location_code.lower()}"
                
                await tsrid_db.tenants.update_one(
                    {'tenant_id': location_tenant_id},
                    {
                        '$set': {
                            'tenant_id': location_tenant_id,
                            'name': f'Europcar {station_name or location_code}',
                            'display_name': station_name or location_code,
                            'tenant_level': 'location',
                            'parent_tenant_id': city_id,
                            'country_code': 'DE',
                            'enabled': True,
                            'location_code': location_code,
                            'location_id': loc.get('location_id')
                        }
                    },
                    upsert=True
                )
                location_count += 1
    
    print(f"      {state_count} Bundesländer, {city_count} Städte, {location_count} Standorte")
    
    return {
        'states': state_count,
        'cities': city_count,
        'locations': location_count
    }

if __name__ == "__main__":
    asyncio.run(build_complete_hierarchy())
