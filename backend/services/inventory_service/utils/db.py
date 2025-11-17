from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'inventory_db')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
inventory_collection = db['inventory']
categories_collection = db['inventory_categories']
goods_receipts_collection = db['goods_receipts']