from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_db_name = os.environ.get('MONGO_DB_NAME', 'auth_db')

# Create async MongoDB client
client = AsyncIOMotorClient(mongo_url)
db = client[mongo_db_name]

# Collections
users_collection = db['users']
roles_collection = db['roles']
permissions_collection = db['permissions']
tenants_collection = db['tenants']
api_keys_collection = db['api_keys']
sessions_collection = db['sessions']
realms_collection = db['realms']  # Keycloak compatibility
clients_collection = db['clients']  # Keycloak compatibility
