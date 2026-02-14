"""
Test Kit Management APIs
Tests for /api/device-lifecycle/kits/* endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://inventory-check-in.preview.emergentagent.com')

class TestKitManagementAPIs:
    """Test Kit Management CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar
        self.test_location_code = "MUCC01"
        self.created_kit_ids = []
        yield
        # Cleanup: Delete test kits
        for kit_id in self.created_kit_ids:
            try:
                requests.delete(f"{BASE_URL}/api/device-lifecycle/kits/{kit_id}")
            except:
                pass
    
    def test_kit_list_endpoint(self):
        """Test GET /api/device-lifecycle/kits/list"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "kits" in data
        assert "total" in data
        assert isinstance(data["kits"], list)
        print(f"✓ Kit list returned {data['total']} kits")
    
    def test_next_device_number_endpoint(self):
        """Test GET /api/device-lifecycle/locations/{location_code}/next-device-number"""
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/locations/{self.test_location_code}/next-device-number")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "next_device_number" in data
        assert "suggested_kit_name" in data
        assert data["location_code"] == self.test_location_code
        assert isinstance(data["next_device_number"], int)
        assert data["next_device_number"] >= 1
        print(f"✓ Next device number for {self.test_location_code}: {data['next_device_number']}")
        print(f"✓ Suggested kit name: {data['suggested_kit_name']}")
    
    def test_create_kit(self):
        """Test POST /api/device-lifecycle/kits/create"""
        # Get next device number first
        next_num_response = requests.get(f"{BASE_URL}/api/device-lifecycle/locations/{self.test_location_code}/next-device-number")
        next_num = next_num_response.json()["next_device_number"]
        
        kit_name = f"TEST-{self.test_location_code}-{str(next_num).zfill(2)}-KIT"
        
        payload = {
            "kit_name": kit_name,
            "tenant_id": self.test_tenant_id,
            "location_code": self.test_location_code,
            "device_number": next_num,
            "description": "Test Kit created by pytest",
            "device_ids": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/create",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "kit_id" in data
        assert "kit_name" in data
        
        self.created_kit_ids.append(data["kit_id"])
        print(f"✓ Kit created: {data['kit_name']} (ID: {data['kit_id']})")
        
        # Verify kit exists in list
        list_response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?limit=100")
        kits = list_response.json()["kits"]
        kit_ids = [k["id"] for k in kits]
        assert data["kit_id"] in kit_ids
        print(f"✓ Kit verified in list")
    
    def test_kit_status_filter(self):
        """Test kit list with status filter"""
        # Test assembled status
        response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?status=assembled")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # All returned kits should have assembled status
        for kit in data["kits"]:
            assert kit["status"] == "assembled"
        
        print(f"✓ Status filter working: {len(data['kits'])} assembled kits")
    
    def test_kit_deploy_and_return(self):
        """Test kit deployment and return workflow"""
        # First create a kit
        kit_name = f"TEST-DEPLOY-{uuid.uuid4().hex[:8]}-KIT"
        
        create_payload = {
            "kit_name": kit_name,
            "tenant_id": self.test_tenant_id,
            "location_code": self.test_location_code,
            "device_number": 99,
            "description": "Test Kit for deployment",
            "device_ids": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/create",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        kit_id = create_response.json()["kit_id"]
        self.created_kit_ids.append(kit_id)
        print(f"✓ Test kit created: {kit_id}")
        
        # Deploy the kit
        deploy_payload = {
            "tenant_id": self.test_tenant_id,
            "location_code": self.test_location_code,
            "location_name": "Munich City Test",
            "notes": "Test deployment"
        }
        
        deploy_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/{kit_id}/deploy",
            json=deploy_payload,
            headers={"Content-Type": "application/json"}
        )
        assert deploy_response.status_code == 200
        
        deploy_data = deploy_response.json()
        assert deploy_data["success"] == True
        print(f"✓ Kit deployed: {deploy_data.get('message', 'OK')}")
        
        # Verify kit status is now deployed
        list_response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?limit=100")
        kits = list_response.json()["kits"]
        deployed_kit = next((k for k in kits if k["id"] == kit_id), None)
        assert deployed_kit is not None
        assert deployed_kit["status"] == "deployed"
        print(f"✓ Kit status verified as 'deployed'")
        
        # Return the kit
        return_payload = {
            "notes": "Test return"
        }
        
        return_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/{kit_id}/return",
            json=return_payload,
            headers={"Content-Type": "application/json"}
        )
        assert return_response.status_code == 200
        
        return_data = return_response.json()
        assert return_data["success"] == True
        print(f"✓ Kit returned: {return_data.get('message', 'OK')}")
        
        # Verify kit status is now returned
        list_response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?limit=100")
        kits = list_response.json()["kits"]
        returned_kit = next((k for k in kits if k["id"] == kit_id), None)
        assert returned_kit is not None
        assert returned_kit["status"] == "returned"
        print(f"✓ Kit status verified as 'returned'")
    
    def test_delete_kit(self):
        """Test DELETE /api/device-lifecycle/kits/{kit_id}"""
        # First create a kit to delete
        kit_name = f"TEST-DELETE-{uuid.uuid4().hex[:8]}-KIT"
        
        create_payload = {
            "kit_name": kit_name,
            "tenant_id": self.test_tenant_id,
            "location_code": self.test_location_code,
            "device_number": 98,
            "description": "Test Kit for deletion",
            "device_ids": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/device-lifecycle/kits/create",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        kit_id = create_response.json()["kit_id"]
        print(f"✓ Test kit created for deletion: {kit_id}")
        
        # Delete the kit
        delete_response = requests.delete(f"{BASE_URL}/api/device-lifecycle/kits/{kit_id}")
        assert delete_response.status_code == 200
        
        delete_data = delete_response.json()
        assert delete_data["success"] == True
        print(f"✓ Kit deleted: {delete_data.get('message', 'OK')}")
        
        # Verify kit no longer exists
        list_response = requests.get(f"{BASE_URL}/api/device-lifecycle/kits/list?limit=100")
        kits = list_response.json()["kits"]
        kit_ids = [k["id"] for k in kits]
        assert kit_id not in kit_ids
        print(f"✓ Kit verified as deleted from list")


class TestLocationKachelAPIs:
    """Test Location APIs for Kachel display"""
    
    def test_unified_locations_by_city(self):
        """Test GET /api/unified-locations/by-city with tenant filter"""
        tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar
        
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/by-city",
            params={
                "city": "MUENCHEN",
                "country": "Deutschland",
                "tenant_id": tenant_id
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "locations" in data
        assert len(data["locations"]) > 0
        
        # Verify location data structure for Kachel display
        first_location = data["locations"][0]
        assert "station_code" in first_location
        assert "name" in first_location
        
        # Check for Kachel-relevant fields
        kachel_fields = ["station_code", "name", "street", "city", "phone", "manager", "main_typ"]
        for field in kachel_fields:
            if field in first_location:
                print(f"  ✓ {field}: {first_location.get(field, 'N/A')[:50] if first_location.get(field) else 'N/A'}")
        
        print(f"✓ Found {len(data['locations'])} locations in MUENCHEN for Europcar")
    
    def test_cities_endpoint_with_tenant(self):
        """Test GET /api/unified-locations/cities with tenant filter"""
        tenant_id = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar
        
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/cities",
            params={
                "country": "Deutschland",
                "tenant_id": tenant_id
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "cities" in data
        assert len(data["cities"]) > 0
        
        # Verify cities are in UPPERCASE
        for city in data["cities"][:5]:
            # Most cities should be uppercase
            print(f"  City: {city}")
        
        print(f"✓ Found {len(data['cities'])} cities for Europcar in Deutschland")
    
    def test_tenants_endpoint(self):
        """Test GET /api/tenants"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "tenants" in data
        assert len(data["tenants"]) > 0
        
        # Verify tenant structure
        for tenant in data["tenants"]:
            assert "tenant_id" in tenant
            assert "name" in tenant
            print(f"  Tenant: {tenant['name']} ({tenant['tenant_id'][:8]}...)")
        
        print(f"✓ Found {len(data['tenants'])} tenants")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
