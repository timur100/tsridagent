"""
REGRESSION TEST SUITE
=====================
Stellt sicher, dass alle kritischen Funktionen nach Code-Änderungen funktionieren.

Ausführen mit: cd /app/backend && python -m pytest tests/test_regression.py -v
"""

import pytest
import os
import sys
import requests
from datetime import datetime
import uuid

# Setze den Pfad für Imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Lade die .env Datei
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# API URL - Für Tests innerhalb des Containers localhost verwenden
API_URL = 'http://localhost:8001'
print(f"[Regression Test] Using API_URL: {API_URL}")

# Test Tenant ID (TSR Technologies)
TEST_TENANT_ID = "9336297f-56d2-40a4-811d-560fd8164103"


class TestDatabaseConnection:
    """Tests für die Datenbank-Verbindung"""
    
    def test_mongo_url_is_atlas(self):
        """MONGO_URL muss auf Atlas zeigen, NICHT auf localhost"""
        mongo_url = os.environ.get('MONGO_URL', '')
        assert mongo_url, "MONGO_URL ist nicht gesetzt!"
        assert 'localhost' not in mongo_url, "MONGO_URL zeigt auf localhost! Muss Atlas sein!"
        assert '127.0.0.1' not in mongo_url, "MONGO_URL zeigt auf 127.0.0.1! Muss Atlas sein!"
        assert 'mongodb+srv://' in mongo_url or 'mongodb.net' in mongo_url, \
            "MONGO_URL scheint nicht auf MongoDB Atlas zu zeigen!"
    
    def test_db_connection_works(self):
        """Datenbank-Verbindung muss funktionieren"""
        from db.connection import get_mongo_client
        client = get_mongo_client()
        # Versuche einen einfachen Befehl
        result = client.admin.command('ping')
        assert result.get('ok') == 1, "MongoDB Ping fehlgeschlagen!"
    
    def test_portal_db_accessible(self):
        """portal_db muss zugänglich sein"""
        from db.connection import get_portal_db
        db = get_portal_db()
        # Zähle Collections
        collections = db.list_collection_names()
        assert 'tenant_locations' in collections, "tenant_locations Collection fehlt!"


class TestTenantAPI:
    """Tests für die Tenant-Verwaltung"""
    
    def test_get_tenants_list(self):
        """Tenant-Liste muss abrufbar sein"""
        response = requests.get(f"{API_URL}/api/tenants/", timeout=10)
        assert response.status_code == 200, f"Tenant-Liste Fehler: {response.status_code}"
        data = response.json()
        assert 'tenants' in data or isinstance(data, list), "Ungültiges Tenant-Response Format"
    
    def test_tsr_tenant_exists(self):
        """TSR Technologies Tenant muss existieren"""
        response = requests.get(f"{API_URL}/api/tenants/", timeout=10)
        assert response.status_code == 200
        data = response.json()
        tenants = data.get('tenants', data) if isinstance(data, dict) else data
        tenant_names = [t.get('name', '') for t in tenants]
        assert any('TSR' in name for name in tenant_names), \
            f"TSR Tenant nicht gefunden! Vorhandene: {tenant_names}"


