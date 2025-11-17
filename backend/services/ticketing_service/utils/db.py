from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_db_name = os.environ.get('MONGO_DB_NAME', 'ticketing_db')

# Create async MongoDB client
client = AsyncIOMotorClient(mongo_url)
db = client[mongo_db_name]

# Collections
tickets_collection = db['tickets']
