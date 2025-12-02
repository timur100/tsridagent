#!/usr/bin/env python3
import csv
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import re

async def import_from_csv():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['verification_db']
    
    imported = 0
    skipped = 0
    errors = 0
    
    files = [
        ('dhl_export_1.csv', ';'),  # Semicolon delimiter
        ('dhl_export_2.csv', ';')
    ]
    
    for filename, delimiter in files:
        print(f"\n📄 Verarbeite {filename}...")
        
        try:
            with open(f'/app/{filename}', 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                
                for row in reader:
                    try:
                        # Extract shipment number - check different column names
                        shipment_number = None
                        
                        # Try different column names
                        if 'Sendungsnummer' in row and row['Sendungsnummer']:
                            shipment_number = row['Sendungsnummer'].strip()
                        elif 'SITEMS_IDENTCODE' in row and row['SITEMS_IDENTCODE']:
                            shipment_number = row['SITEMS_IDENTCODE'].strip()
                        
                        if not shipment_number or shipment_number == 'NULL':
                            continue
                        
                        # Check if already in database
                        existing = await db.dhl_shipments.find_one({"shipment_number": shipment_number})
                        if existing:
                            skipped += 1
                            continue
                        
                        # Extract data based on available columns
                        # File 1 format
                        if 'Empfänger Name 1' in row:
                            receiver_name = row.get('Empfänger Name 1', '').strip()
                            receiver_city = row.get('Empfänger Ort', '').strip()
                            receiver_postal_code = row.get('Empfänger PLZ', '').strip()
                            receiver_street = row.get('Empfänger Straße', '').strip()
                            receiver_country = row.get('Empfänger Land', 'DEU').strip()
                            sender_name = row.get('Absender Name 1', '').strip()
                            reference_id = row.get('Sendungsreferenz', shipment_number).strip()
                            weight_str = row.get('Gewicht', '0').replace(',', '.')
                            created_date_str = row.get('Sendungsdatum', '')
                        # File 2 format
                        else:
                            receiver_name = row.get('EmpName1', '').strip()
                            receiver_city = row.get('EmpOrt', '').strip()
                            receiver_postal_code = row.get('EmpPlz', '').strip()
                            receiver_street = row.get('EmpStrasse', '').strip()
                            receiver_country = row.get('EmpLandCode', 'DEU').strip()
                            sender_name = row.get('AbsName1', '').strip()
                            reference_id = row.get('EmpKundenNr', shipment_number).strip()
                            weight_str = row.get('SITEMS_GEWICHT', '0').replace(',', '.')
                            created_date_str = row.get('SITEMS_DATE', '')
                        
                        # Parse weight
                        try:
                            weight_kg = float(weight_str) if weight_str else 2.0
                            weight_grams = int(weight_kg * 1000)
                        except:
                            weight_grams = 2000
                        
                        # Parse date
                        try:
                            if created_date_str:
                                # Try different date formats
                                for fmt in ['%d.%m.%y', '%d.%m.%Y']:
                                    try:
                                        created_date = datetime.strptime(created_date_str, fmt)
                                        created_date = created_date.replace(tzinfo=timezone.utc)
                                        break
                                    except:
                                        continue
                                else:
                                    created_date = datetime.now(timezone.utc)
                            else:
                                created_date = datetime.now(timezone.utc)
                        except:
                            created_date = datetime.now(timezone.utc)
                        
                        # Create shipment record
                        shipment_record = {
                            "shipment_number": shipment_number,
                            "reference_id": reference_id or shipment_number,
                            "status": "imported",
                            "sender_name": sender_name or "TSR Technologies GmbH",
                            "sender_city": "Berlin",
                            "sender_postal_code": "10961",
                            "receiver_name": receiver_name or "Unbekannt",
                            "receiver_city": receiver_city or "",
                            "receiver_postal_code": receiver_postal_code or "",
                            "receiver_street": receiver_street or "",
                            "receiver_country": receiver_country or "DEU",
                            "package_weight_grams": weight_grams,
                            "service_type": "V01PAK",
                            "package_description": f"Import aus CSV - {reference_id}",
                            "tracking_url": f"https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={shipment_number}",
                            "created_at": created_date,
                            "imported_at": datetime.now(timezone.utc),
                            "import_source": "csv_export",
                        }
                        
                        await db.dhl_shipments.insert_one(shipment_record)
                        imported += 1
                        
                        if imported % 10 == 0:
                            print(f"  ✓ {imported} Sendungen importiert...")
                        
                    except Exception as e:
                        errors += 1
                        print(f"  ❌ Fehler bei Zeile: {str(e)}")
                        continue
        
        except Exception as e:
            print(f"  ❌ Fehler beim Lesen der Datei: {str(e)}")
            continue
    
    print(f"\n" + "="*60)
    print(f"📊 Import abgeschlossen!")
    print(f"="*60)
    print(f"✅ Importiert: {imported}")
    print(f"⏭️  Übersprungen (existieren bereits): {skipped}")
    print(f"❌ Fehler: {errors}")
    print(f"="*60)
    
    # Show statistics
    total = await db.dhl_shipments.count_documents({})
    print(f"\n📦 Gesamt Sendungen in Datenbank: {total}")

if __name__ == "__main__":
    asyncio.run(import_from_csv())
