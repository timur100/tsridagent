"""
Retry Worker für fehlgeschlagene Webhooks
Läuft im Hintergrund und versucht automatisch fehlgeschlagene Webhooks erneut zu senden
"""
import asyncio
from datetime import datetime, timezone, timedelta
from services.sqlite_queue import ScanQueueService
from services.webhook_sender import WebhookSender


class RetryWorker:
    """
    Background Worker für Webhook-Wiederholungen
    
    Features:
    - Exponentieller Backoff
    - Automatische Wiederholung bei Fehlern
    - Maximale 5 Versuche
    - Läuft alle 5 Minuten
    """
    
    def __init__(self, interval_seconds: int = 300):  # 5 Minuten
        self.interval = interval_seconds
        self.queue_service = ScanQueueService()
        self.webhook_sender = WebhookSender()
        self.is_running = False
    
    def get_backoff_delay(self, retry_count: int) -> int:
        """
        Berechnet die Wartezeit basierend auf retry_count (Exponentieller Backoff)
        
        Args:
            retry_count: Anzahl der bisherigen Versuche
            
        Returns:
            Wartezeit in Sekunden
        """
        # Backoff: 1min, 5min, 15min, 30min, 60min
        backoff_delays = {
            0: 60,      # 1 Minute nach erstem Fehler
            1: 300,     # 5 Minuten
            2: 900,     # 15 Minuten
            3: 1800,    # 30 Minuten
            4: 3600     # 60 Minuten
        }
        
        return backoff_delays.get(retry_count, 3600)
    
    async def should_retry_scan(self, scan: dict) -> bool:
        """
        Prüft, ob ein Scan wiederholt werden soll basierend auf Zeit und retry_count
        
        Args:
            scan: Scan-Dictionary aus der Queue
            
        Returns:
            bool: True wenn Retry erfolgen soll
        """
        retry_count = scan.get('retry_count', 0)
        
        # Maximale 5 Versuche
        if retry_count >= 5:
            return False
        
        # Wenn noch nie versucht (pending), sofort senden
        if scan.get('webhook_status') == 'pending':
            return True
        
        # Wenn failed, prüfe ob genug Zeit vergangen ist
        last_attempt_str = scan.get('last_attempt')
        if not last_attempt_str:
            return True
        
        # Parse last_attempt
        try:
            last_attempt = datetime.fromisoformat(last_attempt_str.replace('Z', '+00:00'))
        except:
            # Fehler beim Parsen - versuche es trotzdem
            return True
        
        # Berechne wie lange wir warten müssen
        backoff_delay = self.get_backoff_delay(retry_count)
        next_retry_time = last_attempt + timedelta(seconds=backoff_delay)
        now = datetime.now(timezone.utc)
        
        # Wenn genug Zeit vergangen ist, retry
        should_retry = now >= next_retry_time
        
        if not should_retry:
            time_left = (next_retry_time - now).total_seconds()
            print(f"⏳ [Retry Worker] Scan {scan['id']}: Waiting {int(time_left)}s before retry {retry_count + 1}")
        
        return should_retry
    
    async def process_pending_scans(self):
        """
        Verarbeitet alle ausstehenden Scans in der Queue
        """
        try:
            # Hole pending/failed Scans
            pending_scans = await self.queue_service.get_pending_scans(limit=50)
            
            if not pending_scans:
                print("ℹ️  [Retry Worker] No pending scans")
                return
            
            print(f"🔄 [Retry Worker] Found {len(pending_scans)} pending scans")
            
            # Verarbeite jeden Scan
            success_count = 0
            skip_count = 0
            fail_count = 0
            
            for scan in pending_scans:
                queue_id = scan['id']
                retry_count = scan['retry_count']
                status = scan['webhook_status']
                
                # Prüfe ob Retry erfolgen soll
                if not await self.should_retry_scan(scan):
                    skip_count += 1
                    continue
                
                print(f"🔄 [Retry Worker] Processing scan {queue_id} (attempt {retry_count + 1}/5)")
                
                # Versuche zu senden
                success = await self.webhook_sender.send_scan_webhook(queue_id)
                
                if success:
                    success_count += 1
                else:
                    fail_count += 1
                
                # Kurze Pause zwischen Requests
                await asyncio.sleep(1)
            
            print(f"✅ [Retry Worker] Batch complete: {success_count} sent, {fail_count} failed, {skip_count} skipped")
        
        except Exception as e:
            print(f"❌ [Retry Worker] Error processing scans: {str(e)}")
    
    async def print_queue_stats(self):
        """
        Gibt Queue-Statistiken aus
        """
        try:
            stats = await self.queue_service.get_queue_stats()
            
            print("📊 [Retry Worker] Queue Statistics:")
            print(f"   Total: {stats['total']}")
            print(f"   Pending: {stats['pending']}")
            print(f"   Sent: {stats['sent']}")
            print(f"   Failed: {stats['failed']}")
            print(f"   Abandoned: {stats['abandoned']}")
        
        except Exception as e:
            print(f"❌ [Retry Worker] Error getting stats: {str(e)}")
    
    async def start(self):
        """
        Startet den Retry Worker im Hintergrund
        """
        self.is_running = True
        
        print("🚀 [Retry Worker] Starting...")
        print(f"   Interval: {self.interval}s")
        print(f"   Max retries: 5")
        
        # Teste Verbindung
        connection_ok = await self.webhook_sender.test_connection()
        if not connection_ok:
            print("⚠️  [Retry Worker] Warning: Connection test failed")
        
        iteration = 0
        
        while self.is_running:
            try:
                iteration += 1
                print(f"\n🔄 [Retry Worker] Iteration {iteration} - {datetime.now(timezone.utc).isoformat()}")
                
                # Zeige Statistiken
                await self.print_queue_stats()
                
                # Verarbeite pending Scans
                await self.process_pending_scans()
                
                # Cleanup alte Scans (alle 10 Iterationen = ~50 Minuten)
                if iteration % 10 == 0:
                    print("🧹 [Retry Worker] Running cleanup...")
                    await self.queue_service.cleanup_old_sent_scans(days=30)
                
            except Exception as e:
                print(f"❌ [Retry Worker] Iteration error: {str(e)}")
            
            # Warte bis zur nächsten Iteration
            print(f"⏸️  [Retry Worker] Sleeping for {self.interval}s...\n")
            await asyncio.sleep(self.interval)
    
    def stop(self):
        """
        Stoppt den Retry Worker
        """
        self.is_running = False
        print("🛑 [Retry Worker] Stopping...")


# Für standalone Ausführung
if __name__ == "__main__":
    import sys
    
    # Setze Python Path
    sys.path.insert(0, '/app/backend')
    
    print("=" * 60)
    print("🚀 Webhook Retry Worker")
    print("=" * 60)
    
    worker = RetryWorker()
    
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        worker.stop()
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)
