"""
Fleet Management System
Umfassendes Flottenmanagement mit GPS-Tracking, Routenplanung, Kraftstoffverbrauch und Fahrtenbuch
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
import random
from routes.portal_auth import verify_token

router = APIRouter()

# Mock-Daten Generator
def generate_mock_fleet_data(tenant_id: str):
    """Generiert Mock-Flottendaten für Autovermietung (Europcar-spezifisch)"""
    
    # Fahrzeugtypen für Autovermietung
    vehicle_types = [
        {"type": "Kleinwagen", "models": ["VW Polo", "Opel Corsa", "Renault Clio", "Ford Fiesta"]},
        {"type": "Kompaktklasse", "models": ["VW Golf", "Audi A3", "Mercedes A-Klasse", "BMW 1er"]},
        {"type": "Mittelklasse", "models": ["VW Passat", "Audi A4", "Mercedes C-Klasse", "BMW 3er"]},
        {"type": "Oberklasse", "models": ["Audi A6", "Mercedes E-Klasse", "BMW 5er"]},
        {"type": "SUV", "models": ["VW Tiguan", "Audi Q5", "Mercedes GLC", "BMW X3"]},
        {"type": "Transporter", "models": ["Mercedes Sprinter", "VW Crafter", "Ford Transit"]},
    ]
    
    # Europcar Standorte (mehrere pro Stadt)
    locations = [
        {"location_id": "berlin-tegel", "city": "Berlin", "name": "Berlin Flughafen Tegel", "address": "Flughafen Tegel, 13405 Berlin", "lat": 52.5540, "lon": 13.2889},
        {"location_id": "berlin-hbf", "city": "Berlin", "name": "Berlin Hauptbahnhof", "address": "Europaplatz 1, 10557 Berlin", "lat": 52.5250, "lon": 13.3690},
        {"location_id": "hamburg-airport", "city": "Hamburg", "name": "Hamburg Flughafen", "address": "Flughafenstraße, 22335 Hamburg", "lat": 53.6304, "lon": 9.9882},
        {"location_id": "hamburg-hbf", "city": "Hamburg", "name": "Hamburg Hauptbahnhof", "address": "Hachmannplatz 16, 20099 Hamburg", "lat": 53.5530, "lon": 10.0067},
        {"location_id": "muenchen-airport", "city": "München", "name": "München Flughafen", "address": "Nordallee 25, 85356 München", "lat": 48.3537, "lon": 11.7750},
        {"location_id": "muenchen-hbf", "city": "München", "name": "München Hauptbahnhof", "address": "Bayerstraße 10A, 80335 München", "lat": 48.1402, "lon": 11.5583},
        {"location_id": "frankfurt-airport", "city": "Frankfurt", "name": "Frankfurt Flughafen", "address": "Hugo-Eckener-Ring, 60549 Frankfurt", "lat": 50.0379, "lon": 8.5622},
        {"location_id": "stuttgart-airport", "city": "Stuttgart", "name": "Stuttgart Flughafen", "address": "Flughafenstraße 32, 70629 Stuttgart", "lat": 48.6899, "lon": 9.2219},
        {"location_id": "koeln-bonn-airport", "city": "Köln", "name": "Köln/Bonn Flughafen", "address": "Kennedystraße, 51147 Köln", "lat": 50.8659, "lon": 7.1427},
        {"location_id": "duesseldorf-airport", "city": "Düsseldorf", "name": "Düsseldorf Flughafen", "address": "Flughafenstraße 120, 40474 Düsseldorf", "lat": 51.2895, "lon": 6.7668},
    ]
    
    vehicles = []
    rentals = []  # Mietvorgänge statt trips
    fuel_records = []
    damage_reports = []
    
    # Generiere 15-20 Fahrzeuge pro Tenant (Europcar Flotte)
    num_vehicles = random.randint(15, 20)
    
    for i in range(num_vehicles):
        vehicle_cat = random.choice(vehicle_types)
        model = random.choice(vehicle_cat["models"])
        
        # Kennzeichen generieren
        prefixes = ["B", "HH", "M", "K", "F", "S", "D", "DO", "E"]
        plate = f"{random.choice(prefixes)}-EC-{random.randint(1000, 9999)}"  # EC für Europcar
        
        # Zugewiesener Standort (Heimatstandort)
        home_location = random.choice(locations)
        
        # Aktueller Standort (könnte anders sein wenn vermietet)
        is_rented = random.random() < 0.4  # 40% sind aktuell vermietet
        
        if is_rented:
            current_loc = random.choice(locations)
            status = "rented"
        else:
            current_loc = home_location
            status = random.choice(["available", "maintenance", "cleaning"])
        
        # km-Stand und km-Limit
        initial_km = random.randint(5000, 15000)  # Neu gekauft
        current_km = initial_km + random.randint(5000, 80000)
        km_limit = random.choice([100000, 120000, 150000])  # Verkauf bei diesem km-Stand
        
        # Fahrzeug erstellen
        vehicle = {
            "vehicle_id": f"VEH-{tenant_id}-EC{i+1:04d}",
            "tenant_id": tenant_id,
            "license_plate": plate,
            "type": vehicle_cat["type"],
            "model": model,
            "year": random.randint(2020, 2024),
            "status": status,
            "home_location": {
                "location_id": home_location["location_id"],
                "name": home_location["name"],
                "city": home_location["city"],
                "address": home_location["address"],
                "lat": home_location["lat"],
                "lon": home_location["lon"]
            },
            "current_location": {
                "location_id": current_loc["location_id"],
                "name": current_loc["name"],
                "city": current_loc["city"],
                "address": current_loc["address"],
                "lat": current_loc["lat"],
                "lon": current_loc["lon"],
                "timestamp": datetime.now().isoformat()
            },
            "odometer": current_km,
            "initial_odometer": initial_km,
            "km_limit": km_limit,
            "km_until_limit": km_limit - current_km,
            "km_limit_percentage": round((current_km / km_limit) * 100, 1),
            "fuel_level": random.randint(30, 95) if status != "maintenance" else 20,
            "current_rental": None,  # Wird unten gesetzt wenn vermietet
            "total_rentals": random.randint(50, 300),
            "last_maintenance": (datetime.now() - timedelta(days=random.randint(10, 60))).isoformat(),
            "next_maintenance_due": (datetime.now() + timedelta(days=random.randint(30, 90))).isoformat(),
            "insurance_expires": (datetime.now() + timedelta(days=random.randint(180, 365))).isoformat(),
            "tuev_expires": (datetime.now() + timedelta(days=random.randint(200, 700))).isoformat(),
        }
        
        vehicles.append(vehicle)
        
        # Generiere Mietvorgänge für letzten Monat
        num_rentals = random.randint(5, 15)
        for j in range(num_rentals):
            pickup_loc = random.choice(locations)
            return_loc = random.choice(locations)  # Kann gleich oder anders sein
            
            # Mietdauer 1-14 Tage
            rental_days = random.randint(1, 14)
            rental_start = datetime.now() - timedelta(days=random.randint(1, 60))
            rental_end = rental_start + timedelta(days=rental_days)
            
            # km bei Übergabe und Rückgabe
            pickup_km = vehicle["initial_odometer"] + random.randint(0, current_km - vehicle["initial_odometer"] - 500)
            km_driven = random.randint(50, 500 * rental_days)
            return_km = pickup_km + km_driven
            
            # Tankfüllung
            pickup_fuel = random.randint(85, 100)
            return_fuel = random.randint(10, 95)
            
            # Mieter-Daten
            customer_names = [
                "Michael Schneider", "Sarah Weber", "Thomas Becker", "Julia Fischer",
                "Daniel Koch", "Laura Meyer", "Christian Wolf", "Anna Zimmermann",
                "Markus Hoffmann", "Sophie Schäfer", "Jan Richter", "Maria Klein"
            ]
            
            # Schäden
            has_damage = random.random() < 0.15  # 15% haben Schäden
            
            rental = {
                "rental_id": f"RENT-{tenant_id}-{i+1:03d}-{j+1:04d}",
                "vehicle_id": vehicle["vehicle_id"],
                "tenant_id": tenant_id,
                "customer_name": random.choice(customer_names),
                "customer_id": f"CUST-{random.randint(10000, 99999)}",
                "booking_reference": f"EC{random.randint(100000, 999999)}",
                "pickup_time": rental_start.isoformat(),
                "return_time": rental_end.isoformat() if rental_end < datetime.now() else None,
                "rental_days": rental_days,
                "pickup_location": pickup_loc,
                "return_location": return_loc,
                "pickup_odometer": pickup_km,
                "return_odometer": return_km if rental_end < datetime.now() else None,
                "km_driven": km_driven if rental_end < datetime.now() else None,
                "pickup_fuel_level": pickup_fuel,
                "return_fuel_level": return_fuel if rental_end < datetime.now() else None,
                "status": "completed" if rental_end < datetime.now() else "active",
                "daily_rate": round(random.uniform(45, 150), 2),
                "total_cost": round(random.uniform(45, 150) * rental_days, 2),
                "has_damage": has_damage if rental_end < datetime.now() else False,
                "damage_report_id": f"DMG-{random.randint(1000, 9999)}" if has_damage and rental_end < datetime.now() else None,
                "pre_existing_damages": random.randint(0, 3),
                "insurance_type": random.choice(["Basic", "Premium", "Vollkasko"]),
            }
            
            rentals.append(rental)
            
            # Schadensmeldung erstellen wenn Schaden vorhanden
            if has_damage and rental_end < datetime.now():
                damage_types = [
                    "Kratzer an der Stoßstange", "Delle in der Tür", "Steinschlag Windschutzscheibe",
                    "Kratzer am Kotflügel", "Beschädigte Felge", "Innenraum verschmutzt"
                ]
                
                damage = {
                    "damage_id": rental["damage_report_id"],
                    "rental_id": rental["rental_id"],
                    "vehicle_id": vehicle["vehicle_id"],
                    "tenant_id": tenant_id,
                    "reported_at": rental_end.isoformat(),
                    "damage_type": random.choice(damage_types),
                    "severity": random.choice(["minor", "moderate", "severe"]),
                    "estimated_cost": round(random.uniform(100, 2500), 2),
                    "reported_by": "Station Staff",
                    "customer_liable": random.choice([True, False]),
                    "insurance_claim": random.choice([True, False]),
                    "repair_status": random.choice(["pending", "in_progress", "completed"]),
                }
                
                damage_reports.append(damage)
            
            # Tankvorgang nach 3-5 Fahrten
            if j % random.randint(3, 5) == 0:
                fuel_record = {
                    "fuel_id": f"FUEL-{tenant_id}-{i+1:03d}-{len(fuel_records)+1:04d}",
                    "vehicle_id": vehicle["vehicle_id"],
                    "tenant_id": tenant_id,
                    "timestamp": (trip_date + timedelta(hours=2)).isoformat(),
                    "location": random.choice(locations)["city"],
                    "liters": round(random.uniform(30, 80), 2),
                    "cost_per_liter": round(random.uniform(1.65, 1.95), 3),
                    "total_cost": 0,  # wird berechnet
                    "odometer_reading": vehicle["odometer"] - random.randint(100, 1000),
                    "card_type": random.choice(["DKV", "Shell", "Aral", "Privat"]),
                    "card_last4": f"{random.randint(1000, 9999)}",
                    "fuel_type": random.choice(["Diesel", "Benzin", "Super Plus", "AdBlue"]),
                    "suspicious": random.random() < 0.05,  # 5% verdächtige Transaktionen
                }
                fuel_record["total_cost"] = round(fuel_record["liters"] * fuel_record["cost_per_liter"], 2)
                fuel_records.append(fuel_record)
    
    # Setze aktuelle Mietvorgänge für vermietete Fahrzeuge
    active_rentals = [r for r in rentals if r["status"] == "active"]
    for vehicle in vehicles:
        if vehicle["status"] == "rented":
            matching_rentals = [r for r in active_rentals if r["vehicle_id"] == vehicle["vehicle_id"]]
            if matching_rentals:
                vehicle["current_rental"] = matching_rentals[0]
    
    return {
        "vehicles": vehicles,
        "rentals": rentals,  # Mietvorgänge statt trips
        "fuel_records": fuel_records,
        "damage_reports": damage_reports,
        "generated_at": datetime.now().isoformat()
    }

# In-Memory Store für Mock-Daten
fleet_data_store = {}

@router.get("/fleet/{tenant_id}/locations")
async def get_fleet_locations(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Hole alle Standorte mit Flotteninformationen (mehrere pro Stadt möglich)"""
    
    # Generiere Mock-Daten wenn nicht vorhanden
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    vehicles = fleet_data_store[tenant_id]["vehicles"]
    
    # Gruppiere Fahrzeuge nach Heimat-Standort (home_location.location_id)
    location_map = {}
    for vehicle in vehicles:
        loc_id = vehicle["home_location"]["location_id"]
        if loc_id not in location_map:
            location_map[loc_id] = {
                "location_id": vehicle["home_location"]["location_id"],
                "location_name": vehicle["home_location"]["name"],
                "city": vehicle["home_location"]["city"],
                "address": vehicle["home_location"]["address"],
                "vehicles": []
            }
        location_map[loc_id]["vehicles"].append(vehicle)
    
    # Erstelle Standort-Übersicht
    locations = []
    for loc_id, loc_data in location_map.items():
        locations.append({
            "location_id": loc_data["location_id"],
            "location_name": loc_data["location_name"],
            "city": loc_data["city"],
            "address": loc_data["address"],
            "vehicle_count": len(loc_data["vehicles"]),
            "available_vehicles": len([v for v in loc_data["vehicles"] if v["status"] == "available"]),
            "rented_vehicles": len([v for v in loc_data["vehicles"] if v["status"] == "rented"])
        })
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "locations": sorted(locations, key=lambda x: (x["city"], x["location_name"])),
        "total": len(locations)
    }

