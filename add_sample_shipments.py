import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone

async def add_sample_shipments():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['verification_db']
    
    # Sample shipments
    sample_shipments = [
        {
            "reference_id": "ORDER-2024-001",
            "shipment_number": "DHL00222844400010270837",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=DHL00222844400010270837",
            "label_url": "https://api-eu.dhl.com/parcel/de/shipping/v2/labels/DHL00222844400010270837",
            "status": "delivered",
            "sender_name": "TSR Technologies",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "receiver_name": "Max Mustermann",
            "receiver_city": "München",
            "receiver_postal_code": "80331",
            "receiver_country": "DE",
            "package_weight_grams": 2500,
            "service_type": "V01PAK",
            "package_description": "Elektronikkomponenten",
            "created_at": datetime.now(timezone.utc) - timedelta(days=5),
            "estimated_delivery": datetime.now(timezone.utc) - timedelta(days=3),
        },
        {
            "reference_id": "ORDER-2024-002",
            "shipment_number": "DHL00222844400010270838",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=DHL00222844400010270838",
            "label_url": "https://api-eu.dhl.com/parcel/de/shipping/v2/labels/DHL00222844400010270838",
            "status": "in_transit",
            "sender_name": "TSR Technologies",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "receiver_name": "Anna Schmidt",
            "receiver_city": "Hamburg",
            "receiver_postal_code": "20095",
            "receiver_country": "DE",
            "package_weight_grams": 1200,
            "service_type": "V01PAK",
            "package_description": "Büromaterial",
            "created_at": datetime.now(timezone.utc) - timedelta(days=2),
            "estimated_delivery": datetime.now(timezone.utc) + timedelta(days=1),
        },
        {
            "reference_id": "ORDER-2024-003",
            "shipment_number": "DHL00222844400010270839",
            "tracking_url": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=DHL00222844400010270839",
            "label_url": "https://api-eu.dhl.com/parcel/de/shipping/v2/labels/DHL00222844400010270839",
            "status": "created",
            "sender_name": "TSR Technologies",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "receiver_name": "Thomas Weber",
            "receiver_city": "Köln",
            "receiver_postal_code": "50667",
            "receiver_country": "DE",
            "package_weight_grams": 800,
            "service_type": "V01PAK",
            "package_description": "Dokumente",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=3),
            "estimated_delivery": datetime.now(timezone.utc) + timedelta(days=2),
        },
        {
            "reference_id": "ORDER-2024-004",
            "shipment_number": None,
            "tracking_url": None,
            "label_url": None,
            "status": "failed",
            "sender_name": "TSR Technologies",
            "sender_city": "Berlin",
            "sender_postal_code": "10115",
            "receiver_name": "Invalid Address",
            "receiver_city": "Unknown",
            "receiver_postal_code": "00000",
            "receiver_country": "DE",
            "package_weight_grams": 1500,
            "service_type": "V01PAK",
            "package_description": "Test Paket",
            "created_at": datetime.now(timezone.utc) - timedelta(days=1),
            "estimated_delivery": None,
            "error_message": "Address validation failed"
        },
    ]
    
    # Clear existing test data
    await db.dhl_shipments.delete_many({})
    print("🗑️  Alte Testdaten gelöscht")
    
    # Insert sample shipments
    result = await db.dhl_shipments.insert_many(sample_shipments)
    print(f"✅ {len(result.inserted_ids)} Test-Sendungen hinzugefügt!")
    
    # Show summary
    total = await db.dhl_shipments.count_documents({})
    delivered = await db.dhl_shipments.count_documents({"status": "delivered"})
    in_transit = await db.dhl_shipments.count_documents({"status": "in_transit"})
    created = await db.dhl_shipments.count_documents({"status": "created"})
    failed = await db.dhl_shipments.count_documents({"status": "failed"})
    
    print(f"\n📊 Zusammenfassung:")
    print(f"   Gesamt: {total}")
    print(f"   Zugestellt: {delivered}")
    print(f"   Unterwegs: {in_transit}")
    print(f"   Erstellt: {created}")
    print(f"   Fehlgeschlagen: {failed}")

if __name__ == "__main__":
    asyncio.run(add_sample_shipments())
