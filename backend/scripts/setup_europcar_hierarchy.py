"""
Setup Europcar Tenant Hierarchy
Creates a complete hierarchy: Organization -> Continent -> Country -> City -> Location
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from uuid import uuid4

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

# Europcar Hierarchy Structure
EUROPCAR_HIERARCHY = {
    "organization": {
        "tenant_id": "europcar-global",
        "name": "Europcar Global",
        "display_name": "Europcar Global",
        "tenant_type": "organization",
        "parent_tenant_id": None,
        "country_code": None,
        "allow_cross_location_search": False,
        "continents": {
            "europe": {
                "tenant_id": "europcar-europe",
                "name": "Europcar Europe",
                "display_name": "Europcar Europa",
                "tenant_type": "continent",
                "country_code": None,
                "allow_cross_location_search": False,
                "countries": {
                    "germany": {
                        "tenant_id": "europcar-germany",
                        "name": "Europcar Germany",
                        "display_name": "Europcar Deutschland",
                        "tenant_type": "country",
                        "country_code": "DE",
                        "allow_cross_location_search": False,
                        "cities": {
                            "munich": {
                                "tenant_id": "europcar-munich",
                                "name": "Europcar Munich",
                                "display_name": "Europcar München",
                                "tenant_type": "city",
                                "country_code": "DE",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-munich-airport",
                                        "name": "Europcar Munich Airport",
                                        "display_name": "München Flughafen (MUC)",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-munich-hbf",
                                        "name": "Europcar Munich Central Station",
                                        "display_name": "München Hauptbahnhof",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-munich-downtown",
                                        "name": "Europcar Munich Downtown",
                                        "display_name": "München Innenstadt",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            },
                            "berlin": {
                                "tenant_id": "europcar-berlin",
                                "name": "Europcar Berlin",
                                "display_name": "Europcar Berlin",
                                "tenant_type": "city",
                                "country_code": "DE",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-berlin-txl",
                                        "name": "Europcar Berlin Tegel",
                                        "display_name": "Berlin Flughafen Tegel (TXL)",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-berlin-hbf",
                                        "name": "Europcar Berlin Central Station",
                                        "display_name": "Berlin Hauptbahnhof",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-berlin-alexanderplatz",
                                        "name": "Europcar Berlin Alexanderplatz",
                                        "display_name": "Berlin Alexanderplatz",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            },
                            "frankfurt": {
                                "tenant_id": "europcar-frankfurt",
                                "name": "Europcar Frankfurt",
                                "display_name": "Europcar Frankfurt",
                                "tenant_type": "city",
                                "country_code": "DE",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-frankfurt-fra",
                                        "name": "Europcar Frankfurt Airport",
                                        "display_name": "Frankfurt Flughafen (FRA)",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-frankfurt-hbf",
                                        "name": "Europcar Frankfurt Central Station",
                                        "display_name": "Frankfurt Hauptbahnhof",
                                        "tenant_type": "location",
                                        "country_code": "DE",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            }
                        }
                    },
                    "france": {
                        "tenant_id": "europcar-france",
                        "name": "Europcar France",
                        "display_name": "Europcar Frankreich",
                        "tenant_type": "country",
                        "country_code": "FR",
                        "allow_cross_location_search": False,
                        "cities": {
                            "paris": {
                                "tenant_id": "europcar-paris",
                                "name": "Europcar Paris",
                                "display_name": "Europcar Paris",
                                "tenant_type": "city",
                                "country_code": "FR",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-paris-cdg",
                                        "name": "Europcar Paris CDG",
                                        "display_name": "Paris Charles de Gaulle (CDG)",
                                        "tenant_type": "location",
                                        "country_code": "FR",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-paris-orly",
                                        "name": "Europcar Paris Orly",
                                        "display_name": "Paris Orly (ORY)",
                                        "tenant_type": "location",
                                        "country_code": "FR",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-paris-gare-du-nord",
                                        "name": "Europcar Paris Gare du Nord",
                                        "display_name": "Paris Gare du Nord",
                                        "tenant_type": "location",
                                        "country_code": "FR",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            },
                            "lyon": {
                                "tenant_id": "europcar-lyon",
                                "name": "Europcar Lyon",
                                "display_name": "Europcar Lyon",
                                "tenant_type": "city",
                                "country_code": "FR",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-lyon-lys",
                                        "name": "Europcar Lyon Airport",
                                        "display_name": "Lyon Flughafen (LYS)",
                                        "tenant_type": "location",
                                        "country_code": "FR",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-lyon-part-dieu",
                                        "name": "Europcar Lyon Part-Dieu",
                                        "display_name": "Lyon Part-Dieu",
                                        "tenant_type": "location",
                                        "country_code": "FR",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            }
                        }
                    },
                    "spain": {
                        "tenant_id": "europcar-spain",
                        "name": "Europcar Spain",
                        "display_name": "Europcar Spanien",
                        "tenant_type": "country",
                        "country_code": "ES",
                        "allow_cross_location_search": False,
                        "cities": {
                            "madrid": {
                                "tenant_id": "europcar-madrid",
                                "name": "Europcar Madrid",
                                "display_name": "Europcar Madrid",
                                "tenant_type": "city",
                                "country_code": "ES",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-madrid-mad",
                                        "name": "Europcar Madrid Airport",
                                        "display_name": "Madrid Flughafen (MAD)",
                                        "tenant_type": "location",
                                        "country_code": "ES",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-madrid-atocha",
                                        "name": "Europcar Madrid Atocha",
                                        "display_name": "Madrid Atocha",
                                        "tenant_type": "location",
                                        "country_code": "ES",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            },
                            "barcelona": {
                                "tenant_id": "europcar-barcelona",
                                "name": "Europcar Barcelona",
                                "display_name": "Europcar Barcelona",
                                "tenant_type": "city",
                                "country_code": "ES",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-barcelona-bcn",
                                        "name": "Europcar Barcelona Airport",
                                        "display_name": "Barcelona Flughafen (BCN)",
                                        "tenant_type": "location",
                                        "country_code": "ES",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-barcelona-sants",
                                        "name": "Europcar Barcelona Sants",
                                        "display_name": "Barcelona Sants",
                                        "tenant_type": "location",
                                        "country_code": "ES",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            "north-america": {
                "tenant_id": "europcar-north-america",
                "name": "Europcar North America",
                "display_name": "Europcar Nordamerika",
                "tenant_type": "continent",
                "country_code": None,
                "allow_cross_location_search": False,
                "countries": {
                    "usa": {
                        "tenant_id": "europcar-usa",
                        "name": "Europcar USA",
                        "display_name": "Europcar USA",
                        "tenant_type": "country",
                        "country_code": "US",
                        "allow_cross_location_search": False,
                        "cities": {
                            "new-york": {
                                "tenant_id": "europcar-new-york",
                                "name": "Europcar New York",
                                "display_name": "Europcar New York",
                                "tenant_type": "city",
                                "country_code": "US",
                                "allow_cross_location_search": False,
                                "locations": [
                                    {
                                        "tenant_id": "europcar-new-york-jfk",
                                        "name": "Europcar New York JFK",
                                        "display_name": "New York JFK Airport",
                                        "tenant_type": "location",
                                        "country_code": "US",
                                        "allow_cross_location_search": True
                                    },
                                    {
                                        "tenant_id": "europcar-new-york-laguardia",
                                        "name": "Europcar New York LaGuardia",
                                        "display_name": "New York LaGuardia Airport (LGA)",
                                        "tenant_type": "location",
                                        "country_code": "US",
                                        "allow_cross_location_search": True
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    }
}

def create_tenant_document(tenant_data, parent_id=None):
    """Create a tenant document with all required fields"""
    now = datetime.now(timezone.utc).isoformat()
    
    return {
        "tenant_id": tenant_data["tenant_id"],
        "name": tenant_data["name"],
        "display_name": tenant_data["display_name"],
        "tenant_type": tenant_data["tenant_type"],
        "parent_tenant_id": parent_id,
        "country_code": tenant_data.get("country_code"),
        "allow_cross_location_search": tenant_data.get("allow_cross_location_search", False),
        "enabled": True,
        "status": "active",
        "domain": None,
        "description": f"{tenant_data['display_name']} - {tenant_data['tenant_type'].title()}",
        "subscription_plan": "enterprise",
        "created_at": now,
        "updated_at": now
    }

async def setup_hierarchy():
    """Setup the complete Europcar hierarchy"""
    print("🚀 Starting Europcar Hierarchy Setup...")
    
    # Check if organization already exists
    existing = await db.tenants.find_one({"tenant_id": "europcar-global"})
    if existing:
        print("⚠️  Europcar hierarchy already exists. Deleting old data...")
        # Delete all europcar tenants
        result = await db.tenants.delete_many({"tenant_id": {"$regex": "^europcar-"}})
        print(f"   Deleted {result.deleted_count} old tenants")
    
    tenants_to_insert = []
    
    # 1. Create Organization
    org_data = EUROPCAR_HIERARCHY["organization"]
    org_doc = create_tenant_document(org_data, parent_id=None)
    tenants_to_insert.append(org_doc)
    print(f"✓ Created Organization: {org_data['display_name']}")
    
    # 2. Create Continents
    for continent_key, continent_data in org_data["continents"].items():
        continent_doc = create_tenant_document(continent_data, parent_id=org_data["tenant_id"])
        tenants_to_insert.append(continent_doc)
        print(f"  ✓ Created Continent: {continent_data['display_name']}")
        
        # 3. Create Countries
        for country_key, country_data in continent_data["countries"].items():
            country_doc = create_tenant_document(country_data, parent_id=continent_data["tenant_id"])
            tenants_to_insert.append(country_doc)
            print(f"    ✓ Created Country: {country_data['display_name']}")
            
            # 4. Create Cities
            for city_key, city_data in country_data["cities"].items():
                city_doc = create_tenant_document(city_data, parent_id=country_data["tenant_id"])
                tenants_to_insert.append(city_doc)
                print(f"      ✓ Created City: {city_data['display_name']}")
                
                # 5. Create Locations
                for location_data in city_data["locations"]:
                    location_doc = create_tenant_document(location_data, parent_id=city_data["tenant_id"])
                    tenants_to_insert.append(location_doc)
                    print(f"        ✓ Created Location: {location_data['display_name']}")
    
    # Insert all tenants at once
    if tenants_to_insert:
        await db.tenants.insert_many(tenants_to_insert)
        print(f"\n✅ Successfully created {len(tenants_to_insert)} tenants!")
        
        # Print summary
        print("\n📊 Hierarchy Summary:")
        print(f"   Organizations: 1")
        print(f"   Continents: 2")
        print(f"   Countries: 4")
        print(f"   Cities: 8")
        print(f"   Locations: 18")
        print(f"   Total Tenants: {len(tenants_to_insert)}")
    
    print("\n🎉 Europcar Hierarchy Setup Complete!")
    print("\n💡 Next steps:")
    print("   1. Refresh the Tenants page in the UI")
    print("   2. Click on 'Europcar Global' in the hierarchy sidebar")
    print("   3. Expand the tree to see all locations")
    print("   4. Add vehicles to locations for cross-location testing")

if __name__ == "__main__":
    asyncio.run(setup_hierarchy())
