"""
Europcar Demo-Daten in MongoDB laden
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')

# Demo-Daten
VEHICLES = [
    {
        "id": "v1",
        "marke": "BMW",
        "modell": "3er",
        "baujahr": 2023,
        "vin": "WBAXG51050CN12345",
        "kennzeichen": "B-EC 2023",
        "status": "available",
        "kraftstoff": "Diesel",
        "getriebe": "Automatik",
        "kilometerstand": 12500,
        "tankstand": 85,
        "farbe": "Schwarz",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v2",
        "marke": "Mercedes",
        "modell": "C-Klasse",
        "baujahr": 2022,
        "vin": "WDD2050761F123456",
        "kennzeichen": "M-EC 5678",
        "status": "rented",
        "kraftstoff": "Benzin",
        "getriebe": "Automatik",
        "kilometerstand": 28000,
        "tankstand": 60,
        "farbe": "Silber",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v3",
        "marke": "Audi",
        "modell": "A4",
        "baujahr": 2023,
        "vin": "WAUZZZ8V8KA123789",
        "kennzeichen": "F-EC 9012",
        "status": "available",
        "kraftstoff": "Diesel",
        "getriebe": "Automatik",
        "kilometerstand": 8500,
        "tankstand": 95,
        "farbe": "Blau",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v4",
        "marke": "VW",
        "modell": "Passat",
        "baujahr": 2021,
        "vin": "WVWZZZ3CZMB123456",
        "kennzeichen": "HH-EC 3456",
        "status": "maintenance",
        "kraftstoff": "Diesel",
        "getriebe": "Manuell",
        "kilometerstand": 45000,
        "tankstand": 40,
        "farbe": "Grau",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v5",
        "marke": "BMW",
        "modell": "5er",
        "baujahr": 2022,
        "vin": "WBAXG71090CD98765",
        "kennzeichen": "B-EC 7890",
        "status": "rented",
        "kraftstoff": "Benzin",
        "getriebe": "Automatik",
        "kilometerstand": 22000,
        "tankstand": 70,
        "farbe": "Weiß",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v6",
        "marke": "Mercedes",
        "modell": "E-Klasse",
        "baujahr": 2023,
        "vin": "WDD2130451A234567",
        "kennzeichen": "M-EC 1234",
        "status": "available",
        "kraftstoff": "Benzin",
        "getriebe": "Automatik",
        "kilometerstand": 5000,
        "tankstand": 100,
        "farbe": "Schwarz",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v7",
        "marke": "Audi",
        "modell": "A6",
        "baujahr": 2021,
        "vin": "WAUZZZ4G2EN123456",
        "kennzeichen": "F-EC 5678",
        "status": "damaged",
        "kraftstoff": "Diesel",
        "getriebe": "Automatik",
        "kilometerstand": 38000,
        "tankstand": 55,
        "farbe": "Grau",
        "sitzplaetze": 5,
        "schaeden": [
            {"typ": "Kratzer", "beschreibung": "Kratzer an der Tür rechts"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v8",
        "marke": "VW",
        "modell": "Golf",
        "baujahr": 2023,
        "vin": "WVWZZZ1KZEW123456",
        "kennzeichen": "HH-EC 9012",
        "status": "reserved",
        "kraftstoff": "Benzin",
        "getriebe": "Manuell",
        "kilometerstand": 2000,
        "tankstand": 90,
        "farbe": "Rot",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v9",
        "marke": "BMW",
        "modell": "X5",
        "baujahr": 2022,
        "vin": "WBAXG91060CN56789",
        "kennzeichen": "B-EC 3456",
        "status": "available",
        "kraftstoff": "Diesel",
        "getriebe": "Automatik",
        "kilometerstand": 31000,
        "tankstand": 75,
        "farbe": "Schwarz",
        "sitzplaetze": 7,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "v10",
        "marke": "Mercedes",
        "modell": "GLC",
        "baujahr": 2023,
        "vin": "WDD2530131F234567",
        "kennzeichen": "M-EC 7890",
        "status": "rented",
        "kraftstoff": "Benzin",
        "getriebe": "Automatik",
        "kilometerstand": 15000,
        "tankstand": 65,
        "farbe": "Blau",
        "sitzplaetze": 5,
        "schaeden": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
]


async def seed_data():
    """Lade Demo-Daten in MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.tsrid_db
    
    print("🚗 Starte Europcar Demo-Daten Import...")
    
    # Lösche bestehende Daten
    print("  Lösche bestehende Fahrzeug-Daten...")
    await db.europcar_vehicles.delete_many({})
    
    # Füge Fahrzeuge hinzu
    print(f"  Füge {len(VEHICLES)} Fahrzeuge hinzu...")
    await db.europcar_vehicles.insert_many(VEHICLES)
    
    # Prüfe Ergebnis
    count = await db.europcar_vehicles.count_documents({})
    print(f"✅ {count} Fahrzeuge erfolgreich in DB geladen!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
