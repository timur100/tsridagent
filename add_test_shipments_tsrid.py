import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone

async def add_test_shipments():
    # Use the MONGO_URL from environment
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    # Sample shipments with proper structure
    test_shipments = [
        {
            "reference_id": "TEST-001",
            "shipment_number": "00340434161094015902",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=00340434161094015902",
            "status": "imported",
            "sender_name": "TSR Technologies GmbH",
            "sender_street": "Musterstraße",
            "sender_house_number": "123",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "sender_country": "DEU",
            "receiver_name": "Max Mustermann",
            "receiver_street": "Hauptstraße",
            "receiver_house_number": "45",
            "receiver_city": "München",
            "receiver_postal_code": "80331",
            "receiver_country": "DEU",
            "package_weight_grams": 2500,
            "package_length_cm": 30,
            "package_width_cm": 20,
            "package_height_cm": 15,
            "service_type": "V01PAK",
            "package_description": "Elektronikkomponenten",
            "created_at": datetime.now(timezone.utc) - timedelta(days=10),
            "delivered_at": datetime.now(timezone.utc) - timedelta(days=7),
            "estimated_delivery": datetime.now(timezone.utc) - timedelta(days=7),
            "imported_at": datetime.now(timezone.utc),
            "import_source": "manual_test"
        },
        {
            "reference_id": "TEST-002",
            "shipment_number": "00340434161094015903",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=00340434161094015903",
            "status": "imported",
            "sender_name": "TSR Technologies GmbH",
            "sender_street": "Musterstraße",
            "sender_house_number": "123",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "sender_country": "DEU",
            "receiver_name": "Anna Schmidt",
            "receiver_street": "Bahnhofstraße",
            "receiver_house_number": "78",
            "receiver_city": "Hamburg",
            "receiver_postal_code": "20095",
            "receiver_country": "DEU",
            "package_weight_grams": 1200,
            "package_length_cm": 25,
            "package_width_cm": 18,
            "package_height_cm": 10,
            "service_type": "V01PAK",
            "package_description": "Büromaterial",
            "created_at": datetime.now(timezone.utc) - timedelta(days=5),
            "delivered_at": None,
            "estimated_delivery": datetime.now(timezone.utc) + timedelta(days=2),
            "imported_at": datetime.now(timezone.utc),
            "import_source": "manual_test"
        },
        {
            "reference_id": "TEST-003",
            "shipment_number": "00340434161094015904",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=00340434161094015904",
            "status": "imported",
            "sender_name": "TSR Technologies GmbH",
            "sender_street": "Musterstraße",
            "sender_house_number": "123",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "sender_country": "DEU",
            "receiver_name": "Thomas Weber",
            "receiver_street": "Rheinufer",
            "receiver_house_number": "12",
            "receiver_city": "Köln",
            "receiver_postal_code": "50667",
            "receiver_country": "DEU",
            "package_weight_grams": 800,
            "package_length_cm": 20,
            "package_width_cm": 15,
            "package_height_cm": 8,
            "service_type": "V01PAK",
            "package_description": "Dokumente",
            "created_at": datetime.now(timezone.utc) - timedelta(days=3),
            "delivered_at": None,
            "estimated_delivery": datetime.now(timezone.utc) + timedelta(days=1),
            "imported_at": datetime.now(timezone.utc),
            "import_source": "manual_test"
        }
    ]
    
    # Insert test shipments
    result = await db.shipments.insert_many(test_shipments)
    print(f"✅ {len(result.inserted_ids)} Test-Sendungen hinzugefügt!")
    
    # Show summary
    total = await db.shipments.count_documents({})
    imported = await db.shipments.count_documents({"status": "imported"})
    
    print(f"\n📊 Zusammenfassung:")
    print(f"   Gesamt: {total}")
    print(f"   Importiert: {imported}")
    print(f"\n📦 Sendungsnummern zum Testen:")
    for shipment in test_shipments:
        print(f"   {shipment['shipment_number']} - {shipment['receiver_name']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_test_shipments())
