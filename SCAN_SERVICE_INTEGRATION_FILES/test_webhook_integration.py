"""
Test Script für Webhook Integration
Testet die komplette Integration zwischen scan-verify-hub und ID-Check Service
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Füge Backend-Pfad hinzu
sys.path.insert(0, '/app/backend')

from services.sqlite_queue import ScanQueueService
from services.webhook_sender import WebhookSender


async def test_sqlite_queue():
    """Test 1: SQLite Queue Service"""
    print("\n" + "=" * 60)
    print("TEST 1: SQLite Queue Service")
    print("=" * 60)
    
    queue = ScanQueueService()
    
    # Init DB
    await queue.init_db()
    print("✅ Database initialized")
    
    # Test Scan hinzufügen
    test_scan_data = {
        "tenant_id": "test-tenant-123",
        "tenant_name": "Test Tenant GmbH",
        "location_id": "LOC-001",
        "location_name": "Berlin Hauptbahnhof",
        "device_id": "DEVICE-001",
        "device_name": "Scanner Terminal 1",
        "scanner_id": "SCAN-001",
        "scanner_name": "DESKO Scanner",
        "scan_timestamp": datetime.now(timezone.utc).isoformat(),
        "document_type": "Personalausweis",
        "extracted_data": {
            "first_name": "Max",
            "last_name": "Mustermann",
            "date_of_birth": "1990-01-01",
            "document_number": "T12345678"
        },
        "verification": {
            "confidence_score": 95,
            "status": "valid"
        }
    }
    
    test_images = [
        {"type": "front_original", "file_path": "/app/backend/test_front.jpg"},
        {"type": "back_original", "file_path": "/app/backend/test_back.jpg"}
    ]
    
    queue_id = await queue.add_to_queue(test_scan_data, test_images)
    print(f"✅ Test scan added to queue: {queue_id}")
    
    # Stats abrufen
    stats = await queue.get_queue_stats()
    print(f"✅ Queue stats: {stats}")
    
    # Scan abrufen
    scan = await queue.get_scan_by_id(queue_id)
    if scan:
        print(f"✅ Scan retrieved from queue: {scan['id']}")
        print(f"   Status: {scan['webhook_status']}")
        print(f"   Retry count: {scan['retry_count']}")
    
    return queue_id


async def test_webhook_sender(queue_id: str):
    """Test 2: Webhook Sender"""
    print("\n" + "=" * 60)
    print("TEST 2: Webhook Sender")
    print("=" * 60)
    
    sender = WebhookSender()
    
    # Test Connection
    print("Testing connection to ID-Check Service...")
    connection_ok = await sender.test_connection()
    
    if not connection_ok:
        print("❌ Connection test failed - check if ID-Check Service is running")
        return False
    
    print("✅ Connection test successful")
    
    # Sende Webhook
    print(f"Sending webhook for queue_id: {queue_id}")
    success = await sender.send_scan_webhook(queue_id)
    
    if success:
        print("✅ Webhook sent successfully")
    else:
        print("❌ Webhook sending failed")
    
    return success


async def test_queue_stats():
    """Test 3: Queue Statistiken"""
    print("\n" + "=" * 60)
    print("TEST 3: Queue Statistics")
    print("=" * 60)
    
    queue = ScanQueueService()
    stats = await queue.get_queue_stats()
    
    print("📊 Current Queue Statistics:")
    print(f"   Total: {stats['total']}")
    print(f"   Pending: {stats['pending']}")
    print(f"   Sent: {stats['sent']}")
    print(f"   Failed: {stats['failed']}")
    print(f"   Abandoned: {stats['abandoned']}")


async def test_retry_logic():
    """Test 4: Retry Logik"""
    print("\n" + "=" * 60)
    print("TEST 4: Retry Logic")
    print("=" * 60)
    
    queue = ScanQueueService()
    
    # Hole pending Scans
    pending = await queue.get_pending_scans(limit=10)
    print(f"📋 Found {len(pending)} pending scans")
    
    for scan in pending:
        print(f"\n   Scan ID: {scan['id']}")
        print(f"   Status: {scan['webhook_status']}")
        print(f"   Retry Count: {scan['retry_count']}/5")
        print(f"   Created: {scan['created_at']}")
        if scan['error_message']:
            print(f"   Error: {scan['error_message'][:100]}...")


async def main():
    """Hauptfunktion - führt alle Tests aus"""
    print("\n" + "=" * 60)
    print("🧪 WEBHOOK INTEGRATION TEST SUITE")
    print("=" * 60)
    
    # Check Environment Variables
    print("\n📋 Environment Variables:")
    api_key = os.environ.get('WEBHOOK_API_KEY', '')
    webhook_url = os.environ.get('ID_CHECK_WEBHOOK_URL', '')
    
    if not api_key:
        print("❌ WEBHOOK_API_KEY not set in .env file!")
        return
    
    print(f"✅ WEBHOOK_API_KEY: {api_key[:20]}...")
    print(f"✅ ID_CHECK_WEBHOOK_URL: {webhook_url}")
    
    try:
        # Test 1: SQLite Queue
        queue_id = await test_sqlite_queue()
        
        # Test 2: Webhook Sender
        webhook_success = await test_webhook_sender(queue_id)
        
        # Test 3: Queue Stats
        await test_queue_stats()
        
        # Test 4: Retry Logic
        await test_retry_logic()
        
        print("\n" + "=" * 60)
        if webhook_success:
            print("✅ ALL TESTS PASSED")
        else:
            print("⚠️  TESTS COMPLETED WITH WARNINGS")
        print("=" * 60)
    
    except Exception as e:
        print(f"\n❌ TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
