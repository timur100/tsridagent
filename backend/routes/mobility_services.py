"""
Multi-Modal Mobility Services
Umfassendes Buchungssystem für Cars, Bikes, E-Bikes, E-Scooter und Parkplätze
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from routes.portal_auth import verify_token
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['main_db']

# ==================== ENUMS & CONSTANTS ====================

class VehicleType(str):
    CAR = "car"
    BIKE = "bike"
    E_BIKE = "e_bike"
    E_SCOOTER = "e_scooter"
    PARKING = "parking"

class VehicleStatus(str):
    AVAILABLE = "available"
    BOOKED = "booked"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"

class BookingStatus(str):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PricingModel(str):
    HOURLY = "hourly"
    DAILY = "daily"
    PER_KM = "per_km"
    FLAT_RATE = "flat_rate"


# ==================== PYDANTIC MODELS ====================

class VehicleModel(BaseModel):
    name: str
    vehicle_type: str  # car, bike, e_bike, e_scooter, parking
    brand: Optional[str] = None
    model: Optional[str] = None
    license_plate: Optional[str] = None
    location_id: str
    status: str = "available"
    pricing: dict  # {hourly: 5.0, daily: 50.0, per_km: 0.3}
    features: List[str] = []  # ["GPS", "Child Seat", "Automatic", "Electric"]
    capacity: Optional[int] = None  # Personen für Car, Parking
    battery_level: Optional[int] = None  # Für E-Bikes, E-Scooter
    range_km: Optional[int] = None
    image_url: Optional[str] = None
    qr_code: Optional[str] = None  # Für Bikes/Scooter
    active: bool = True


class LocationModel(BaseModel):
    name: str
    address: str
    city: str
    postal_code: str
    country: str = "Deutschland"
    lat: float
    lng: float
    location_type: str = "station"  # station, parking, free_floating
    operating_hours: Optional[dict] = None  # {open: "06:00", close: "22:00"}
    available_vehicle_types: List[str] = []
    active: bool = True


class BookingModel(BaseModel):
    vehicle_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_location_id: str
    return_location_id: Optional[str] = None  # Can be same as pickup
    start_time: datetime
    end_time: datetime
    pricing_model: str = "daily"  # hourly, daily, per_km, flat_rate
    estimated_cost: float
    special_requests: Optional[str] = None
    requires_license: bool = False
    license_number: Optional[str] = None


class CheckInOutModel(BaseModel):
    booking_id: str
    action: str  # check_in, check_out
    location_id: str
    odometer_reading: Optional[int] = None
    fuel_level: Optional[int] = None
    battery_level: Optional[int] = None
    damage_reported: bool = False
    damage_description: Optional[str] = None
    photos: List[str] = []
    notes: Optional[str] = None


# ==================== VEHICLE MANAGEMENT ====================

@router.post("/mobility/vehicles")
async def create_vehicle(
    vehicle: VehicleModel,
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Create a new vehicle"""
    try:
        vehicle_data = vehicle.dict()
        vehicle_data['id'] = str(uuid4())
        vehicle_data['tenant_id'] = tenant_id
        vehicle_data['created_at'] = datetime.now(timezone.utc)
        vehicle_data['updated_at'] = datetime.now(timezone.utc)
        vehicle_data['total_bookings'] = 0
        vehicle_data['total_distance_km'] = 0
        vehicle_data['last_maintenance'] = None
        
        # Store the clean data before insertion
        clean_vehicle_data = vehicle_data.copy()
        
        await db.mobility_vehicles.insert_one(vehicle_data)
        
        return {'success': True, 'data': clean_vehicle_data}
    except Exception as e:
        print(f"[Mobility] Error creating vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/vehicles")
async def get_vehicles(
    tenant_id: str,
    location_id: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    available_only: bool = False,
    token_data: dict = Depends(verify_token)
):
    """Get all vehicles with filters"""
    try:
        query = {'tenant_id': tenant_id}
        
        if location_id:
            query['location_id'] = location_id
        
        if vehicle_type:
            query['vehicle_type'] = vehicle_type
        
        if status:
            query['status'] = status
        
        if available_only:
            query['status'] = 'available'
            query['active'] = True
        
        vehicles = await db.mobility_vehicles.find(query, {'_id': 0}).to_list(1000)
        
        return {'success': True, 'data': vehicles, 'total': len(vehicles)}
    except Exception as e:
        print(f"[Mobility] Error fetching vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/vehicles/{vehicle_id}")
