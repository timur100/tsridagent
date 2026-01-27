"""
Device Lifecycle Management API Tests
Tests all CRUD operations and lifecycle event tracking for devices
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://electron-sync.preview.emergentagent.com')

class TestDeviceLifecycleAPI:
    """Device Lifecycle Management API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_device_id = None
        yield
        # Cleanup: Delete test device if created
        if self.test_device_id:
            try:
                self.session.delete(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}")
            except:
                pass
    
    # ==================== GET Endpoints ====================
    
    def test_get_device_list(self):
        """GET /api/device-lifecycle/list - Liste aller Geräte"""
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "devices" in data
        assert "total" in data
        assert isinstance(data["devices"], list)
        print(f"✓ Device list returned {data['total']} devices")
    
    def test_get_device_list_with_filters(self):
        """GET /api/device-lifecycle/list - Mit Filtern"""
        # Filter by status
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list?status=active")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        for device in data["devices"]:
            assert device["status"] == "active"
        print(f"✓ Filtered by status=active: {len(data['devices'])} devices")
        
        # Filter by device_type
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list?device_type=tablet")
        assert response.status_code == 200
        data = response.json()
        for device in data["devices"]:
            assert device["device_type"] == "tablet"
        print(f"✓ Filtered by device_type=tablet: {len(data['devices'])} devices")
    
    def test_get_device_stats(self):
        """GET /api/device-lifecycle/stats - Statistiken"""
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "total" in stats
        assert "by_status" in stats
        assert "by_type" in stats
        assert "warranty_expiring_soon" in stats
        assert "license_expiring_soon" in stats
        print(f"✓ Stats: Total={stats['total']}, By Status={stats['by_status']}")
    
    def test_get_device_types(self):
        """GET /api/device-lifecycle/types - Gerätetypen"""
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/types")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "types" in data
        types = data["types"]
        # Check standard types exist
        assert "scanner_regula" in types
        assert "scanner_desko" in types
        assert "tablet" in types
        assert "printer" in types
        print(f"✓ Device types: {list(types.keys())}")
    
    def test_get_device_statuses(self):
        """GET /api/device-lifecycle/statuses - Status-Definitionen"""
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/statuses")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "statuses" in data
        statuses = data["statuses"]
        assert "active" in statuses
        assert "in_storage" in statuses
        assert "defective" in statuses
        assert "out_of_service" in statuses
        print(f"✓ Statuses: {list(statuses.keys())}")
    
    def test_get_event_types(self):
        """GET /api/device-lifecycle/event-types - Event-Typen"""
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/event-types")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "event_types" in data
        event_types = data["event_types"]
        assert "purchased" in event_types
        assert "assigned" in event_types
        assert "repaired" in event_types
        assert "note_added" in event_types
        print(f"✓ Event types: {list(event_types.keys())}")
    
    # ==================== CRUD Operations ====================
    
    def test_create_device(self):
        """POST /api/device-lifecycle/create - Neues Gerät erstellen"""
        unique_serial = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "device_type": "printer",
            "serial_number": unique_serial,
            "manufacturer": "HP",
            "model": "LaserJet Pro Test",
            "status": "in_storage",
            "notes": "Test device for pytest"
        }
        response = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "device_id" in data
        self.test_device_id = data["device_id"]
        print(f"✓ Created device: {unique_serial} (ID: {self.test_device_id})")
        
        # Verify device was created by GET
        get_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}")
        assert get_response.status_code == 200
        device = get_response.json()["device"]
        assert device["serial_number"] == unique_serial
        assert device["manufacturer"] == "HP"
        assert device["status"] == "in_storage"
        print(f"✓ Verified device creation via GET")
    
    def test_create_device_duplicate_serial(self):
        """POST /api/device-lifecycle/create - Duplicate serial number should fail"""
        # First create a device
        unique_serial = f"TEST-DUP-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "device_type": "tablet",
            "serial_number": unique_serial,
            "manufacturer": "Test",
            "model": "Test Model"
        }
        response = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=payload)
        assert response.status_code == 200
        self.test_device_id = response.json()["device_id"]
        
        # Try to create another with same serial
        response2 = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=payload)
        assert response2.status_code == 400
        assert "existiert bereits" in response2.json()["detail"]
        print(f"✓ Duplicate serial number correctly rejected")
    
    def test_get_single_device(self):
        """GET /api/device-lifecycle/{device_id} - Einzelnes Gerät"""
        # Get existing device
        list_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list?limit=1")
        devices = list_response.json()["devices"]
        if devices:
            device_id = devices[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "device" in data
            assert data["device"]["id"] == device_id
            print(f"✓ Retrieved device: {data['device']['serial_number']}")
    
    def test_get_device_not_found(self):
        """GET /api/device-lifecycle/{device_id} - Non-existent device"""
        fake_id = "000000000000000000000000"
        response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{fake_id}")
        assert response.status_code == 404
        print(f"✓ Non-existent device correctly returns 404")
    
    def test_update_device(self):
        """PUT /api/device-lifecycle/{device_id} - Gerät aktualisieren"""
        # Create a device first
        unique_serial = f"TEST-UPD-{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "device_type": "tablet",
            "serial_number": unique_serial,
            "manufacturer": "Microsoft",
            "model": "Surface Test",
            "status": "in_storage"
        }
        create_response = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=create_payload)
        self.test_device_id = create_response.json()["device_id"]
        
        # Update the device
        update_payload = {
            "status": "active",
            "assigned_location_code": "TEST01",
            "assigned_location_name": "Test Location"
        }
        response = self.session.put(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["events_created"] >= 1  # Status change and assignment events
        print(f"✓ Updated device, {data['events_created']} events created")
        
        # Verify update via GET
        get_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}")
        device = get_response.json()["device"]
        assert device["status"] == "active"
        assert device["assigned_location_code"] == "TEST01"
        print(f"✓ Verified update via GET")
    
    def test_delete_device(self):
        """DELETE /api/device-lifecycle/{device_id} - Gerät löschen"""
        # Create a device first
        unique_serial = f"TEST-DEL-{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "device_type": "docking_type1",
            "serial_number": unique_serial,
            "manufacturer": "Test",
            "model": "Delete Test"
        }
        create_response = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=create_payload)
        device_id = create_response.json()["device_id"]
        
        # Delete the device
        response = self.session.delete(f"{BASE_URL}/api/device-lifecycle/{device_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert unique_serial in data["message"]
        print(f"✓ Deleted device: {unique_serial}")
        
        # Verify deletion via GET
        get_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}")
        assert get_response.status_code == 404
        print(f"✓ Verified deletion - device returns 404")
        
        # Clear test_device_id since we already deleted
        self.test_device_id = None
    
    # ==================== Timeline & Events ====================
    
    def test_get_device_timeline(self):
        """GET /api/device-lifecycle/{device_id}/timeline - Timeline abrufen"""
        # Get existing device
        list_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list?limit=1")
        devices = list_response.json()["devices"]
        if devices:
            device_id = devices[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}/timeline")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "events" in data
            assert data["device_id"] == device_id
            print(f"✓ Timeline has {len(data['events'])} events")
    
    def test_add_lifecycle_event(self):
        """POST /api/device-lifecycle/{device_id}/event - Event hinzufügen"""
        # Create a device first
        unique_serial = f"TEST-EVT-{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "device_type": "scanner_regula",
            "serial_number": unique_serial,
            "manufacturer": "Regula",
            "model": "Test Scanner"
        }
        create_response = self.session.post(f"{BASE_URL}/api/device-lifecycle/create", json=create_payload)
        self.test_device_id = create_response.json()["device_id"]
        
        # Add an event
        event_payload = {
            "event_type": "note_added",
            "description": "Test note from pytest"
        }
        response = self.session.post(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}/event", json=event_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["event_type"] == "note_added"
        print(f"✓ Added event: note_added")
        
        # Verify event in timeline
        timeline_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/{self.test_device_id}/timeline")
        events = timeline_response.json()["events"]
        note_events = [e for e in events if e["event_type"] == "note_added"]
        assert len(note_events) >= 1
        assert note_events[0]["description"] == "Test note from pytest"
        print(f"✓ Verified event in timeline")
    
    def test_add_invalid_event_type(self):
        """POST /api/device-lifecycle/{device_id}/event - Invalid event type"""
        # Get existing device
        list_response = self.session.get(f"{BASE_URL}/api/device-lifecycle/list?limit=1")
        devices = list_response.json()["devices"]
        if devices:
            device_id = devices[0]["id"]
            event_payload = {
                "event_type": "invalid_event_type",
                "description": "This should fail"
            }
            response = self.session.post(f"{BASE_URL}/api/device-lifecycle/{device_id}/event", json=event_payload)
            assert response.status_code == 400
            assert "Ungültiger Event-Typ" in response.json()["detail"]
            print(f"✓ Invalid event type correctly rejected")


