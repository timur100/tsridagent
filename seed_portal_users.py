#!/usr/bin/env python3
"""
Seed script for portal users
Creates test admin and customer users
"""
import os
import sys
from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_users():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_url)
    db = client['test_database']
    
    # Clear existing users
    db.portal_users.delete_many({})
    print("✅ Cleared existing users")
    
    # Create test users
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@tsrid.com",
            "name": "Admin User",
            "company": "TSRID Technologies",
            "role": "admin",
            "hashed_password": pwd_context.hash("admin123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "kunde@test.de",
            "name": "Test Kunde",
            "company": "Schmidt AG",
            "role": "customer",
            "hashed_password": pwd_context.hash("test123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "demo@customer.de",
            "name": "Demo Customer",
            "company": "Europcar Autovermietung GmbH",
            "role": "customer",
            "hashed_password": pwd_context.hash("demo123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Insert users
    result = db.portal_users.insert_many(users)
    print(f"✅ Created {len(result.inserted_ids)} users:")
    for user in users:
        print(f"   - {user['email']} ({user['role']}) - Password: {user['email'].split('@')[0].split('.')[-1]}123")
    
    print("\n📝 Login Credentials:")
    print("   Admin: admin@tsrid.com / admin123")
    print("   Customer 1: kunde@test.de / test123")
    print("   Customer 2: demo@customer.de / demo123")

if __name__ == "__main__":
    seed_users()
