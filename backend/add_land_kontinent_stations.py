"""
Script zum Hinzufügen von Land und Kontinent zu Standorten
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime, timezone

async def add_land_kontinent_to_stations():
    """Fügt Land und Kontinent zu allen Europcar Standorten hinzu"""
    
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL nicht gefunden!")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    try:
        # Update alle Standorte
        result = await db.europcar_stations.update_many(
            {},  # Alle Dokumente
            {
                "$set": {
                    "land": "Deutschland",
                    "kontinent": "Europa",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        print(f"✅ Erfolgreich {result.modified_count} Standorte aktualisiert")
        print(f"   Land: Deutschland")
        print(f"   Kontinent: Europa")
        
        # Überprüfung
        sample = await db.europcar_stations.find_one({"land": {"$exists": True}})
        if sample:
            print(f"\n📝 Beispiel:")
            print(f"  Station: {sample.get('stationsname')}")
            print(f"  Bundesland: {sample.get('bundesl')}")
            print(f"  Land: {sample.get('land')}")
            print(f"  Kontinent: {sample.get('kontinent')}")
        
    except Exception as e:
        print(f"❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    print("🔄 Füge Land und Kontinent hinzu...")
    asyncio.run(add_land_kontinent_to_stations())
    print("✅ Update abgeschlossen!")
