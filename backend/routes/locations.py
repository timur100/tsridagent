from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/locations", tags=["locations"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
locations_collection = db['locations']

@router.get("/continents")
async def get_continents():
    """Get all unique continents"""
    try:
        continents = await locations_collection.distinct("continent")
        return {"continents": sorted([c for c in continents if c])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/countries")
async def get_countries(continent: Optional[str] = Query(None)):
    """Get countries, optionally filtered by continent"""
    try:
        query = {}
        if continent:
            query["continent"] = continent
        countries = await locations_collection.distinct("country", query)
        return {"countries": sorted([c for c in countries if c])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/states")
async def get_states(
    continent: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    """Get states/bundesland, optionally filtered"""
    try:
        query = {}
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        states = await locations_collection.distinct("state", query)
        return {"states": sorted([s for s in states if s])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cities")
async def get_cities(
    continent: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None)
):
    """Get cities, optionally filtered"""
    try:
        query = {}
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        if state:
            query["state"] = state
        cities = await locations_collection.distinct("city", query)
        return {"cities": sorted([c for c in cities if c])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_locations(
    continent: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Search locations with filters"""
    try:
        query = {}
        if continent:
            query["continent"] = continent
        if country:
            query["country"] = country
        if state:
            query["state"] = state
        if city:
            query["city"] = city
        if search:
            query["$or"] = [
                {"locationName": {"$regex": search, "$options": "i"}},
                {"locationCode": {"$regex": search, "$options": "i"}},
                {"street": {"$regex": search, "$options": "i"}}
            ]
        
        locations = await locations_collection.find(query).to_list(length=100)
        
        # Convert ObjectId to string
        for loc in locations:
            loc["_id"] = str(loc["_id"])
        
        return {"locations": locations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{location_code}")
async def get_location(location_code: str):
    """Get specific location by code"""
    try:
        location = await locations_collection.find_one({"locationCode": location_code})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        location["_id"] = str(location["_id"])
        return location
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
async def seed_locations():
    """Seed database with sample locations"""
    try:
        # Check if already seeded
        count = await locations_collection.count_documents({})
        if count > 0:
            return {"message": "Database already contains locations", "count": count}
        
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
            }
        ]
        
        result = await locations_collection.insert_many(sample_locations)
        return {"message": "Sample locations seeded successfully", "count": len(result.inserted_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