class TestLocationAPI:
    """Tests für die Standort-Verwaltung"""
    
    def test_get_locations_for_tenant(self):
        """Standorte für einen Tenant müssen abrufbar sein"""
        response = requests.get(
            f"{API_URL}/api/tenant-locations/{TEST_TENANT_ID}",
            headers={"Authorization": "Bearer admin"},
            timeout=10
        )
        assert response.status_code == 200, f"Location-Abruf Fehler: {response.status_code}"
        data = response.json()
        assert 'locations' in data, "Keine 'locations' im Response"
        assert data.get('success') == True, "success != True"
    
    def test_create_and_delete_location(self):
        """Standort erstellen und löschen"""
        test_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        
        # Erstellen
        create_response = requests.post(
            f"{API_URL}/api/tenant-locations/{TEST_TENANT_ID}",
            headers={
                "Authorization": "Bearer admin",
                "Content-Type": "application/json"
            },
            json={
                "location_code": test_code,
                "station_name": "Regression Test Standort",
                "street": "Teststraße 1",
                "postal_code": "12345",
                "city": "Teststadt",
                "state": "TS",
                "country": "Deutschland",
                "continent": "Europa",
                "main_type": "C",
                "status": "active"
            },
            timeout=10
        )
        assert create_response.status_code == 200, \
            f"Standort erstellen fehlgeschlagen: {create_response.status_code} - {create_response.text}"
        
        create_data = create_response.json()
        assert create_data.get('success') == True, "Standort erstellen: success != True"
        location_id = create_data.get('location', {}).get('location_id')
        assert location_id, "Keine location_id im Response"
        
        # Prüfen ob in Liste
        list_response = requests.get(
            f"{API_URL}/api/tenant-locations/{TEST_TENANT_ID}",
            headers={"Authorization": "Bearer admin"},
            timeout=10
        )
        assert list_response.status_code == 200
        locations = list_response.json().get('locations', [])
        location_codes = [loc.get('location_code') for loc in locations]
        assert test_code in location_codes, \
            f"Erstellter Standort {test_code} nicht in Liste gefunden! Liste: {location_codes}"
        
        # Löschen
        delete_response = requests.delete(
            f"{API_URL}/api/tenant-locations/{TEST_TENANT_ID}/{location_id}",
            headers={"Authorization": "Bearer admin"},
            timeout=10
        )
        assert delete_response.status_code == 200, \
            f"Standort löschen fehlgeschlagen: {delete_response.status_code}"


