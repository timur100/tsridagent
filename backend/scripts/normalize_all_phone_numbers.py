"""
Normalize ALL phone numbers across all databases and collections
Format: +49 (7721) 9968690
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

def normalize_phone_number(phone_str):
    """
    Normalize phone numbers to international format: +49 (area) number
    """
    if not phone_str or not isinstance(phone_str, str):
        return None
    
    phone_str = phone_str.strip()
    if not phone_str or phone_str in ['-', 'N/A', 'None', 'null']:
        return None
    
    # Already in correct format?
    if re.match(r'^\+\d+\s*\(\d+\)\s*\d+$', phone_str):
        return phone_str
    
    # Remove all spaces, hyphens, slashes, dots, parentheses
    cleaned = re.sub(r'[\s\-/\.\(\)]', '', phone_str)
    
    # Remove country code variants
    cleaned = re.sub(r'^\+49', '', cleaned)
    cleaned = re.sub(r'^0049', '', cleaned)
    
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
    
    # If parsing failed, return original if it looks like a phone number
    if cleaned and len(cleaned) >= 6 and cleaned.isdigit():
        # Try default split: first 3-4 digits as area code
        if len(cleaned) >= 10:
            area_code = cleaned[:4]
            number = cleaned[4:]
        else:
            area_code = cleaned[:3]
            number = cleaned[3:]
        return f"+49 ({area_code}) {number}"
    
    return phone_str  # Return original if can't parse

async def normalize_collection(db, collection_name, field_names):
    """Normalize phone numbers in a specific collection"""
    collection = db[collection_name]
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for field_name in field_names:
        # Find all documents with this phone field
        query = {field_name: {'$exists': True, '$ne': None, '$ne': ''}}
        docs = await collection.find(query).to_list(10000)
        
        print(f"\n  Field: {field_name} ({len(docs)} documents)")
        
        for doc in docs:
            original_phone = doc.get(field_name)
            
            try:
                normalized_phone = normalize_phone_number(original_phone)
                
                if normalized_phone and normalized_phone != original_phone:
                    # Update in database
                    id_field = '_id' if '_id' in doc else list(doc.keys())[0]
                    await collection.update_one(
                        {id_field: doc[id_field]},
                        {'$set': {field_name: normalized_phone}}
                    )
                    
                    print(f"    ✓ {original_phone} → {normalized_phone}")
                    updated_count += 1
                else:
                    skipped_count += 1
            
            except Exception as e:
                print(f"    ✗ Error processing {original_phone}: {str(e)}")
                error_count += 1
    
    return updated_count, skipped_count, error_count

async def normalize_all():
    client = AsyncIOMotorClient(MONGO_URL)
    
    print("=" * 80)
    print("📞 NORMALIZING ALL PHONE NUMBERS ACROSS ALL DATABASES")
    print("=" * 80)
    
    total_updated = 0
    total_skipped = 0
    total_errors = 0
    
    # Define all phone fields to normalize
    phone_fields_map = {
        'portal_db': {
            'tenant_locations': ['phone', 'phone_internal']
        },
        'customer_db': {
            'customers': ['phone', 'mobile']
        },
        'tsrid_db': {
            'europcar_customers': ['telefon'],
            'europcar_stations': ['telefon']
        },
        'auth_db': {
            'users': ['phone']
        }
    }
    
    for db_name, collections in phone_fields_map.items():
        print(f"\n{'='*80}")
        print(f"📊 Database: {db_name}")
        print('='*80)
        
        db = client[db_name]
        
        for collection_name, field_names in collections.items():
            print(f"\n📁 Collection: {collection_name}")
            
            try:
                updated, skipped, errors = await normalize_collection(db, collection_name, field_names)
                total_updated += updated
                total_skipped += skipped
                total_errors += errors
                
                print(f"\n  Summary: {updated} updated, {skipped} skipped, {errors} errors")
            
            except Exception as e:
                print(f"\n  ✗ Error processing collection: {str(e)}")
                total_errors += 1
    
    print("\n" + "=" * 80)
    print("✅ GLOBAL NORMALIZATION COMPLETE")
    print("=" * 80)
    print(f"Total Updated:  {total_updated}")
    print(f"Total Skipped:  {total_skipped} (already normalized or empty)")
    print(f"Total Errors:   {total_errors}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(normalize_all())