class TestDeviceLifecycleIntegration:
    """Integration tests for full device lifecycle flow"""
    
    def test_full_device_lifecycle(self):
        """Test complete device lifecycle: Create -> Update -> Add Events -> Delete"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # 1. Create device
        unique_serial = f"TEST-FULL-{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "device_type": "tablet",
            "serial_number": unique_serial,
            "manufacturer": "Apple",
            "model": "iPad Pro",
            "status": "in_storage",
            "purchase_date": "2024-01-15"
        }
        create_response = session.post(f"{BASE_URL}/api/device-lifecycle/create", json=create_payload)
        assert create_response.status_code == 200
        device_id = create_response.json()["device_id"]
        print(f"1. Created device: {unique_serial}")
        
        # 2. Verify initial timeline has creation event
        timeline_response = session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}/timeline")
        events = timeline_response.json()["events"]
        assert len(events) >= 1
        print(f"2. Initial timeline has {len(events)} event(s)")
        
        # 3. Update status to active and assign location
        update_payload = {
            "status": "active",
            "assigned_location_code": "MUCC01",
            "assigned_location_name": "München Flughafen"
        }
        update_response = session.put(f"{BASE_URL}/api/device-lifecycle/{device_id}", json=update_payload)
        assert update_response.status_code == 200
        print(f"3. Updated device status and location")
        
        # 4. Add repair event
        repair_event = {
            "event_type": "repaired",
            "description": "Screen replaced"
        }
        event_response = session.post(f"{BASE_URL}/api/device-lifecycle/{device_id}/event", json=repair_event)
        assert event_response.status_code == 200
        print(f"4. Added repair event")
        
        # 5. Verify timeline has all events
        final_timeline = session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}/timeline")
        final_events = final_timeline.json()["events"]
        event_types = [e["event_type"] for e in final_events]
        assert "repaired" in event_types
        assert "status_changed" in event_types or "assigned" in event_types
        print(f"5. Final timeline has {len(final_events)} events: {event_types}")
        
        # 6. Delete device
        delete_response = session.delete(f"{BASE_URL}/api/device-lifecycle/{device_id}")
        assert delete_response.status_code == 200
        print(f"6. Deleted device")
        
        # 7. Verify device is gone
        get_response = session.get(f"{BASE_URL}/api/device-lifecycle/{device_id}")
        assert get_response.status_code == 404
        print(f"7. Verified device deletion (404)")
        
        print(f"✓ Full lifecycle test completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
