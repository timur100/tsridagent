"""
Telephony Webhooks for incoming calls (Placetel, etc.)
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/telephony", tags=["telephony"])

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
portal_db = client['portal_db']
tsrid_db = client['tsrid_db']

class IncomingCallWebhook(BaseModel):
    caller: str  # Phone number of caller
    called: str  # Phone number that was called
    call_id: Optional[str] = None
    timestamp: Optional[str] = None

@router.post("/webhook/incoming-call")
async def handle_incoming_call(webhook_data: IncomingCallWebhook):
    """
    Handle incoming call webhook from Placetel
    Lookup caller in database and return caller info
    """
    try:
        caller_phone = webhook_data.caller
        
        # Normalize phone number for lookup
        # Remove all non-digits except +
        normalized_caller = ''.join(c for c in caller_phone if c.isdigit() or c == '+')
        
        # Try to find location by phone number
        # Create a pattern that matches the phone in any format
        digits_only = ''.join(c for c in normalized_caller if c.isdigit())
        
        # Search by matching all digits
        location = None
        all_locations = await portal_db.tenant_locations.find({
            'phone': {'$ne': None, '$ne': ''}
        }, {'_id': 0}).to_list(1000)
        
        for loc in all_locations:
            loc_phone = loc.get('phone', '')
            loc_digits = ''.join(c for c in loc_phone if c.isdigit())
            if loc_digits == digits_only or digits_only in loc_digits or loc_digits in digits_only:
                location = loc
                break
        
        if location:
            # Find tenant info
            tenant_id = location.get('tenant_id')
            tenant = await tsrid_db.tenants.find_one({
                'tenant_id': tenant_id
            }, {'_id': 0})
            
            return {
                'success': True,
                'caller_identified': True,
                'data': {
                    'caller': {
                        'phone': caller_phone,
                        'identified': True
                    },
                    'location': {
                        'location_id': location.get('location_id'),
                        'station_name': location.get('station_name'),
                        'location_code': location.get('location_code'),
                        'city': location.get('city'),
                        'state': location.get('state'),
                        'country': location.get('country')
                    },
                    'tenant': {
                        'tenant_id': tenant_id,
                        'name': tenant.get('name') if tenant else 'Unbekannt'
                    },
                    'call': {
                        'call_id': webhook_data.call_id,
                        'timestamp': webhook_data.timestamp
                    }
                }
            }
        else:
            # Unknown caller
            return {
                'success': True,
                'caller_identified': False,
                'data': {
                    'caller': {
                        'phone': caller_phone,
                        'identified': False
                    },
                    'call': {
                        'call_id': webhook_data.call_id,
                        'timestamp': webhook_data.timestamp
                    }
                }
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/click-to-call")
async def initiate_call(
    phone_number: str,
    agent_extension: Optional[str] = None
):
    """
    Initiate outbound call via Placetel
    TODO: Implement Placetel API integration
    """
    try:
        # TODO: Integrate with Placetel API
        # For now, just return success
        return {
            'success': True,
            'message': 'Call initiation requested',
            'data': {
                'phone_number': phone_number,
                'agent_extension': agent_extension,
                'status': 'pending'
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/caller-lookup/{phone_number}")
async def lookup_caller(phone_number: str):
    """
    Lookup a phone number in the database
    """
    try:
        # Normalize for search
        normalized = ''.join(c for c in phone_number if c.isdigit() or c == '+')
        
        # Search in locations - match by digits only
        digits_only = ''.join(c for c in normalized if c.isdigit())
        
        location = None
        all_locations = await portal_db.tenant_locations.find({
            'phone': {'$ne': None, '$ne': ''}
        }, {'_id': 0}).to_list(1000)
        
        for loc in all_locations:
            loc_phone = loc.get('phone', '')
            loc_digits = ''.join(c for c in loc_phone if c.isdigit())
            if loc_digits == digits_only:
                location = loc
                break
        
        if location:
            tenant_id = location.get('tenant_id')
            tenant = await tsrid_db.tenants.find_one({
                'tenant_id': tenant_id
            }, {'_id': 0})
            
            return {
                'success': True,
                'found': True,
                'data': {
                    'location': location,
                    'tenant': tenant
                }
            }
        
        return {
            'success': True,
            'found': False,
            'message': 'Phone number not found'
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
