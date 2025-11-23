"""
SQLite Queue Service for Offline-First Scan Data Storage
Speichert alle Scandaten lokal, bevor sie an den ID-Check Service gesendet werden
"""
import aiosqlite
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, List
from pathlib import Path

# Database path
DB_PATH = Path("/app/backend/scan_queue.db")


class ScanQueueService:
    """
    Service zur Verwaltung der SQLite Scan-Queue
    
    Features:
    - Offline-First: Alle Scans werden zuerst lokal gespeichert
    - Status-Tracking: pending, sent, failed, abandoned
    - Retry-Logik: Automatische Wiederholung bei Fehlern
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DB_PATH)
    
    async def init_db(self):
        """
        Initialisiert die SQLite Datenbank mit dem Queue-Schema
        """
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS scan_queue (
                    id TEXT PRIMARY KEY,
                    scan_data TEXT NOT NULL,
                    images_data TEXT,
                    webhook_status TEXT DEFAULT 'pending',
                    retry_count INTEGER DEFAULT 0,
                    last_attempt TEXT,
                    created_at TEXT NOT NULL,
                    sent_at TEXT,
                    error_message TEXT,
                    target_scan_id TEXT
                )
            """)
            
            # Index für Performance
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_webhook_status 
                ON scan_queue(webhook_status)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_created_at 
                ON scan_queue(created_at DESC)
            """)
            
            await db.commit()
            print("✅ [SQLite Queue] Database initialized")
    
    async def add_to_queue(self, scan_data: Dict, images: List[Dict] = None) -> str:
        """
        Fügt einen neuen Scan zur Queue hinzu
        
        Args:
            scan_data: Dictionary mit Scandaten (tenant_id, location_id, etc.)
            images: Liste mit Bildinformationen [{type, file_path}, ...]
            
        Returns:
            queue_id: UUID des Queue-Eintrags
        """
        queue_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Ensure database exists
        await self.init_db()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO scan_queue 
                (id, scan_data, images_data, webhook_status, created_at, retry_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                queue_id,
                json.dumps(scan_data),
                json.dumps(images) if images else None,
                'pending',
                now,
                0
            ))
            await db.commit()
        
        print(f"✅ [SQLite Queue] Scan added to queue: {queue_id}")
        print(f"   Tenant: {scan_data.get('tenant_name', 'Unknown')}")
        print(f"   Location: {scan_data.get('location_name', 'Unknown')}")
        print(f"   Images: {len(images) if images else 0}")
        
        return queue_id
    
    async def get_pending_scans(self, limit: int = 10) -> List[Dict]:
        """
        Holt ausstehende Scans aus der Queue (pending oder failed mit retry_count < 5)
        
        Args:
            limit: Maximale Anzahl von Scans
            
        Returns:
            Liste von Scan-Dictionaries
        """
        await self.init_db()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute("""
                SELECT * FROM scan_queue
                WHERE webhook_status IN ('pending', 'failed')
                AND retry_count < 5
                ORDER BY created_at ASC
                LIMIT ?
            """, (limit,))
            
            rows = await cursor.fetchall()
            
            scans = []
            for row in rows:
                scans.append({
                    "id": row["id"],
                    "scan_data": json.loads(row["scan_data"]),
                    "images_data": json.loads(row["images_data"]) if row["images_data"] else [],
                    "webhook_status": row["webhook_status"],
                    "retry_count": row["retry_count"],
                    "last_attempt": row["last_attempt"],
                    "created_at": row["created_at"],
                    "error_message": row["error_message"]
                })
            
            return scans
    
    async def mark_as_sent(self, queue_id: str, target_scan_id: str = None):
        """
        Markiert einen Scan als erfolgreich gesendet
        
        Args:
            queue_id: ID des Queue-Eintrags
            target_scan_id: ID des Scans im ID-Check Service
        """
        now = datetime.now(timezone.utc).isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE scan_queue
                SET webhook_status = 'sent',
                    sent_at = ?,
                    target_scan_id = ?,
                    error_message = NULL
                WHERE id = ?
            """, (now, target_scan_id, queue_id))
            await db.commit()
        
        print(f"✅ [SQLite Queue] Scan marked as sent: {queue_id}")
        if target_scan_id:
            print(f"   Target Scan ID: {target_scan_id}")
    
    async def mark_as_failed(self, queue_id: str, error_message: str):
        """
        Markiert einen Scan als fehlgeschlagen und erhöht retry_count
        
        Args:
            queue_id: ID des Queue-Eintrags
            error_message: Fehlermeldung
        """
        now = datetime.now(timezone.utc).isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Hole aktuellen retry_count
            cursor = await db.execute(
                "SELECT retry_count FROM scan_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                new_retry_count = row[0] + 1
                new_status = 'failed' if new_retry_count < 5 else 'abandoned'
                
                await db.execute("""
                    UPDATE scan_queue
                    SET webhook_status = ?,
                        retry_count = ?,
                        last_attempt = ?,
                        error_message = ?
                    WHERE id = ?
                """, (new_status, new_retry_count, now, error_message, queue_id))
                await db.commit()
                
                print(f"❌ [SQLite Queue] Scan marked as {new_status}: {queue_id}")
                print(f"   Retry count: {new_retry_count}/5")
                print(f"   Error: {error_message[:100]}")
    
    async def get_queue_stats(self) -> Dict:
        """
        Gibt Statistiken über die Queue zurück
        
        Returns:
            Dictionary mit Statistiken (total, pending, sent, failed, abandoned)
        """
        await self.init_db()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN webhook_status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN webhook_status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN webhook_status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN webhook_status = 'abandoned' THEN 1 ELSE 0 END) as abandoned
                FROM scan_queue
            """)
            
            row = await cursor.fetchone()
            
            return {
                "total": row[0] or 0,
                "pending": row[1] or 0,
                "sent": row[2] or 0,
                "failed": row[3] or 0,
                "abandoned": row[4] or 0
            }
    
    async def get_scan_by_id(self, queue_id: str) -> Optional[Dict]:
        """
        Holt einen spezifischen Scan aus der Queue
        
        Args:
            queue_id: ID des Queue-Eintrags
            
        Returns:
            Scan-Dictionary oder None
        """
        await self.init_db()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            cursor = await db.execute(
                "SELECT * FROM scan_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return {
                    "id": row["id"],
                    "scan_data": json.loads(row["scan_data"]),
                    "images_data": json.loads(row["images_data"]) if row["images_data"] else [],
                    "webhook_status": row["webhook_status"],
                    "retry_count": row["retry_count"],
                    "last_attempt": row["last_attempt"],
                    "created_at": row["created_at"],
                    "sent_at": row["sent_at"],
                    "error_message": row["error_message"],
                    "target_scan_id": row["target_scan_id"]
                }
            
            return None
    
    async def cleanup_old_sent_scans(self, days: int = 30):
        """
        Löscht alte erfolgreich gesendete Scans (älter als X Tage)
        
        Args:
            days: Anzahl Tage, nach denen Scans gelöscht werden
        """
        from datetime import timedelta
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM scan_queue
                WHERE webhook_status = 'sent'
                AND sent_at < ?
            """, (cutoff_date,))
            
            deleted_count = cursor.rowcount
            await db.commit()
            
            if deleted_count > 0:
                print(f"🧹 [SQLite Queue] Cleaned up {deleted_count} old scans")
