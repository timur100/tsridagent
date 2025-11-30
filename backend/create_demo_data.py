"""
Demo-Daten für Europcar PKW-Vermietungssystem
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import random
import os

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db

async def create_demo_data():
    print("🚀 Erstelle Demo-Daten für Europcar PKW-Vermietungssystem...\n")
    
    # 1. Station erstellen
    print("📍 Erstelle Stationen...")
    station_id = str(uuid4())
    station = {
        "id": station_id,
        "name": "Europcar München Hauptbahnhof",
        "adresse": "Bayerstraße 10a",
        "stadt": "München",
        "plz": "80335",
        "land": "Deutschland",
        "telefon": "+49 89 12345678",
        "email": "muenchen@europcar.de",
        "oeffnungszeiten": {
            "montag": "08:00-18:00",
            "dienstag": "08:00-18:00",
            "mittwoch": "08:00-18:00",
            "donnerstag": "08:00-18:00",
            "freitag": "08:00-18:00",
            "samstag": "09:00-14:00",
            "sonntag": "Geschlossen"
        },
        "kapazitaet": 50,
        "status": "active",
        "lat": 48.1408,
        "lng": 11.5582,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.europcar_stations.insert_one(station)
    print(f"✅ Station erstellt: {station['name']}")
    
    # 2. Fahrzeuge erstellen
    print("\n🚗 Erstelle Fahrzeuge...")
    vehicles = [
        {
            "marke": "VW", "modell": "Golf", "baujahr": 2023, "kraftstoff": "benzin", 
            "getriebe": "manual", "kategorie": "compact"
        },
        {
            "marke": "BMW", "modell": "3er", "baujahr": 2024, "kraftstoff": "diesel",
            "getriebe": "automatic", "kategorie": "sedan"
        },
        {
            "marke": "Mercedes", "modell": "C-Klasse", "baujahr": 2023, "kraftstoff": "hybrid",
            "getriebe": "automatic", "kategorie": "sedan"
        },
        {
            "marke": "Tesla", "modell": "Model 3", "baujahr": 2024, "kraftstoff": "elektro",
            "getriebe": "automatic", "kategorie": "electric"
        },
        {
            "marke": "Audi", "modell": "Q5", "baujahr": 2023, "kraftstoff": "diesel",
            "getriebe": "automatic", "kategorie": "suv"
        },
        {
            "marke": "VW", "modell": "Polo", "baujahr": 2022, "kraftstoff": "benzin",
            "getriebe": "manual", "kategorie": "compact"
        },
        {
            "marke": "BMW", "modell": "X5", "baujahr": 2024, "kraftstoff": "diesel",
            "getriebe": "automatic", "kategorie": "suv"
        },
        {
            "marke": "Mercedes", "modell": "E-Klasse", "baujahr": 2024, "kraftstoff": "hybrid",
            "getriebe": "automatic", "kategorie": "luxury"
        },
    ]
    
    vehicle_ids = []
    for idx, v in enumerate(vehicles):
        vehicle_id = str(uuid4())
        vehicle_ids.append(vehicle_id)
        
        vehicle = {
            "id": vehicle_id,
            "marke": v["marke"],
            "modell": v["modell"],
            "baujahr": v["baujahr"],
            "kraftstoff": v["kraftstoff"],
            "getriebe": v["getriebe"],
            "vin": f"WVW{random.randint(100000, 999999)}",
            "kennzeichen": f"M-EC-{1000 + idx}",
            "zulassung": "2023-01-15",
            "kilometerstand": random.randint(5000, 50000),
            "tankstand": random.randint(70, 100),
            "status": random.choice(["available", "available", "available", "rented"]),
            "verfuegbar": random.choice([True, True, True, False]),
            "wartungsintervall_km": 15000,
            "naechste_wartung_km": random.randint(60000, 80000),
            "reifenstatus": random.choice(["summer", "winter"]),
            "schaeden": [],
            "wartungshistorie": [],
            "gps_tracker_id": f"GPS-{vehicle_id[:8]}",
            "letzter_standort": {"lat": 48.1351, "lng": 11.5820},
            "versicherungsstatus": "aktiv",
            "leasing_oder_besitz": "besitz",
            "zusatzausstattung": random.sample(["GPS", "Kindersitz", "Winterreifen", "Navi"], k=2),
            "station_id": station_id,
            "batterie_kapazitaet": 75 if v["kraftstoff"] == "elektro" else None,
            "ladestand": random.randint(80, 100) if v["kraftstoff"] == "elektro" else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_vehicles.insert_one(vehicle)
        print(f"✅ Fahrzeug erstellt: {v['marke']} {v['modell']} ({vehicle['kennzeichen']})")
    
    # 3. Kunden erstellen
    print("\n👥 Erstelle Kunden...")
    customers = [
        {"vorname": "Max", "nachname": "Müller", "email": "max.mueller@example.com", "type": "private"},
        {"vorname": "Anna", "nachname": "Schmidt", "email": "anna.schmidt@example.com", "type": "private"},
        {"vorname": "Thomas", "nachname": "Weber", "email": "thomas.weber@example.com", "type": "private"},
        {"vorname": "BMW AG", "nachname": "Geschäftskunde", "email": "fleet@bmw.com", "type": "business", "firma": "BMW AG"},
        {"vorname": "Lisa", "nachname": "Wagner", "email": "lisa.wagner@example.com", "type": "private"},
    ]
    
    customer_ids = []
    for c in customers:
        customer_id = str(uuid4())
        customer_ids.append(customer_id)
        
        customer = {
            "id": customer_id,
            "customer_type": c["type"],
            "vorname": c["vorname"],
            "nachname": c["nachname"],
            "email": c["email"],
            "telefon": f"+49 89 {random.randint(10000000, 99999999)}",
            "geburtsdatum": "1990-05-15",
            "strasse": f"Beispielstraße {random.randint(1, 100)}",
            "plz": "80331",
            "stadt": "München",
            "land": "Deutschland",
            "ausweis_nummer": f"D{random.randint(100000000, 999999999)}",
            "ausweis_typ": "personalausweis",
            "ausweis_ablaufdatum": "2030-12-31",
            "fuehrerschein": {
                "nummer": f"FS{random.randint(1000000, 9999999)}",
                "ausstellungsort": "München",
                "ausstellungsdatum": "2015-03-20",
                "ablaufdatum": "2035-03-20",
                "klassen": ["B", "BE"],
                "gueltig": True
            },
            "zahlungsmittel": [],
            "firma": c.get("firma"),
            "blacklist": False,
            "fraud_score": 0,
            "kundengruppe": "premium" if c["type"] == "business" else "standard",
            "rabatt_prozent": 10 if c["type"] == "business" else 0,
            "newsletter_opt_in": True,
            "ausweis_verifiziert": True,
            "ausweis_verifiziert_am": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_customers.insert_one(customer)
        print(f"✅ Kunde erstellt: {c['vorname']} {c['nachname']}")
    
    # 4. Reservierungen erstellen
    print("\n📅 Erstelle Reservierungen...")
    for i in range(10):
        reservation_id = str(uuid4())
        
        start_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30))
        end_date = start_date + timedelta(days=random.randint(1, 14))
        days = (end_date - start_date).days + 1
        
        base_price = days * random.uniform(40, 80)
        additional_price = random.uniform(0, 50)
        total_price = base_price + additional_price
        
        reservation = {
            "id": reservation_id,
            "customer_id": random.choice(customer_ids),
            "vehicle_id": random.choice(vehicle_ids),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "start_station_id": station_id,
            "end_station_id": station_id,
            "base_price": round(base_price, 2),
            "additional_options_price": round(additional_price, 2),
            "total_price": round(total_price, 2),
            "optionen": {
                "gps": random.choice([True, False]),
                "kindersitz": random.randint(0, 2),
                "versicherungspaket": random.choice([None, "basic", "premium"]),
                "zusatzfahrer": random.randint(0, 1),
                "lte_hotspot": False,
                "tablet_scanner": False
            },
            "status": random.choice(["completed", "completed", "active", "confirmed"]),
            "buchungstyp": random.choice(["online", "telefon", "counter"]),
            "created_at": start_date.isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "demo-system"
        }
        await db.europcar_reservations.insert_one(reservation)
    print(f"✅ 10 Reservierungen erstellt")
    
    # 5. Einige Verträge & Rückgaben
    print("\n📄 Erstelle Verträge und Rückgaben...")
    completed_reservations = await db.europcar_reservations.find(
        {"status": "completed"}, {"_id": 0}
    ).limit(3).to_list(3)
    
    for res in completed_reservations:
        # Contract
        contract_id = str(uuid4())
        contract = {
            "id": contract_id,
            "reservation_id": res["id"],
            "customer_id": res["customer_id"],
            "vehicle_id": res["vehicle_id"],
            "uebergabe_datum": res["start_date"],
            "uebergabe_station_id": res["start_station_id"],
            "uebergabe_mitarbeiter_id": "demo-staff",
            "uebergabe_kilometerstand": random.randint(10000, 50000),
            "uebergabe_tankstand": 100,
            "uebergabe_zustand": [],
            "uebergabe_fotos": [],
            "status": "completed",
            "unterschrift_kunde": "demo-signature",
            "unterschrift_datum": res["start_date"],
            "created_at": res["start_date"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_contracts.insert_one(contract)
        
        # Return
        return_id = str(uuid4())
        vehicle_return = {
            "id": return_id,
            "contract_id": contract_id,
            "reservation_id": res["id"],
            "customer_id": res["customer_id"],
            "vehicle_id": res["vehicle_id"],
            "rueckgabe_datum": res["end_date"],
            "rueckgabe_station_id": res["end_station_id"],
            "rueckgabe_mitarbeiter_id": "demo-staff",
            "rueckgabe_kilometerstand": contract["uebergabe_kilometerstand"] + random.randint(100, 1000),
            "rueckgabe_tankstand": random.randint(80, 100),
            "neue_schaeden": [],
            "schadenfotos": [],
            "zusaetzliche_gebuehren": [],
            "gesamtbetrag_zusatzkosten": 0.0,
            "reinigung_erforderlich": False,
            "fahrzeug_bereit": True,
            "created_at": res["end_date"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_returns.insert_one(vehicle_return)
    
    print(f"✅ {len(completed_reservations)} Verträge und Rückgaben erstellt")
    
    # 6. Einige Schäden
    print("\n⚠️ Erstelle Schadensberichte...")
    for i in range(3):
        damage_id = str(uuid4())
        damage = {
            "id": damage_id,
            "vehicle_id": random.choice(vehicle_ids),
            "reported_by": "demo-staff",
            "reported_at": datetime.now(timezone.utc).isoformat(),
            "damage_type": random.choice(["scratch", "dent", "broken"]),
            "severity": random.choice(["minor", "moderate"]),
            "location": random.choice(["front", "back", "left", "right"]),
            "description": "Demo-Schaden für Testing",
            "images": [],
            "estimated_repair_cost": random.uniform(100, 500),
            "repair_status": random.choice(["pending", "approved", "completed"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.europcar_damage_reports.insert_one(damage)
    print(f"✅ 3 Schadensberichte erstellt")
    
    print("\n" + "="*60)
    print("🎉 Demo-Daten erfolgreich erstellt!")
    print("="*60)
    print(f"\n📊 Zusammenfassung:")
    print(f"   • 1 Station")
    print(f"   • {len(vehicles)} Fahrzeuge")
    print(f"   • {len(customers)} Kunden")
    print(f"   • 10 Reservierungen")
    print(f"   • {len(completed_reservations)} Verträge & Rückgaben")
    print(f"   • 3 Schadensberichte")
    print(f"\n✅ Das Analytics Dashboard sollte jetzt Daten anzeigen!")

if __name__ == "__main__":
    asyncio.run(create_demo_data())