async def get_vehicle(
    vehicle_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific vehicle"""
    try:
        vehicle = await db.mobility_vehicles.find_one({'id': vehicle_id}, {'_id': 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        return {'success': True, 'data': vehicle}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error fetching vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/mobility/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    vehicle: VehicleModel,
    token_data: dict = Depends(verify_token)
):
    """Update a vehicle"""
    try:
        vehicle_data = vehicle.dict()
        vehicle_data['updated_at'] = datetime.now(timezone.utc)
        
        result = await db.mobility_vehicles.update_one(
            {'id': vehicle_id},
            {'$set': vehicle_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        updated_vehicle = await db.mobility_vehicles.find_one({'id': vehicle_id}, {'_id': 0})
        return {'success': True, 'data': updated_vehicle}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error updating vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/mobility/vehicles/{vehicle_id}/status")
async def update_vehicle_status(
    vehicle_id: str,
    status: str,
    token_data: dict = Depends(verify_token)
):
    """Update vehicle status"""
    try:
        result = await db.mobility_vehicles.update_one(
            {'id': vehicle_id},
            {'$set': {
                'status': status,
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        updated_vehicle = await db.mobility_vehicles.find_one({'id': vehicle_id}, {'_id': 0})
        return {'success': True, 'data': updated_vehicle}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error updating vehicle status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/mobility/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a vehicle"""
    try:
        result = await db.mobility_vehicles.delete_one({'id': vehicle_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        return {'success': True, 'message': 'Vehicle deleted'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error deleting vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LOCATION MANAGEMENT ====================

@router.post("/mobility/locations")
async def create_location(
    location: LocationModel,
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Create a new location/station"""
    try:
        location_data = location.dict()
        location_data['id'] = str(uuid4())
        location_data['tenant_id'] = tenant_id
        location_data['created_at'] = datetime.now(timezone.utc)
        location_data['updated_at'] = datetime.now(timezone.utc)
        
        # Store the clean data before insertion
        clean_location_data = location_data.copy()
        
        await db.mobility_locations.insert_one(location_data)
        
        return {'success': True, 'data': clean_location_data}
    except Exception as e:
        print(f"[Mobility] Error creating location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/locations")
async def get_locations(
    tenant_id: str,
    city: Optional[str] = None,
    location_type: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all locations"""
    try:
        query = {'tenant_id': tenant_id}
        
        if city:
            query['city'] = city
        
        if location_type:
            query['location_type'] = location_type
        
        locations = await db.mobility_locations.find(query, {'_id': 0}).sort('city', 1).to_list(1000)
        
        # Add vehicle counts
        for location in locations:
            vehicle_count = await db.mobility_vehicles.count_documents({
                'tenant_id': tenant_id,
                'location_id': location['id']
            })
            location['vehicle_count'] = vehicle_count
        
        return {'success': True, 'data': locations, 'total': len(locations)}
    except Exception as e:
        print(f"[Mobility] Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/locations/{location_id}")
async def get_location(
    location_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific location"""
    try:
        location = await db.mobility_locations.find_one({'id': location_id}, {'_id': 0})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Add vehicle counts by type
        vehicles = await db.mobility_vehicles.find({
            'location_id': location_id
        }, {'_id': 0}).to_list(1000)
        
        vehicle_counts = {}
        for v in vehicles:
            vtype = v['vehicle_type']
            vehicle_counts[vtype] = vehicle_counts.get(vtype, 0) + 1
        
        location['vehicle_counts'] = vehicle_counts
        location['total_vehicles'] = len(vehicles)
        
        return {'success': True, 'data': location}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error fetching location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/mobility/locations/{location_id}")
async def update_location(
    location_id: str,
    location: LocationModel,
    token_data: dict = Depends(verify_token)
):
    """Update a location"""
    try:
        location_data = location.dict()
        location_data['updated_at'] = datetime.now(timezone.utc)
        
        result = await db.mobility_locations.update_one(
            {'id': location_id},
            {'$set': location_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Location not found")
        
        updated_location = await db.mobility_locations.find_one({'id': location_id}, {'_id': 0})
        return {'success': True, 'data': updated_location}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error updating location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/mobility/locations/{location_id}")
async def delete_location(
    location_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a location"""
    try:
        # Check if location has vehicles
        vehicle_count = await db.mobility_vehicles.count_documents({'location_id': location_id})
        if vehicle_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete location with {vehicle_count} vehicles. Please relocate vehicles first."
            )
        
        result = await db.mobility_locations.delete_one({'id': location_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Location not found")
        
        return {'success': True, 'message': 'Location deleted'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error deleting location: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BOOKING SYSTEM ====================

@router.post("/mobility/bookings")
async def create_booking(
    booking: BookingModel,
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Create a new booking"""
    try:
        # Check vehicle availability
        vehicle = await db.mobility_vehicles.find_one({'id': booking.vehicle_id}, {'_id': 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        if vehicle['status'] != 'available':
            raise HTTPException(status_code=400, detail="Vehicle is not available")
        
        # Check for conflicting bookings
        conflicting = await db.mobility_bookings.find_one({
            'vehicle_id': booking.vehicle_id,
            'status': {'$in': ['confirmed', 'active']},
            '$or': [
                {
                    'start_time': {'$lte': booking.end_time.isoformat()},
                    'end_time': {'$gte': booking.start_time.isoformat()}
                }
            ]
        }, {'_id': 0})
        
        if conflicting:
            raise HTTPException(status_code=400, detail="Vehicle already booked for this time period")
        
        # Create booking
        booking_data = booking.dict()
        booking_data['id'] = str(uuid4())
        booking_data['tenant_id'] = tenant_id
        booking_data['booking_number'] = f"BK-{str(uuid4())[:8].upper()}"
        booking_data['status'] = 'confirmed'
        booking_data['created_at'] = datetime.now(timezone.utc)
        booking_data['updated_at'] = datetime.now(timezone.utc)
        booking_data['actual_cost'] = None
        booking_data['distance_km'] = None
        booking_data['check_in_time'] = None
        booking_data['check_out_time'] = None
        
        # Convert datetime to ISO string
        booking_data['start_time'] = booking.start_time.isoformat()
        booking_data['end_time'] = booking.end_time.isoformat()
        
        # Store the clean data before insertion
        clean_booking_data = booking_data.copy()
        
        await db.mobility_bookings.insert_one(booking_data)
        
        # Update vehicle status to booked
        await db.mobility_vehicles.update_one(
            {'id': booking.vehicle_id},
            {'$set': {'status': 'booked', 'updated_at': datetime.now(timezone.utc)}}
        )
        
        return {'success': True, 'data': clean_booking_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error creating booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/bookings")
async def get_bookings(
    tenant_id: str,
    customer_email: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    status: Optional[str] = None,
    location_id: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all bookings"""
    try:
        query = {'tenant_id': tenant_id}
        
        if customer_email:
            query['customer_email'] = customer_email
        
        if vehicle_id:
            query['vehicle_id'] = vehicle_id
        
        if status:
            query['status'] = status
        
        if location_id:
            query['pickup_location_id'] = location_id
        
        bookings = await db.mobility_bookings.find(
            query,
            {'_id': 0}
        ).sort('created_at', -1).to_list(1000)
        
        return {'success': True, 'data': bookings, 'total': len(bookings)}
    except Exception as e:
        print(f"[Mobility] Error fetching bookings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mobility/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific booking"""
    try:
        booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Get vehicle and location details
        vehicle = await db.mobility_vehicles.find_one({'id': booking['vehicle_id']}, {'_id': 0})
        pickup_location = await db.mobility_locations.find_one({'id': booking['pickup_location_id']}, {'_id': 0})
        
        booking['vehicle_details'] = vehicle
        booking['pickup_location_details'] = pickup_location
        
        if booking.get('return_location_id'):
            return_location = await db.mobility_locations.find_one({'id': booking['return_location_id']}, {'_id': 0})
            booking['return_location_details'] = return_location
        
        return {'success': True, 'data': booking}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error fetching booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/mobility/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,
    token_data: dict = Depends(verify_token)
):
    """Update booking status"""
    try:
        booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Update booking
        result = await db.mobility_bookings.update_one(
            {'id': booking_id},
            {'$set': {
                'status': status,
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        # Update vehicle status accordingly
        if status == 'cancelled':
            await db.mobility_vehicles.update_one(
                {'id': booking['vehicle_id']},
                {'$set': {'status': 'available'}}
            )
        elif status == 'active':
            await db.mobility_vehicles.update_one(
                {'id': booking['vehicle_id']},
                {'$set': {'status': 'in_use'}}
            )
        elif status == 'completed':
            await db.mobility_vehicles.update_one(
                {'id': booking['vehicle_id']},
                {'$set': {'status': 'available'}}
            )
        
        updated_booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        return {'success': True, 'data': updated_booking}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error updating booking status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/mobility/bookings/{booking_id}")
async def cancel_booking(
    booking_id: str,
    token_data: dict = Depends(verify_token)
):
    """Cancel a booking"""
    try:
        booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking['status'] in ['completed', 'cancelled']:
            raise HTTPException(status_code=400, detail="Cannot cancel completed or already cancelled booking")
        
        # Update booking status
        await db.mobility_bookings.update_one(
            {'id': booking_id},
            {'$set': {
                'status': 'cancelled',
                'updated_at': datetime.now(timezone.utc)
            }}
        )
        
        # Free up vehicle
        await db.mobility_vehicles.update_one(
            {'id': booking['vehicle_id']},
            {'$set': {'status': 'available'}}
        )
        
        return {'success': True, 'message': 'Booking cancelled'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error cancelling booking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHECK-IN / CHECK-OUT ====================

@router.post("/mobility/bookings/{booking_id}/check-in")
async def check_in(
    booking_id: str,
    check_in_data: CheckInOutModel,
    token_data: dict = Depends(verify_token)
):
    """Check-in for a booking"""
    try:
        booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking['status'] != 'confirmed':
            raise HTTPException(status_code=400, detail="Booking must be confirmed for check-in")
        
        # Update booking with check-in data
        update_data = {
            'status': 'active',
            'check_in_time': datetime.now(timezone.utc).isoformat(),
            'check_in_location_id': check_in_data.location_id,
            'start_odometer': check_in_data.odometer_reading,
            'start_fuel_level': check_in_data.fuel_level,
            'start_battery_level': check_in_data.battery_level,
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.mobility_bookings.update_one(
            {'id': booking_id},
            {'$set': update_data}
        )
        
        # Update vehicle status
        await db.mobility_vehicles.update_one(
            {'id': booking['vehicle_id']},
            {'$set': {'status': 'in_use'}}
        )
        
        updated_booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        return {'success': True, 'data': updated_booking, 'message': 'Check-in successful'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error during check-in: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mobility/bookings/{booking_id}/check-out")
async def check_out(
    booking_id: str,
    check_out_data: CheckInOutModel,
    token_data: dict = Depends(verify_token)
):
    """Check-out for a booking"""
    try:
        booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking['status'] != 'active':
            raise HTTPException(status_code=400, detail="Booking must be active for check-out")
        
        # Calculate actual cost
        start_time = datetime.fromisoformat(booking['start_time'])
        end_time = datetime.now(timezone.utc)
        
        duration_hours = (end_time - start_time).total_seconds() / 3600
        
        # Get vehicle pricing
        vehicle = await db.mobility_vehicles.find_one({'id': booking['vehicle_id']}, {'_id': 0})
        pricing = vehicle.get('pricing', {})
        
        # Calculate cost based on pricing model
        if booking['pricing_model'] == 'hourly':
            actual_cost = duration_hours * pricing.get('hourly', 5.0)
        elif booking['pricing_model'] == 'daily':
            duration_days = max(1, int(duration_hours / 24) + (1 if duration_hours % 24 > 0 else 0))
            actual_cost = duration_days * pricing.get('daily', 50.0)
        elif booking['pricing_model'] == 'per_km':
            distance_km = check_out_data.odometer_reading - booking.get('start_odometer', 0) if check_out_data.odometer_reading else 0
            actual_cost = distance_km * pricing.get('per_km', 0.3)
        else:
            actual_cost = booking['estimated_cost']
        
        # Update booking with check-out data
        distance_km = None
        if check_out_data.odometer_reading and booking.get('start_odometer'):
            distance_km = check_out_data.odometer_reading - booking['start_odometer']
        
        update_data = {
            'status': 'completed',
            'check_out_time': end_time.isoformat(),
            'check_out_location_id': check_out_data.location_id,
            'end_odometer': check_out_data.odometer_reading,
            'end_fuel_level': check_out_data.fuel_level,
            'end_battery_level': check_out_data.battery_level,
            'distance_km': distance_km,
            'actual_cost': round(actual_cost, 2),
            'damage_reported': check_out_data.damage_reported,
            'damage_description': check_out_data.damage_description if check_out_data.damage_reported else None,
            'check_out_photos': check_out_data.photos,
            'check_out_notes': check_out_data.notes,
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.mobility_bookings.update_one(
            {'id': booking_id},
            {'$set': update_data}
        )
        
        # Update vehicle
        vehicle_update = {
            'status': 'maintenance' if check_out_data.damage_reported else 'available',
            'updated_at': datetime.now(timezone.utc)
        }
        
        if check_out_data.odometer_reading:
            vehicle_update['odometer'] = check_out_data.odometer_reading
        
        if check_out_data.battery_level is not None:
            vehicle_update['battery_level'] = check_out_data.battery_level
        
        # Update location if returned to different location
        if check_out_data.location_id != booking['pickup_location_id']:
            vehicle_update['location_id'] = check_out_data.location_id
        
        await db.mobility_vehicles.update_one(
            {'id': booking['vehicle_id']},
            {
                '$set': vehicle_update,
                '$inc': {'total_bookings': 1, 'total_distance_km': distance_km or 0}
            }
        )
        
        updated_booking = await db.mobility_bookings.find_one({'id': booking_id}, {'_id': 0})
        return {'success': True, 'data': updated_booking, 'message': 'Check-out successful'}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error during check-out: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AVAILABILITY CHECK ====================

@router.get("/mobility/availability")
async def check_availability(
    tenant_id: str,
    vehicle_type: Optional[str] = None,
    location_id: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Check vehicle availability for a time period"""
    try:
        query = {'tenant_id': tenant_id, 'active': True}
        
        if vehicle_type:
            query['vehicle_type'] = vehicle_type
        
        if location_id:
            query['location_id'] = location_id
        
        vehicles = await db.mobility_vehicles.find(query, {'_id': 0}).to_list(1000)
        
        # If time period specified, filter out booked vehicles
        if start_time and end_time:
            booked_vehicle_ids = []
            bookings = await db.mobility_bookings.find({
                'tenant_id': tenant_id,
                'status': {'$in': ['confirmed', 'active']},
                '$or': [
                    {
                        'start_time': {'$lte': end_time},
                        'end_time': {'$gte': start_time}
                    }
                ]
            }, {'_id': 0}).to_list(1000)
            
            booked_vehicle_ids = [b['vehicle_id'] for b in bookings]
            
            vehicles = [v for v in vehicles if v['id'] not in booked_vehicle_ids]
        else:
            # Just filter by current status
            vehicles = [v for v in vehicles if v['status'] == 'available']
        
        return {
            'success': True,
            'data': vehicles,
            'total': len(vehicles),
            'filters': {
                'vehicle_type': vehicle_type,
                'location_id': location_id,
                'start_time': start_time,
                'end_time': end_time
            }
        }
    except Exception as e:
        print(f"[Mobility] Error checking availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRICE CALCULATION ====================

@router.post("/mobility/calculate-price")
async def calculate_price(
    vehicle_id: str,
    start_time: datetime,
    end_time: datetime,
    estimated_distance_km: Optional[int] = None,
    token_data: dict = Depends(verify_token)
):
    """Calculate price for a booking"""
    try:
        vehicle = await db.mobility_vehicles.find_one({'id': vehicle_id}, {'_id': 0})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        pricing = vehicle.get('pricing', {})
        
        # Calculate duration
        duration = end_time - start_time
        duration_hours = duration.total_seconds() / 3600
        duration_days = max(1, int(duration_hours / 24) + (1 if duration_hours % 24 > 0 else 0))
        
        # Calculate all pricing options
        prices = {}
        
        if 'hourly' in pricing:
            prices['hourly'] = {
                'total': round(duration_hours * pricing['hourly'], 2),
                'rate': pricing['hourly'],
                'unit': 'hour',
                'quantity': round(duration_hours, 2)
            }
        
        if 'daily' in pricing:
            prices['daily'] = {
                'total': round(duration_days * pricing['daily'], 2),
                'rate': pricing['daily'],
                'unit': 'day',
                'quantity': duration_days
            }
        
        if 'per_km' in pricing and estimated_distance_km:
            prices['per_km'] = {
                'total': round(estimated_distance_km * pricing['per_km'], 2),
                'rate': pricing['per_km'],
                'unit': 'km',
                'quantity': estimated_distance_km
            }
        
        if 'flat_rate' in pricing:
            prices['flat_rate'] = {
                'total': pricing['flat_rate'],
                'rate': pricing['flat_rate'],
                'unit': 'booking',
                'quantity': 1
            }
        
        # Recommend best option (usually daily for longer rentals, hourly for short)
        if duration_hours < 24 and 'hourly' in prices:
            recommended = 'hourly'
        elif 'daily' in prices:
            recommended = 'daily'
        else:
            recommended = list(prices.keys())[0] if prices else None
        
        return {
            'success': True,
            'vehicle_id': vehicle_id,
            'duration_hours': round(duration_hours, 2),
            'duration_days': duration_days,
            'prices': prices,
            'recommended_pricing': recommended
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Mobility] Error calculating price: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STATISTICS ====================

@router.get("/mobility/statistics")
async def get_statistics(
    tenant_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get mobility statistics"""
    try:
        # Vehicle counts
        vehicles = await db.mobility_vehicles.find({'tenant_id': tenant_id}, {'_id': 0}).to_list(1000)
        vehicle_counts = {}
        for v in vehicles:
            vtype = v['vehicle_type']
            vehicle_counts[vtype] = vehicle_counts.get(vtype, 0) + 1
        
        # Booking stats
        bookings = await db.mobility_bookings.find({'tenant_id': tenant_id}, {'_id': 0}).to_list(10000)
        
        total_revenue = sum(b.get('actual_cost', 0) for b in bookings if b.get('actual_cost'))
        completed_bookings = [b for b in bookings if b['status'] == 'completed']
        active_bookings = [b for b in bookings if b['status'] == 'active']
        
        # Average booking duration
        total_duration = 0
        for b in completed_bookings:
            if b.get('check_in_time') and b.get('check_out_time'):
                start = datetime.fromisoformat(b['check_in_time'])
                end = datetime.fromisoformat(b['check_out_time'])
                total_duration += (end - start).total_seconds() / 3600
        
        avg_duration = total_duration / len(completed_bookings) if completed_bookings else 0
        
        return {
            'success': True,
            'statistics': {
                'total_vehicles': len(vehicles),
                'vehicle_counts': vehicle_counts,
                'available_vehicles': len([v for v in vehicles if v['status'] == 'available']),
                'in_use_vehicles': len([v for v in vehicles if v['status'] == 'in_use']),
                'maintenance_vehicles': len([v for v in vehicles if v['status'] == 'maintenance']),
                'total_bookings': len(bookings),
                'active_bookings': len(active_bookings),
                'completed_bookings': len(completed_bookings),
                'total_revenue': round(total_revenue, 2),
                'avg_booking_duration_hours': round(avg_duration, 2),
                'total_distance_km': sum(v.get('total_distance_km', 0) for v in vehicles)
            }
        }
    except Exception as e:
        print(f"[Mobility] Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
