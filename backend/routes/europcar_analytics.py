"""
Europcar Analytics API Routes
Modul 11: Berichte & Analytics
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

router = APIRouter(prefix="/api/europcar/analytics", tags=["Europcar Analytics"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tsrid_db


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.get("/dashboard", response_model=StandardResponse)
async def get_dashboard_analytics():
    """
    Haupt-Dashboard Statistiken
    """
    try:
        # Fahrzeuge
        total_vehicles = await db.europcar_vehicles.count_documents({})
        available_vehicles = await db.europcar_vehicles.count_documents({"status": "available"})
        rented_vehicles = await db.europcar_vehicles.count_documents({"status": "rented"})
        
        # Reservierungen
        total_reservations = await db.europcar_reservations.count_documents({})
        active_reservations = await db.europcar_reservations.count_documents({"status": "active"})
        
        # Kunden
        total_customers = await db.europcar_customers.count_documents({})
        verified_customers = await db.europcar_customers.count_documents({"ausweis_verifiziert": True})
        
        # Umsatz (letzte 30 Tage)
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        revenue_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": thirty_days_ago},
                    "status": {"$in": ["completed", "active"]}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$total_price"}
                }
            }
        ]
        revenue_result = await db.europcar_reservations.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
        
        # Schäden
        total_damages = await db.europcar_damage_reports.count_documents({})
        pending_repairs = await db.europcar_damage_reports.count_documents({"repair_status": "pending"})
        
        return StandardResponse(
            success=True,
            message="Dashboard-Daten erfolgreich geladen",
            data={
                "vehicles": {
                    "total": total_vehicles,
                    "available": available_vehicles,
                    "rented": rented_vehicles,
                    "utilization_rate": round((rented_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0, 2)
                },
                "reservations": {
                    "total": total_reservations,
                    "active": active_reservations
                },
                "customers": {
                    "total": total_customers,
                    "verified": verified_customers
                },
                "revenue": {
                    "last_30_days": round(total_revenue, 2)
                },
                "damages": {
                    "total": total_damages,
                    "pending_repairs": pending_repairs
                }
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fleet-utilization", response_model=StandardResponse)
async def get_fleet_utilization(days: int = 30):
    """
    Flottenauslastung über Zeit
    """
    try:
        # Get daily utilization
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$toDate": "$created_at"}}},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        utilization_data = await db.europcar_reservations.aggregate(pipeline).to_list(100)
        
        return StandardResponse(
            success=True,
            message="Auslastungsdaten erfolgreich geladen",
            data={"utilization": utilization_data}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue-report", response_model=StandardResponse)
async def get_revenue_report(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Umsatzbericht nach Station, Fahrzeug, Zeitraum
    """
    try:
        if not start_date:
            start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now(timezone.utc).isoformat()
        
        # Revenue by station
        station_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date},
                    "status": {"$in": ["completed", "active"]}
                }
            },
            {
                "$group": {
                    "_id": "$start_station_id",
                    "total_revenue": {"$sum": "$total_price"},
                    "count": {"$sum": 1}
                }
            }
        ]
        station_revenue = await db.europcar_reservations.aggregate(station_pipeline).to_list(100)
        
        # Revenue by vehicle
        vehicle_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date},
                    "status": {"$in": ["completed", "active"]}
                }
            },
            {
                "$group": {
                    "_id": "$vehicle_id",
                    "total_revenue": {"$sum": "$total_price"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"total_revenue": -1}},
            {"$limit": 10}
        ]
        vehicle_revenue = await db.europcar_reservations.aggregate(vehicle_pipeline).to_list(100)
        
        return StandardResponse(
            success=True,
            message="Umsatzbericht erfolgreich erstellt",
            data={
                "by_station": station_revenue,
                "top_vehicles": vehicle_revenue,
                "date_range": {"start": start_date, "end": end_date}
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer-analytics", response_model=StandardResponse)
async def get_customer_analytics():
    """
    Kundenanalyse: CLV, Segmentierung, Top-Kunden
    """
    try:
        # Customer Lifetime Value
        clv_pipeline = [
            {
                "$group": {
                    "_id": "$customer_id",
                    "total_spent": {"$sum": "$total_price"},
                    "rental_count": {"$sum": 1}
                }
            },
            {"$sort": {"total_spent": -1}},
            {"$limit": 10}
        ]
        top_customers = await db.europcar_reservations.aggregate(clv_pipeline).to_list(100)
        
        # Customer segments
        private_count = await db.europcar_customers.count_documents({"customer_type": "private"})
        business_count = await db.europcar_customers.count_documents({"customer_type": "business"})
        
        return StandardResponse(
            success=True,
            message="Kundenanalyse erfolgreich erstellt",
            data={
                "top_customers": top_customers,
                "segments": {
                    "private": private_count,
                    "business": business_count
                }
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle-performance", response_model=StandardResponse)
async def get_vehicle_performance():
    """
    Fahrzeugleistung: Auslastung, Umsatz, Kosten vs. Einnahmen
    """
    try:
        vehicles = await db.europcar_vehicles.find({}, {"_id": 0}).to_list(1000)
        
        performance_data = []
        for vehicle in vehicles:
            # Get rental count and revenue
            reservations = await db.europcar_reservations.find(
                {"vehicle_id": vehicle["id"], "status": {"$in": ["completed", "active"]}},
                {"_id": 0}
            ).to_list(1000)
            
            rental_count = len(reservations)
            total_revenue = sum(r.get("total_price", 0) for r in reservations)
            
            # Get damage costs
            damages = await db.europcar_damage_reports.find(
                {"vehicle_id": vehicle["id"]},
                {"_id": 0}
            ).to_list(1000)
            damage_cost = sum(d.get("actual_repair_cost", 0) or 0 for d in damages)
            
            performance_data.append({
                "vehicle_id": vehicle["id"],
                "marke": vehicle["marke"],
                "modell": vehicle["modell"],
                "kennzeichen": vehicle["kennzeichen"],
                "rental_count": rental_count,
                "total_revenue": round(total_revenue, 2),
                "damage_cost": round(damage_cost, 2),
                "net_profit": round(total_revenue - damage_cost, 2)
            })
        
        # Sort by net profit
        performance_data.sort(key=lambda x: x["net_profit"], reverse=True)
        
        return StandardResponse(
            success=True,
            message="Fahrzeugleistung erfolgreich analysiert",
            data={"vehicles": performance_data[:20]}  # Top 20
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
