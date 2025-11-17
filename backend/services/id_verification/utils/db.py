from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'verification_db')

logger.info(f"Connecting to MongoDB: {mongo_url}/{db_name}")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def get_database():
    """Get database instance"""
    return db


async def close_database():
    """Close database connection"""
    client.close()
    logger.info("Database connection closed")
