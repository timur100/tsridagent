"""
Normalize all phone numbers in portal_db.tenant_locations to international format
Format: +49 (7721) 9968690
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

def normalize_german_phone(phone_str):
    """
    Normalize German phone numbers to format: +49 (area) number
    Examples:
        07721 9968690 -> +49 (7721) 9968690
        +49 (7721) 9968690 -> +49 (7721) 9968690 (already normalized)
        0049 7721 9968690 -> +49 (7721) 9968690
    """
    if not phone_str:
        return None
    
    # Remove all spaces, hyphens, slashes
    cleaned = re.sub(r'[\s\-/]', '', phone_str)
    
    # Already in correct format? Return as-is
    if re.match(r'^\+49\s*\(\d+\)\s*\d+$', phone_str):
        return phone_str
    
    # Remove country code variants
    cleaned = re.sub(r'^\+49', '', cleaned)
    cleaned = re.sub(r'^0049', '', cleaned)
    cleaned = re.sub(r'^\(49\)', '', cleaned)
    
    # Remove leading 0 if present
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
    
    # Extract area code and number
    # German area codes: 2-5 digits
    match = re.match(r'^(\d{2,5})(\d{4,})$', cleaned)
    
    if match:
        area_code = match.group(1)
        number = match.group(2)
        return f"+49 ({area_code}) {number}"
    
    # If parsing failed, return original
    return phone_str

async def normalize_all_phone_numbers():
    client = AsyncIOMotorClient(MONGO_URL)
    portal_db = client['portal_db']
    
    print("=" * 80)
    print("📞 NORMALIZING PHONE NUMBERS")
    print("=" * 80)
    
    # Get all locations with phone numbers
    locations = await portal_db.tenant_locations.find({
        'phone': {'$exists': True, '$ne': None, '$ne': ''}
    }).to_list(1000)
    
    print(f"\n📊 Found {len(locations)} locations with phone numbers")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for loc in locations:
        original_phone = loc.get('phone')
        
        try:
            normalized_phone = normalize_german_phone(original_phone)
            
            if normalized_phone and normalized_phone != original_phone:
                # Update in database
                await portal_db.tenant_locations.update_one(
                    {'location_id': loc.get('location_id')},
                    {'$set': {'phone': normalized_phone}}
                )
                
                print(f"✓ {loc.get('station_name')}: {original_phone} → {normalized_phone}")
                updated_count += 1
            else:
                skipped_count += 1
        
        except Exception as e:
            print(f"✗ Error processing {loc.get('station_name')}: {str(e)}")
            error_count += 1
    
    print("\n" + "=" * 80)
    print("✅ NORMALIZATION COMPLETE")
    print("=" * 80)
    print(f"Updated:  {updated_count}")
    print(f"Skipped:  {skipped_count} (already normalized)")
    print(f"Errors:   {error_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(normalize_all_phone_numbers())