@router.get("/fleet/{tenant_id}/vehicles")
async def get_fleet_vehicles(
    tenant_id: str,
    location: Optional[str] = None,
    status: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Hole alle Fahrzeuge eines Tenants"""
    
    # Generiere Mock-Daten wenn nicht vorhanden
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    vehicles = fleet_data_store[tenant_id]["vehicles"]
    
    # Filter nach Standort
    if location and location != "all":
        vehicles = [v for v in vehicles if v["current_location"]["city"].lower().replace(" ", "-") == location]
    
    # Filter nach Status
    if status:
        vehicles = [v for v in vehicles if v["status"] == status]
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "location": location,
        "vehicles": vehicles,
        "total": len(vehicles)
    }

@router.get("/fleet/{tenant_id}/rentals")
async def get_fleet_rentals(
    tenant_id: str,
    location: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    token_data: dict = Depends(verify_token)
):
    """Hole Mietvorgänge eines Tenants"""
    
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    rentals = fleet_data_store[tenant_id]["rentals"]
    vehicles = fleet_data_store[tenant_id]["vehicles"]
    
    # Filter nach Standort (über Fahrzeug-Heimatstandort)
    if location and location != "all":
        location_vehicle_ids = [v["vehicle_id"] for v in vehicles if v["home_location"]["location_id"] == location]
        rentals = [r for r in rentals if r["vehicle_id"] in location_vehicle_ids]
    
    # Filter
    if vehicle_id:
        rentals = [r for r in rentals if r["vehicle_id"] == vehicle_id]
    
    if status:
        rentals = [r for r in rentals if r["status"] == status]
    
    if start_date:
        rentals = [r for r in rentals if r["pickup_time"] >= start_date]
    
    if end_date:
        rentals = [r for r in rentals if r["pickup_time"] <= end_date]
    
    # Sortiere nach Datum absteigend
    rentals = sorted(rentals, key=lambda x: x["pickup_time"], reverse=True)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "location": location,
        "rentals": rentals[:limit],
        "total": len(rentals)
    }

@router.get("/fleet/{tenant_id}/vehicle/{vehicle_id}/rental-history")
async def get_vehicle_rental_history(
    tenant_id: str,
    vehicle_id: str,
    token_data: dict = Depends(verify_token)
):
    """Hole komplette Miet-Historie eines Fahrzeugs (Lifecycle)"""
    
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    rentals = fleet_data_store[tenant_id]["rentals"]
    vehicle_rentals = [r for r in rentals if r["vehicle_id"] == vehicle_id]
    
    # Sortiere chronologisch
    vehicle_rentals = sorted(vehicle_rentals, key=lambda x: x["pickup_time"])
    
    # Berechne Lifecycle-Statistiken
    total_km = sum(r["km_driven"] for r in vehicle_rentals if r["km_driven"])
    total_rentals = len(vehicle_rentals)
    damage_count = len([r for r in vehicle_rentals if r["has_damage"]])
    
    return {
        "success": True,
        "vehicle_id": vehicle_id,
        "rental_history": vehicle_rentals,
        "statistics": {
            "total_rentals": total_rentals,
            "total_km_rented": total_km,
            "damage_count": damage_count,
            "damage_rate": round((damage_count / total_rentals * 100), 1) if total_rentals > 0 else 0
        }
    }

@router.get("/fleet/{tenant_id}/damages")
async def get_damage_reports(
    tenant_id: str,
    location: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    severity: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Hole Schadensmeldungen"""
    
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    damages = fleet_data_store[tenant_id]["damage_reports"]
    vehicles = fleet_data_store[tenant_id]["vehicles"]
    
    # Filter nach Standort
    if location and location != "all":
        location_vehicle_ids = [v["vehicle_id"] for v in vehicles if v["home_location"]["location_id"] == location]
        damages = [d for d in damages if d["vehicle_id"] in location_vehicle_ids]
    
    if vehicle_id:
        damages = [d for d in damages if d["vehicle_id"] == vehicle_id]
    
    if severity:
        damages = [d for d in damages if d["severity"] == severity]
    
    # Sortiere nach Datum absteigend
    damages = sorted(damages, key=lambda x: x["reported_at"], reverse=True)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "location": location,
        "damages": damages,
        "total": len(damages),
        "total_estimated_cost": sum(d["estimated_cost"] for d in damages)
    }

