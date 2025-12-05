"""
Organization Creator API
Endpoint to dynamically create new organizations with hierarchies
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/organizations", tags=["organizations"])
security = HTTPBearer()

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
tsrid_db = client.tsrid_db
auth_db = client.auth_db

class OrganizationCreate(BaseModel):
    name: str
    display_name: Optional[str] = None
    industry: str = 'retail'
    generate_hierarchy: bool = True
    countries: List[str] = []

# Industry-based hierarchy templates
INDUSTRY_STRUCTURES = {
    'retail': {
        'Europa': {
            'Deutschland': {'Bayern': ['München', 'Nürnberg'], 'Berlin': ['Berlin'], 'Nordrhein-Westfalen': ['Köln', 'Düsseldorf']},
            'Frankreich': {'Île-de-France': ['Paris'], 'Auvergne-Rhône-Alpes': ['Lyon']},
            'Spanien': {'Cataluña': ['Barcelona'], 'Madrid': ['Madrid']},
            'Italien': {'Lazio': ['Roma'], 'Lombardia': ['Milano']},
            'Niederlande': {'Noord-Holland': ['Amsterdam']},
            'Belgien': {'Bruxelles': ['Brussels']},
            'Österreich': {'Wien': ['Wien']},
            'Schweiz': {'Zürich': ['Zürich']}
        }
    },
    'automotive': {
        'Europa': {
            'Deutschland': {'Bayern': ['München'], 'Berlin': ['Berlin'], 'Hessen': ['Frankfurt am Main']},
            'Frankreich': {'Île-de-France': ['Paris'], 'Provence-Alpes-Côte d\'Azur': ['Nice']},
            'Spanien': {'Cataluña': ['Barcelona'], 'Madrid': ['Madrid']},
            'Italien': {'Lazio': ['Roma'], 'Lombardia': ['Milano']},
            'UK': {'England': ['London', 'Manchester']}
        },
        'Nordamerika': {
            'USA': {'California': ['Los Angeles'], 'New York': ['New York City'], 'Florida': ['Miami']}
        },
        'Asien-Pazifik': {
            'Australien': {'New South Wales': ['Sydney'], 'Victoria': ['Melbourne']}
        }
    },
    'sports': {
        'Europa': {
            'Deutschland': {'Bayern': ['München'], 'Berlin': ['Berlin'], 'Nordrhein-Westfalen': ['Köln']},
            'UK': {'England': ['London', 'Manchester']},
            'Frankreich': {'Île-de-France': ['Paris']},
            'Spanien': {'Cataluña': ['Barcelona'], 'Madrid': ['Madrid']},
            'Italien': {'Lazio': ['Roma'], 'Lombardia': ['Milano']},
            'Niederlande': {'Noord-Holland': ['Amsterdam']}
        },
        'Nordamerika': {
            'USA': {'California': ['Los Angeles'], 'New York': ['New York City'], 'Massachusetts': ['Boston']}
        },
        'Asien': {
            'China': {'Shanghai': ['Shanghai'], 'Beijing': ['Beijing']},
            'Japan': {'Tokyo': ['Tokyo'], 'Osaka': ['Osaka']}
        }
    },
    'logistics': {
        'Europa': {
            'Deutschland': {'Nordrhein-Westfalen': ['Köln', 'Düsseldorf'], 'Hessen': ['Frankfurt am Main']},
            'Frankreich': {'Île-de-France': ['Paris']},
            'UK': {'England': ['London']}
        },
        'Nordamerika': {
            'USA': {'New York': ['New York City'], 'California': ['Los Angeles']}
        },
        'Asien': {
            'China': {'Shanghai': ['Shanghai']},
            'Indien': {'Maharashtra': ['Mumbai']}
        }
    },
    'hospitality': {
        'Nordamerika': {
            'USA': {'California': ['Los Angeles'], 'New York': ['New York City'], 'Illinois': ['Chicago']}
        },
        'Europa': {
            'Deutschland': {'Bayern': ['München'], 'Berlin': ['Berlin']},
            'UK': {'England': ['London']},
            'Frankreich': {'Île-de-France': ['Paris']}
        },
        'Asien': {
            'China': {'Shanghai': ['Shanghai']},
            'Japan': {'Tokyo': ['Tokyo']}
        }
    },
    'custom': {}
}

@router.post("/create")
async def create_organization(
    org_data: OrganizationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new organization with optional auto-generated hierarchy
    """
    try:
        # Generate tenant ID
        tenant_id = str(uuid4())
        display_name = org_data.display_name or org_data.name
        
        # Step 1: Create tenant in auth_db
        auth_tenant = {
            'tenant_id': tenant_id,
            'name': org_data.name,
            'display_name': display_name,
            'status': 'trial',
            'enabled': True,
            'contact': {
                'admin_email': f'admin@{org_data.name.lower().replace(" ", "")}.com'
            }
        }
        
        await auth_db.tenants.insert_one(auth_tenant)
        
        # Step 2: Create organization-level tenant in tsrid_db
        await tsrid_db.tenants.insert_one({
            'tenant_id': tenant_id,
            'name': org_data.name,
            'display_name': display_name,
            'tenant_level': 'organization',
            'parent_tenant_id': None,
            'enabled': True
        })
        
        stats = {
            'organization': 1,
            'continents': 0,
            'countries': 0,
            'states': 0,
            'cities': 0,
            'locations': 0
        }
        
        # Step 3: Generate hierarchy if requested
        if org_data.generate_hierarchy:
            structure = INDUSTRY_STRUCTURES.get(org_data.industry, {})
            
            # Filter by selected countries if provided
            if org_data.countries:
                filtered_structure = {}
                for continent, countries in structure.items():
                    filtered_countries = {
                        country: regions 
                        for country, regions in countries.items() 
                        if country in org_data.countries
                    }
                    if filtered_countries:
                        filtered_structure[continent] = filtered_countries
                structure = filtered_structure
            
            # Build hierarchy
            for continent_name, countries in structure.items():
                continent_id = f"{tenant_id}-{continent_name.lower().replace(' ', '-')}"
                
                await tsrid_db.tenants.insert_one({
                    'tenant_id': continent_id,
                    'name': f'{org_data.name} {continent_name}',
                    'display_name': continent_name,
                    'tenant_level': 'continent',
                    'parent_tenant_id': tenant_id,
                    'enabled': True
                })
                stats['continents'] += 1
                
                for country_name, regions in countries.items():
                    country_normalized = country_name.lower().replace(' ', '-')
                    country_id = f"{tenant_id}-{country_normalized}"
                    
                    await tsrid_db.tenants.insert_one({
                        'tenant_id': country_id,
                        'name': f'{org_data.name} {country_name}',
                        'display_name': country_name,
                        'tenant_level': 'country',
                        'parent_tenant_id': continent_id,
                        'enabled': True
                    })
                    stats['countries'] += 1
                    
                    for region_name, cities in regions.items():
                        region_normalized = region_name.lower().replace(' ', '-').replace("'", '')
                        region_id = f"{country_id}-{region_normalized}"
                        
                        await tsrid_db.tenants.insert_one({
                            'tenant_id': region_id,
                            'name': f'{org_data.name} {region_name}',
                            'display_name': region_name,
                            'tenant_level': 'state',
                            'parent_tenant_id': country_id,
                            'enabled': True
                        })
                        stats['states'] += 1
                        
                        for city_name in cities:
                            city_id = f"{region_id}-{city_name.lower().replace(' ', '-')}"
                            
                            await tsrid_db.tenants.insert_one({
                                'tenant_id': city_id,
                                'name': f'{org_data.name} {city_name}',
                                'display_name': city_name,
                                'tenant_level': 'city',
                                'parent_tenant_id': region_id,
                                'enabled': True
                            })
                            stats['cities'] += 1
        
        return {
            'success': True,
            'message': f'Organisation "{org_data.name}" erfolgreich erstellt',
            'data': {
                'tenant_id': tenant_id,
                'name': org_data.name,
                'display_name': display_name,
                'stats': stats
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/industries")
async def get_industries():
    """
    Get available industry templates
    """
    return {
        'success': True,
        'industries': [
            {'value': 'retail', 'label': 'Einzelhandel', 'countries': 8},
            {'value': 'automotive', 'label': 'Autovermietung', 'countries': 8},
            {'value': 'sports', 'label': 'Sportartikel', 'countries': 10},
            {'value': 'logistics', 'label': 'Logistik', 'countries': 6},
            {'value': 'hospitality', 'label': 'Gastronomie', 'countries': 7},
            {'value': 'custom', 'label': 'Benutzerdefiniert', 'countries': 0}
        ]
    }