class TestDeviceAgentAPI:
    """Tests für das Device Agent System"""
    
    def test_device_registration(self):
        """Gerät registrieren"""
        test_device_id = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        
        response = requests.post(
            f"{API_URL}/api/device-agent/register",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "computername": "REGRESSION-TEST",
                "hostname": "REGRESSION-TEST",
                "teamviewer_id": "123456789",
                "teamviewer_version": "15.50.0",
                "teamviewer_status": "running",
                "teamviewer_account_assigned": True,
                "teamviewer_account_email": "test@example.com",
                "teamviewer_account_company": "Test Company"
            },
            timeout=10
        )
        assert response.status_code == 200, \
            f"Device Registration fehlgeschlagen: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get('success') == True, "Device Registration: success != True"
        
        # Gerät abrufen und TeamViewer-Daten prüfen
        get_response = requests.get(
            f"{API_URL}/api/device-agent/devices/{test_device_id}",
            timeout=10
        )
        assert get_response.status_code == 200, "Device abrufen fehlgeschlagen"
        
        device_data = get_response.json().get('device', {})
        teamviewer = device_data.get('teamviewer', {})
        
        # TeamViewer Account-Daten müssen gespeichert sein (P0 Bug Fix)
        assert teamviewer.get('account_assigned') == True, \
            "TeamViewer account_assigned nicht gespeichert!"
        assert teamviewer.get('account_email') == "test@example.com", \
            "TeamViewer account_email nicht gespeichert!"
        assert teamviewer.get('account_company') == "Test Company", \
            "TeamViewer account_company nicht gespeichert!"
        
        # Cleanup - Gerät löschen
        requests.delete(
            f"{API_URL}/api/device-agent/devices/{test_device_id}",
            timeout=10
        )
    
    def test_device_heartbeat(self):
        """Device Heartbeat"""
        test_device_id = f"TEST-HB-{uuid.uuid4().hex[:6].upper()}"
        
        # Erst registrieren
        requests.post(
            f"{API_URL}/api/device-agent/register",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "computername": "HEARTBEAT-TEST"
            },
            timeout=10
        )
        
        # Heartbeat senden
        response = requests.post(
            f"{API_URL}/api/device-agent/heartbeat",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "computername": "HEARTBEAT-TEST",
                "teamviewer_status": "running",
                "tsrid_status": "running",
                "ip_address": "10.0.0.1"
            },
            timeout=10
        )
        assert response.status_code == 200, f"Heartbeat fehlgeschlagen: {response.status_code}"
        assert response.json().get('success') == True
        
        # Cleanup
        requests.delete(f"{API_URL}/api/device-agent/devices/{test_device_id}", timeout=10)
    
    def test_station_assignment_not_overwritten_by_agent(self):
        """
        P0 BUG TEST: Stationszuweisung darf NICHT vom Agent überschrieben werden!
        
        Szenario:
        1. Gerät registrieren
        2. Station zuweisen (Server-seitig)
        3. Agent sendet /register mit ANDERER location_code
        4. Server-seitige Zuweisung MUSS erhalten bleiben!
        """
        test_device_id = f"P0TEST-{uuid.uuid4().hex[:6].upper()}"
        correct_location = "TSRID00-01"
        wrong_location = "MUCT01"  # Der alte, falsche Wert
        
        print(f"\n[P0 TEST] Device ID: {test_device_id}")
        print(f"[P0 TEST] Correct location (server-assigned): {correct_location}")
        print(f"[P0 TEST] Wrong location (agent-sent): {wrong_location}")
        
        # 1. Gerät registrieren
        reg_response = requests.post(
            f"{API_URL}/api/device-agent/register",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "computername": "P0-BUG-TEST"
            },
            timeout=10
        )
        assert reg_response.status_code == 200, "Initial registration failed"
        
        # 2. Station zuweisen (simuliert Admin-Zuweisung)
        assign_response = requests.post(
            f"{API_URL}/api/device-agent/assign",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "location_code": correct_location,
                "location_name": "TSRID Hauptquartier",
                "device_number": 1,
                "tenant_id": "tsr-technologies",
                "assigned_by": "regression-test"
            },
            timeout=10
        )
        assert assign_response.status_code == 200, \
            f"Station assignment failed: {assign_response.status_code} - {assign_response.text}"
        
        # Verifiziere Zuweisung
        device_check = requests.get(
            f"{API_URL}/api/device-agent/devices/{test_device_id}",
            timeout=10
        )
        assert device_check.status_code == 200
        device_data = device_check.json().get('device', {})
        assert device_data.get('assigned') == True, "Device should be assigned"
        assert device_data.get('location_code') == correct_location, \
            f"Location should be {correct_location}, got {device_data.get('location_code')}"
        print(f"[P0 TEST] After assignment - location_code: {device_data.get('location_code')}, assigned: {device_data.get('assigned')}")
        
        # 3. Agent sendet /register mit FALSCHEM location_code
        print(f"[P0 TEST] Now sending register with WRONG location: {wrong_location}")
        bad_reg_response = requests.post(
            f"{API_URL}/api/device-agent/register",
            headers={"Content-Type": "application/json"},
            json={
                "device_id": test_device_id,
                "computername": "P0-BUG-TEST",
                "location_code": wrong_location,  # FALSCHE LOCATION!
                "hostname": "MUCT01-01"  # Alter, falscher Hostname
            },
            timeout=10
        )
        assert bad_reg_response.status_code == 200
        
        # 4. Prüfe dass die Server-Zuweisung NICHT überschrieben wurde!
        final_check = requests.get(
            f"{API_URL}/api/device-agent/devices/{test_device_id}",
            timeout=10
        )
        assert final_check.status_code == 200
        final_data = final_check.json().get('device', {})
        
        print(f"[P0 TEST] Final check - location_code: {final_data.get('location_code')}, assigned: {final_data.get('assigned')}")
        
        assert final_data.get('assigned') == True, \
            "assigned flag was reset! P0 BUG NOT FIXED!"
        assert final_data.get('location_code') == correct_location, \
            f"P0 BUG: location_code was overwritten! Expected '{correct_location}', got '{final_data.get('location_code')}'!"
        
        print(f"[P0 TEST] SUCCESS! Server-assigned location preserved after agent register.")
        
        # Cleanup
        requests.delete(f"{API_URL}/api/device-agent/devices/{test_device_id}", timeout=10)


class TestHealthEndpoints:
    """Tests für Health-Check Endpoints"""
    
    def test_backend_health(self):
        """Backend Health Check"""
        response = requests.get(f"{API_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health Check fehlgeschlagen: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
