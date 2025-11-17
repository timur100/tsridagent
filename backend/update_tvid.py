"""
Script zum Aktualisieren von TeamViewer-IDs für Geräte
Liest TVID aus Textdateien und aktualisiert die Datenbank
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime, timezone
import re

async def update_tvid_for_device(device_id, tvid):
    """Aktualisiert die TVID für ein einzelnes Gerät"""
    
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL nicht gefunden!")
        return False
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    try:
        # Update das Gerät
        result = await db.europcar_devices.update_one(
            {"device_id": device_id},
            {
                "$set": {
                    "tvid": tvid,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count > 0:
            if result.modified_count > 0:
                print(f"✅ {device_id}: TVID {tvid} erfolgreich aktualisiert")
            else:
                print(f"ℹ️  {device_id}: TVID war bereits {tvid}")
            return True
        else:
            print(f"⚠️  {device_id}: Gerät nicht gefunden in Datenbank")
            return False
            
    except Exception as e:
        print(f"❌ Fehler bei {device_id}: {str(e)}")
        return False
    finally:
        client.close()

async def process_tvid_files(file_data_list):
    """
    Verarbeitet mehrere TVID-Dateien
    
    file_data_list: Liste von Dictionaries mit 'device_id' und 'tvid'
    Beispiel: [
        {'device_id': 'AAHC01-01', 'tvid': '949746162'},
        {'device_id': 'BERC01-01', 'tvid': '123456789'},
    ]
    """
    
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL nicht gefunden!")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    success_count = 0
    not_found_count = 0
    error_count = 0
    
    print(f"\n🔄 Starte Batch-Update für {len(file_data_list)} Geräte...\n")
    
    try:
        for item in file_data_list:
            device_id = item['device_id']
            tvid = item['tvid']
            
            try:
                result = await db.europcar_devices.update_one(
                    {"device_id": device_id},
                    {
                        "$set": {
                            "tvid": str(tvid),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                if result.matched_count > 0:
                    success_count += 1
                    print(f"✅ {device_id}: TVID {tvid}")
                else:
                    not_found_count += 1
                    print(f"⚠️  {device_id}: Nicht in DB gefunden")
                    
            except Exception as e:
                error_count += 1
                print(f"❌ {device_id}: Fehler - {str(e)}")
        
        print(f"\n{'='*60}")
        print(f"📊 Zusammenfassung:")
        print(f"   ✅ Erfolgreich aktualisiert: {success_count}")
        print(f"   ⚠️  Nicht gefunden: {not_found_count}")
        print(f"   ❌ Fehler: {error_count}")
        print(f"   📝 Gesamt verarbeitet: {len(file_data_list)}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Kritischer Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

def extract_tvid_from_content(content):
    """Extrahiert TeamViewer-ID aus Dateiinhalt"""
    # Suche nach Zahlenfolge (TeamViewer IDs sind typischerweise 9-10 Ziffern)
    matches = re.findall(r'\b\d{9,10}\b', content)
    if matches:
        return matches[0]
    return None

# Beispiel für einzelnes Update
async def test_single_update():
    """Test mit der ersten Datei"""
    await update_tvid_for_device('AAHC01-01', '949746162')

# Beispiel für Batch-Update
async def test_batch_update():
    """Test mit mehreren Dateien"""
    test_data = [
        {'device_id': 'AAHC01-01', 'tvid': '949746162'},
        # Weitere Einträge werden hier hinzugefügt wenn User mehr Dateien hochlädt
    ]
    await process_tvid_files(test_data)

if __name__ == "__main__":
    print("🔄 TeamViewer ID Update Tool")
    print("="*60)
    
    # Test mit einzelnem Gerät
    asyncio.run(test_single_update())
    
    print("\n✅ Test abgeschlossen!")
    print("\n💡 Für Batch-Verarbeitung von bis zu 200 Dateien:")
    print("   1. Erstelle eine Liste mit allen device_id und tvid Paaren")
    print("   2. Rufe process_tvid_files(liste) auf")
