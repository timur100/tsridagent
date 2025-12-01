#!/usr/bin/env python3
"""
Backend API Testing Suite - QUICK MENU FEATURE TESTING
Tests Quick Menu Backend APIs for tenant-specific customizable tiles (shortcuts):

Tiles Endpoints:
- POST /api/quick-menu/tiles/create - Create a new tile
- GET /api/quick-menu/tiles/tenant/{tenant_id} - Get all tiles for a tenant  
- PUT /api/quick-menu/tiles/update/{tile_id} - Update a tile
- DELETE /api/quick-menu/tiles/delete/{tile_id} - Delete a tile

Config Endpoints:
- GET /api/quick-menu/config/tenant/{tenant_id} - Get config for a tenant
- PUT /api/quick-menu/config/update/{tenant_id} - Update config for a tenant

Utility Endpoints:
- GET /api/quick-menu/tenants/list - Get list of all tenants

Test Data:
- Tenant ID: tenant-europcar (Europcar Deutschland)
- Alternative tenant: tenant-tsrid (TSRID GmbH)
"""

import requests
import json
import sys
from typing import Dict, Any, List
import pymongo
import os
import asyncio
import websockets
import jwt
from datetime import datetime, timezone
import time
import uuid

# Backend URL from environment
BACKEND_URL = "https://quicktiles-dash.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_BASE = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

# MongoDB connection for verification
MONGO_URL = "mongodb://localhost:27017"
mongo_client = pymongo.MongoClient(MONGO_URL)
tsrid_db = mongo_client['tsrid_db']

class QuickMenuTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        self.admin_token = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if not success or response_data:
            print(f"   Details: {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def authenticate_admin(self):
        """Authenticate as admin user (admin@tsrid.com)"""
        try:
            auth_data = {
                "email": "admin@tsrid.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{API_BASE}/portal/auth/login", json=auth_data)
            
            if response.status_code != 200:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    f"Authentication failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            if not data.get("access_token"):
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    "Authentication response missing access_token",
                    data
                )
                return False
            
            self.admin_token = data["access_token"]
            self.session.headers.update({
                'Authorization': f'Bearer {self.admin_token}'
            })
            
            # Decode token to verify claims
            try:
                decoded = jwt.decode(self.admin_token, options={"verify_signature": False})
                tenant_ids = decoded.get("tenant_ids", [])
                role = decoded.get("role", "")
                customer_id = decoded.get("customer_id", "")
                
                self.log_result(
                    "Admin Authentication", 
                    True, 
                    f"Successfully authenticated as admin@tsrid.com with role='{role}', customer_id='{customer_id}', tenant_ids={tenant_ids}"
                )
                return True
            except Exception as decode_error:
                self.log_result(
                    "Admin Authentication", 
                    False, 
                    f"Failed to decode JWT token: {str(decode_error)}"
                )
                return False
            
        except Exception as e:
            self.log_result(
                "Admin Authentication", 
                False, 
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_tenants_list_api(self):
        """Test GET /api/quick-menu/tenants/list - Should return 3 tenants: europcar, tsrid, demo"""
        try:
            response = self.session.get(f"{API_BASE}/quick-menu/tenants/list")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Tenants List API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Tenants List API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "tenants" not in data:
                self.log_result(
                    "GET Tenants List API",
                    False,
                    "Missing 'tenants' field in response",
                    data
                )
                return False
            
            tenants = data["tenants"]
            
            # Verify tenants is a list
            if not isinstance(tenants, list):
                self.log_result(
                    "GET Tenants List API",
                    False,
                    f"Tenants should be a list, got {type(tenants)}",
                    data
                )
                return False
            
            # Check expected count (should be 3 tenants)
            expected_count = 3
            actual_count = len(tenants)
            
            if actual_count != expected_count:
                self.log_result(
                    "GET Tenants List API",
                    False,
                    f"Expected {expected_count} tenants, got {actual_count}",
                    data
                )
                return False
            
            # Verify tenant structure and expected tenants
            expected_tenant_ids = ["tenant-europcar", "tenant-tsrid", "tenant-demo"]
            found_tenant_ids = []
            
            for tenant in tenants:
                required_fields = ["id", "name", "domain"]
                for field in required_fields:
                    if field not in tenant:
                        self.log_result(
                            "GET Tenants List API",
                            False,
                            f"Missing required field in tenant: {field}",
                            data
                        )
                        return False
                found_tenant_ids.append(tenant["id"])
            
            # Check if all expected tenants are present
            for expected_id in expected_tenant_ids:
                if expected_id not in found_tenant_ids:
                    self.log_result(
                        "GET Tenants List API",
                        False,
                        f"Expected tenant '{expected_id}' not found in response",
                        data
                    )
                    return False
            
            self.log_result(
                "GET Tenants List API",
                True,
                f"Successfully retrieved {actual_count} tenants: {', '.join(found_tenant_ids)}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Tenants List API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_create_tile_api(self):
        """Test POST /api/quick-menu/tiles/create - Create a new tile"""
        try:
            # Create tile data as specified in review request
            tile_data = {
                "tenant_id": "tenant-europcar",
                "title": "Reservierungsverwaltung",
                "description": "Alle Reservierungen verwalten",
                "icon": "Calendar",
                "color": "#00aa00",
                "target_url": "/portal/admin/europcar/reservations",
                "target_type": "internal",
                "order": 1
            }
            
            response = self.session.post(f"{API_BASE}/quick-menu/tiles/create", json=tile_data)
            
            if response.status_code != 200:
                self.log_result(
                    "POST Create Tile API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "POST Create Tile API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "tile" not in data:
                self.log_result(
                    "POST Create Tile API",
                    False,
                    "Missing 'tile' field in response",
                    data
                )
                return False
            
            tile = data["tile"]
            
            # Verify tile structure and data
            required_fields = ["tile_id", "tenant_id", "title", "description", "icon", "color", "target_url", "target_type", "order", "created_at", "updated_at"]
            for field in required_fields:
                if field not in tile:
                    self.log_result(
                        "POST Create Tile API",
                        False,
                        f"Missing required field in tile: {field}",
                        data
                    )
                    return False
            
            # Verify the data matches what we sent
            if tile["tenant_id"] != tile_data["tenant_id"]:
                self.log_result(
                    "POST Create Tile API",
                    False,
                    f"Tenant ID mismatch: expected {tile_data['tenant_id']}, got {tile['tenant_id']}",
                    data
                )
                return False
            
            if tile["title"] != tile_data["title"]:
                self.log_result(
                    "POST Create Tile API",
                    False,
                    f"Title mismatch: expected {tile_data['title']}, got {tile['title']}",
                    data
                )
                return False
            
            # Store tile_id for later tests
            self.created_tile_id = tile["tile_id"]
            
            self.log_result(
                "POST Create Tile API",
                True,
                f"Successfully created tile '{tile['title']}' with ID {tile['tile_id']} for tenant {tile['tenant_id']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "POST Create Tile API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_tiles_for_tenant_api(self):
        """Test GET /api/quick-menu/tiles/tenant/{tenant_id} - Get all tiles for a tenant"""
        try:
            tenant_id = "tenant-europcar"
            response = self.session.get(f"{API_BASE}/quick-menu/tiles/tenant/{tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "tiles" not in data:
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    "Missing 'tiles' field in response",
                    data
                )
                return False
            
            if "count" not in data:
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    "Missing 'count' field in response",
                    data
                )
                return False
            
            tiles = data["tiles"]
            
            # Verify tiles is a list
            if not isinstance(tiles, list):
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    f"Tiles should be a list, got {type(tiles)}",
                    data
                )
                return False
            
            # Verify count matches array length
            if data["count"] != len(tiles):
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    f"Count mismatch: count={data['count']}, array length={len(tiles)}",
                    data
                )
                return False
            
            # Should have at least 1 tile (the one we created)
            if len(tiles) < 1:
                self.log_result(
                    "GET Tiles for Tenant API",
                    False,
                    f"Expected at least 1 tile for tenant {tenant_id}, got {len(tiles)}",
                    data
                )
                return False
            
            # Verify tile structure
            if tiles:
                tile = tiles[0]
                required_fields = ["tile_id", "tenant_id", "title", "description", "icon", "color", "target_url", "target_type", "order"]
                for field in required_fields:
                    if field not in tile:
                        self.log_result(
                            "GET Tiles for Tenant API",
                            False,
                            f"Missing required field in tile: {field}",
                            data
                        )
                        return False
            
            self.log_result(
                "GET Tiles for Tenant API",
                True,
                f"Successfully retrieved {len(tiles)} tiles for tenant {tenant_id}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Tiles for Tenant API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_update_tile_api(self):
        """Test PUT /api/quick-menu/tiles/update/{tile_id} - Update a tile"""
        try:
            # Use the tile_id from the create test
            if not hasattr(self, 'created_tile_id'):
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    "No tile_id available from create test. Run create test first.",
                    None
                )
                return False
            
            tile_id = self.created_tile_id
            
            # Update tile data
            update_data = {
                "title": "Fahrzeuge & Flotte",
                "color": "#ff6600",  # Orange color
                "description": "Fahrzeugverwaltung und Flottenübersicht"
            }
            
            response = self.session.put(f"{API_BASE}/quick-menu/tiles/update/{tile_id}", json=update_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "tile" not in data:
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    "Missing 'tile' field in response",
                    data
                )
                return False
            
            tile = data["tile"]
            
            # Verify the updates were applied
            if tile["title"] != update_data["title"]:
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    f"Title not updated: expected {update_data['title']}, got {tile['title']}",
                    data
                )
                return False
            
            if tile["color"] != update_data["color"]:
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    f"Color not updated: expected {update_data['color']}, got {tile['color']}",
                    data
                )
                return False
            
            # Verify updated_at timestamp changed
            if "updated_at" not in tile:
                self.log_result(
                    "PUT Update Tile API",
                    False,
                    "Missing updated_at field in response",
                    data
                )
                return False
            
            self.log_result(
                "PUT Update Tile API",
                True,
                f"Successfully updated tile {tile_id}: title='{tile['title']}', color='{tile['color']}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "PUT Update Tile API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_get_tenant_config_api(self):
        """Test GET /api/quick-menu/config/tenant/{tenant_id} - Get config for a tenant"""
        try:
            tenant_id = "tenant-europcar"
            response = self.session.get(f"{API_BASE}/quick-menu/config/tenant/{tenant_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "GET Tenant Config API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Verify response structure
            if not data.get("success"):
                self.log_result(
                    "GET Tenant Config API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check data structure
            if "config" not in data:
                self.log_result(
                    "GET Tenant Config API",
                    False,
                    "Missing 'config' field in response",
                    data
                )
                return False
            
            config = data["config"]
            
            # Verify config structure (should return default config or existing config)
            required_fields = ["tenant_id", "title", "is_active"]
            for field in required_fields:
                if field not in config:
                    self.log_result(
                        "GET Tenant Config API",
                        False,
                        f"Missing required field in config: {field}",
                        data
                    )
                    return False
            
            # Verify tenant_id matches
            if config["tenant_id"] != tenant_id:
                self.log_result(
                    "GET Tenant Config API",
                    False,
                    f"Tenant ID mismatch: expected {tenant_id}, got {config['tenant_id']}",
                    data
                )
                return False
            
            self.log_result(
                "GET Tenant Config API",
                True,
                f"Successfully retrieved config for tenant {tenant_id}: title='{config['title']}', active={config['is_active']}"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "GET Tenant Config API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_update_tenant_config_api(self):
        """Test PUT /api/quick-menu/config/update/{tenant_id} - Update config for a tenant"""
        try:
            tenant_id = "tenant-europcar"
            
            # Update config data as specified in review request
            config_data = {
                "title": "Europcar Schnellmenü",
                "subtitle": "Schnellzugriff auf wichtige Funktionen",
                "is_active": True
            }
            
            response = self.session.put(f"{API_BASE}/quick-menu/config/update/{tenant_id}", json=config_data)
            
            if response.status_code != 200:
                self.log_result(
                    "PUT Update Config API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "PUT Update Config API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Check response structure
            if "config" not in data:
                self.log_result(
                    "PUT Update Config API",
                    False,
                    "Missing 'config' field in response",
                    data
                )
                return False
            
            config = data["config"]
            
            # Verify the updates were applied
            if config["title"] != config_data["title"]:
                self.log_result(
                    "PUT Update Config API",
                    False,
                    f"Title not updated: expected {config_data['title']}, got {config['title']}",
                    data
                )
                return False
            
            if config["subtitle"] != config_data["subtitle"]:
                self.log_result(
                    "PUT Update Config API",
                    False,
                    f"Subtitle not updated: expected {config_data['subtitle']}, got {config['subtitle']}",
                    data
                )
                return False
            
            if config["is_active"] != config_data["is_active"]:
                self.log_result(
                    "PUT Update Config API",
                    False,
                    f"is_active not updated: expected {config_data['is_active']}, got {config['is_active']}",
                    data
                )
                return False
            
            self.log_result(
                "PUT Update Config API",
                True,
                f"Successfully updated config for tenant {tenant_id}: title='{config['title']}', subtitle='{config['subtitle']}'"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "PUT Update Config API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    def test_delete_tile_api(self):
        """Test DELETE /api/quick-menu/tiles/delete/{tile_id} - Delete a tile"""
        try:
            # Use the tile_id from the create test
            if not hasattr(self, 'created_tile_id'):
                self.log_result(
                    "DELETE Tile API",
                    False,
                    "No tile_id available from create test. Run create test first.",
                    None
                )
                return False
            
            tile_id = self.created_tile_id
            
            response = self.session.delete(f"{API_BASE}/quick-menu/tiles/delete/{tile_id}")
            
            if response.status_code != 200:
                self.log_result(
                    "DELETE Tile API",
                    False,
                    f"Request failed. Status: {response.status_code}",
                    response.text
                )
                return False
            
            data = response.json()
            
            # Check if response indicates success
            if not data.get("success"):
                self.log_result(
                    "DELETE Tile API",
                    False,
                    "Response indicates failure",
                    data
                )
                return False
            
            # Verify the tile is actually deleted by trying to get tiles for tenant
            tenant_id = "tenant-europcar"
            verify_response = self.session.get(f"{API_BASE}/quick-menu/tiles/tenant/{tenant_id}")
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                if verify_data.get("success"):
                    tiles = verify_data.get("tiles", [])
                    # Check that our deleted tile is not in the list
                    for tile in tiles:
                        if tile.get("tile_id") == tile_id:
                            self.log_result(
                                "DELETE Tile API",
                                False,
                                f"Tile {tile_id} still exists after deletion",
                                verify_data
                            )
                            return False
            
            self.log_result(
                "DELETE Tile API",
                True,
                f"Successfully deleted tile {tile_id} and verified removal from tenant tiles list"
            )
            return True
            
        except Exception as e:
            self.log_result(
                "DELETE Tile API",
                False,
                f"Exception occurred: {str(e)}"
            )
            return False

    async def run_all_tests(self):
        """Run all Europcar PKW-Vermietungssystem API tests"""
        print("=" * 80)
        print("EUROPCAR PKW-VERMIETUNGSSYSTEM API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Testing APIs: Europcar Car Rental Management System")
        print(f"Database: tsrid_db collections: europcar_vehicles, europcar_customers, europcar_reservations, etc.")
        print("Expected Demo Data: 8 Fahrzeuge, 5 Kunden, 10 Reservierungen, 3 Schäden, 1 Station")
        print("=" * 80)
        print()
        
        try:
            # Step 1: Authenticate as Admin
            print("🔍 STEP 1: Admin Authentication")
            if not self.authenticate_admin():
                print("❌ Authentication failed. Cannot proceed with tests.")
                return
            print()
            
            # Step 2: Test Fahrzeugverwaltung APIs
            print("🚗 STEP 2: Fahrzeugverwaltung APIs")
            self.test_vehicles_list_api()
            self.test_vehicles_availability_check_api()
            print()
            
            # Step 3: Test Reservierungen APIs
            print("📋 STEP 3: Reservierungen APIs")
            self.test_reservations_list_api()
            print()
            
            # Step 4: Test Kunden APIs
            print("👥 STEP 4: Kunden APIs")
            self.test_customers_list_api()
            print()
            
            # Step 5: Test Analytics APIs
            print("📊 STEP 5: Analytics Dashboard APIs")
            self.test_analytics_dashboard_api()
            print()
            
            # Step 6: Test Stationen APIs
            print("🏢 STEP 6: Stationen APIs")
            self.test_stations_list_api()
            print()
            
            # Step 7: Test Schadenmanagement APIs
            print("🔧 STEP 7: Schadenmanagement APIs")
            self.test_damage_reports_list_api()
            print()
            
            # Step 8: Test Preisberechnung APIs
            print("💰 STEP 8: Preisberechnung APIs")
            self.test_pricing_calculate_api()
            print()
            
        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
        
        # Print summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "No tests run")
        print()
        
        if total - passed > 0:
            print("FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("=" * 80)


def main():
    """Main function to run the tests"""
    tester = EuropcarSystemTester()
    
    # Run tests
    import asyncio
    asyncio.run(tester.run_all_tests())


if __name__ == "__main__":
    main()