@router.get("/fleet/{tenant_id}/fuel")
async def get_fuel_records(
    tenant_id: str,
    location: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    suspicious_only: bool = False,
    token_data: dict = Depends(verify_token)
):
    """Hole Tankdaten"""
    
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    fuel_records = fleet_data_store[tenant_id]["fuel_records"]
    vehicles = fleet_data_store[tenant_id]["vehicles"]
    
    # Filter nach Standort
    if location and location != "all":
        location_vehicle_ids = [v["vehicle_id"] for v in vehicles if v["current_location"]["city"].lower().replace(" ", "-") == location]
        fuel_records = [f for f in fuel_records if f["vehicle_id"] in location_vehicle_ids]
    
    if vehicle_id:
        fuel_records = [f for f in fuel_records if f["vehicle_id"] == vehicle_id]
    
    if suspicious_only:
        fuel_records = [f for f in fuel_records if f.get("suspicious", False)]
    
    # Sortiere nach Datum absteigend
    fuel_records = sorted(fuel_records, key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "location": location,
        "fuel_records": fuel_records,
        "total": len(fuel_records),
        "total_cost": sum(f["total_cost"] for f in fuel_records),
        "suspicious_count": len([f for f in fuel_records if f.get("suspicious", False)])
    }

@router.get("/fleet/{tenant_id}/statistics")
async def get_fleet_statistics(
    tenant_id: str,
    location: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Hole Flottenstatistiken"""
    
    if tenant_id not in fleet_data_store:
        fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    data = fleet_data_store[tenant_id]
    all_vehicles = data["vehicles"]
    all_trips = data["trips"]
    all_fuel_records = data["fuel_records"]
    
    # Filter nach Standort
    if location and location != "all":
        vehicles = [v for v in all_vehicles if v["current_location"]["city"].lower().replace(" ", "-") == location]
        location_vehicle_ids = [v["vehicle_id"] for v in vehicles]
        trips = [t for t in all_trips if t["vehicle_id"] in location_vehicle_ids]
        fuel_records = [f for f in all_fuel_records if f["vehicle_id"] in location_vehicle_ids]
    else:
        vehicles = all_vehicles
        trips = all_trips
        fuel_records = all_fuel_records
    
    # Berechne Statistiken
    total_distance = sum(t["distance_km"] for t in trips)
    total_fuel_cost = sum(f["total_cost"] for f in fuel_records)
    total_fuel_liters = sum(f["liters"] for f in fuel_records)
    
    avg_fuel_consumption = (total_fuel_liters / total_distance * 100) if total_distance > 0 else 0
    
    # Fahrzeug-Status
    status_counts = {}
    for v in vehicles:
        status = v["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Durchschnittlicher Eco-Score
    avg_eco_score = sum(t["eco_score"] for t in trips) / len(trips) if trips else 0
    
    # CO2-Emissionen (grobe Schätzung: 2.65kg CO2 pro Liter Diesel/Benzin)
    total_co2_kg = total_fuel_liters * 2.65
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "location": location,
        "statistics": {
            "total_vehicles": len(vehicles),
            "active_vehicles": status_counts.get("driving", 0) + status_counts.get("idle", 0),
            "parked_vehicles": status_counts.get("parked", 0),
            "maintenance_vehicles": status_counts.get("maintenance", 0),
            "total_trips_30d": len(trips),
            "total_distance_km": round(total_distance, 1),
            "total_fuel_cost": round(total_fuel_cost, 2),
            "total_fuel_liters": round(total_fuel_liters, 1),
            "avg_fuel_consumption_per_100km": round(avg_fuel_consumption, 2),
            "avg_eco_score": round(avg_eco_score, 1),
            "total_co2_emissions_kg": round(total_co2_kg, 1),
            "cost_per_km": round(total_fuel_cost / total_distance, 3) if total_distance > 0 else 0,
            "suspicious_fuel_transactions": len([f for f in fuel_records if f.get("suspicious", False)])
        }
    }

@router.delete("/fleet/{tenant_id}/reset")
async def reset_fleet_data(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Lösche Mock-Daten für Tenant (um echte Daten zu nutzen)"""
    
    if tenant_id in fleet_data_store:
        del fleet_data_store[tenant_id]
        return {
            "success": True,
            "message": f"Mock-Daten für Tenant {tenant_id} gelöscht"
        }
    
    return {
        "success": False,
        "message": "Keine Mock-Daten vorhanden"
    }

@router.post("/fleet/{tenant_id}/regenerate")
async def regenerate_fleet_data(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Regeneriere Mock-Daten"""
    
    fleet_data_store[tenant_id] = generate_mock_fleet_data(tenant_id)
    
    return {
        "success": True,
        "message": f"Mock-Daten für Tenant {tenant_id} neu generiert",
        "vehicles_count": len(fleet_data_store[tenant_id]["vehicles"]),
        "trips_count": len(fleet_data_store[tenant_id]["trips"]),
        "fuel_records_count": len(fleet_data_store[tenant_id]["fuel_records"])
    }
