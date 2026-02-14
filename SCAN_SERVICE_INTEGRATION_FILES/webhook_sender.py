"""
Webhook Sender Service
Sendet Scandaten an den ID-Check Service via HTTP POST
"""
import aiohttp
import aiofiles
import os
import json
from typing import Dict, Optional
from pathlib import Path
from services.sqlite_queue import ScanQueueService

# Environment variables
WEBHOOK_API_KEY = os.environ.get('WEBHOOK_API_KEY', '')
ID_CHECK_WEBHOOK_URL = os.environ.get(
    'ID_CHECK_WEBHOOK_URL',
    'https://inventory-check-in.preview.emergentagent.com/api/webhooks/scan-completed'
)
ID_CHECK_IMAGE_UPLOAD_URL = os.environ.get(
    'ID_CHECK_IMAGE_UPLOAD_URL',
    'https://inventory-check-in.preview.emergentagent.com/api/webhooks/scan-completed/upload-images'
)


class WebhookSender:
    """
    Service zum Senden von Webhooks an den ID-Check Service
    
    Features:
    - API Key Authentifizierung
    - Separate Bild-Uploads
    - Fehlerbehandlung
    - Integration mit SQLite Queue
    """
    
    def __init__(self):
        self.queue_service = ScanQueueService()
        self.api_key = WEBHOOK_API_KEY
        self.webhook_url = ID_CHECK_WEBHOOK_URL
        self.image_upload_url = ID_CHECK_IMAGE_UPLOAD_URL
    
    async def send_scan_webhook(self, queue_id: str) -> bool:
        """
        Sendet einen Scan aus der Queue an den ID-Check Service
        
        Args:
            queue_id: ID des Queue-Eintrags
            
        Returns:
            bool: True bei Erfolg, False bei Fehler
        """
        # Hole Scan aus Queue
        scan = await self.queue_service.get_scan_by_id(queue_id)
        
        if not scan:
            print(f"❌ [Webhook] Scan {queue_id} not found in queue")
            return False
        
        scan_data = scan["scan_data"]
        images_data = scan["images_data"]
        
        try:
            # Schritt 1: Sende Scan-Metadaten
            print(f"📤 [Webhook] Sending scan metadata for {queue_id}")
            target_scan_id = await self._send_scan_metadata(scan_data, images_data)
            
            if not target_scan_id:
                raise Exception("Failed to send scan metadata - no scan_id returned")
            
            # Schritt 2: Sende Bilder (falls vorhanden)
            if images_data and len(images_data) > 0:
                print(f"📤 [Webhook] Uploading {len(images_data)} images for scan {target_scan_id}")
                await self._send_scan_images(target_scan_id, images_data)
            
            # Markiere als erfolgreich gesendet
            await self.queue_service.mark_as_sent(queue_id, target_scan_id)
            
            print(f"✅ [Webhook] Scan successfully sent: {queue_id} → {target_scan_id}")
            return True
        
        except Exception as e:
            error_msg = str(e)
            print(f"❌ [Webhook] Error sending scan {queue_id}: {error_msg}")
            
            # Markiere als fehlgeschlagen
            await self.queue_service.mark_as_failed(queue_id, error_msg)
            
            return False
    
    async def _send_scan_metadata(self, scan_data: Dict, images_data: list) -> Optional[str]:
        """
        Sendet Scan-Metadaten an den Webhook-Endpunkt
        
        Args:
            scan_data: Dictionary mit Scandaten
            images_data: Liste mit Bild-Pfaden
            
        Returns:
            scan_id vom ID-Check Service oder None bei Fehler
        """
        # Bereite Form-Data vor
        form_data = aiohttp.FormData()
        
        # Pflichtfelder
        form_data.add_field('tenant_id', scan_data.get('tenant_id', ''))
        form_data.add_field('tenant_name', scan_data.get('tenant_name', ''))
        
        # Optionale Felder
        optional_fields = [
            'location_id', 'location_name', 'device_id', 'device_name',
            'scanner_id', 'scanner_name', 'scan_timestamp', 'document_type',
            'ip_address'
        ]
        
        for field in optional_fields:
            value = scan_data.get(field)
            if value:
                form_data.add_field(field, str(value))
        
        # JSON Felder
        if scan_data.get('extracted_data'):
            form_data.add_field('extracted_data', json.dumps(scan_data['extracted_data']))
        
        if scan_data.get('verification'):
            form_data.add_field('verification', json.dumps(scan_data['verification']))
        
        # Bild-Pfade
        if images_data:
            form_data.add_field('image_paths', json.dumps(images_data))
        
        # Sende Request
        headers = {
            'X-API-Key': self.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.webhook_url,
                data=form_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    scan_id = result.get('scan_id')
                    
                    print(f"✅ [Webhook] Metadata sent successfully")
                    print(f"   Scan ID: {scan_id}")
                    print(f"   Status: {result.get('status')}")
                    
                    return scan_id
                else:
                    error_text = await response.text()
                    raise Exception(f"HTTP {response.status}: {error_text}")
    
    async def _send_scan_images(self, scan_id: str, images_data: list):
        """
        Sendet Bilder für einen Scan an den Image-Upload-Endpunkt
        
        Args:
            scan_id: ID des Scans im ID-Check Service
            images_data: Liste mit [{type, file_path}, ...]
        """
        form_data = aiohttp.FormData()
        form_data.add_field('scan_id', scan_id)
        
        # Lade Bilder und füge zu FormData hinzu
        uploaded_count = 0
        
        for img in images_data:
            img_type = img.get('type')  # z.B. 'front_original', 'back_ir', etc.
            file_path = img.get('file_path')
            
            if not file_path or not os.path.exists(file_path):
                print(f"⚠️  [Webhook] Image file not found: {file_path}")
                continue
            
            try:
                # Lese Datei
                async with aiofiles.open(file_path, 'rb') as f:
                    file_content = await f.read()
                
                # Füge zu FormData hinzu
                filename = os.path.basename(file_path)
                form_data.add_field(
                    img_type,
                    file_content,
                    filename=filename,
                    content_type='image/jpeg'
                )
                
                uploaded_count += 1
                
            except Exception as e:
                print(f"⚠️  [Webhook] Error reading image {file_path}: {str(e)}")
        
        if uploaded_count == 0:
            print("⚠️  [Webhook] No images to upload")
            return
        
        # Sende Request
        headers = {
            'X-API-Key': self.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.image_upload_url,
                data=form_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ [Webhook] Images uploaded successfully")
                    print(f"   Uploaded: {result.get('images_uploaded')}/{uploaded_count}")
                else:
                    error_text = await response.text()
                    print(f"⚠️  [Webhook] Image upload warning: HTTP {response.status}")
                    print(f"   Error: {error_text[:200]}")
                    # Nicht als Fehler behandeln - Metadaten wurden bereits gesendet
    
    async def test_connection(self) -> bool:
        """
        Testet die Verbindung zum ID-Check Service
        
        Returns:
            bool: True bei Erfolg, False bei Fehler
        """
        health_url = self.webhook_url.replace('/scan-completed', '/health')
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    health_url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        print(f"✅ [Webhook] Connection test successful")
                        print(f"   Service: {result.get('service')}")
                        print(f"   Status: {result.get('status')}")
                        return True
                    else:
                        print(f"❌ [Webhook] Connection test failed: HTTP {response.status}")
                        return False
        
        except Exception as e:
            print(f"❌ [Webhook] Connection test error: {str(e)}")
            return False
