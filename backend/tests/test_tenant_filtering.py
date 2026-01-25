"""
Test Multi-Tenant Filtering APIs for Unified Locations
Tests the new tenant endpoints and location filtering functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://offline-agent.preview.emergentagent.com')


class TestTenantAPIs:
    """Tests for tenant-related endpoints"""
    
    def test_get_all_tenants(self):
        """GET /api/unified-locations/tenants - Should return list of all tenants"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/tenants")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "tenants" in data
        assert "total" in data
        assert isinstance(data["tenants"], list)
        assert data["total"] >= 0
        
        # Verify tenant structure if tenants exist
        if data["tenants"]:
            tenant = data["tenants"][0]
            assert "tenant_id" in tenant
            assert "name" in tenant
    
    def test_get_tenants_hierarchy(self):
        """GET /api/unified-locations/tenants/hierarchy - Should return hierarchical tenant structure"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/tenants/hierarchy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "hierarchy" in data
        assert "total" in data
        
        hierarchy = data["hierarchy"]
        assert "continents" in hierarchy
        assert "countries" in hierarchy
        assert "stations" in hierarchy
        
        assert isinstance(hierarchy["continents"], list)
        assert isinstance(hierarchy["countries"], list)
        assert isinstance(hierarchy["stations"], list)
    
    def test_get_top_level_tenants(self):
        """GET /api/unified-locations/tenants/top-level - Should return top-level tenants"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/tenants/top-level")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "tenants" in data
        assert "total" in data
        assert isinstance(data["tenants"], list)


class TestLocationFiltering:
    """Tests for location filtering by tenant"""
    
    def test_get_all_locations_no_filter(self):
        """GET /api/unified-locations/all - Should return all locations without filter"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/all")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "locations" in data
        assert "total" in data
        assert "sync_timestamp" in data
        assert data["filtered_by_tenant"] is None
        
        # Verify location structure
        if data["locations"]:
            loc = data["locations"][0]
            assert "station_code" in loc
            assert "name" in loc
            assert "city" in loc
    
    def test_get_locations_filtered_by_europcar(self):
        """GET /api/unified-locations/all?tenant_id=europcar - Should return filtered locations"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/all?tenant_id=europcar")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "locations" in data
        assert data["filtered_by_tenant"] == "europcar"
        
        # Filtered results should be <= total unfiltered
        all_response = requests.get(f"{BASE_URL}/api/unified-locations/all")
        all_data = all_response.json()
        assert data["total"] <= all_data["total"]
    
    def test_get_locations_filtered_by_nonexistent_tenant(self):
        """GET /api/unified-locations/all?tenant_id=nonexistent - Should return empty or filtered results"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/all?tenant_id=nonexistent_tenant_xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "locations" in data
        # Should return 0 or very few results for non-existent tenant
        assert data["total"] >= 0


class TestTenantFilterByLevel:
    """Tests for filtering tenants by level"""
    
    def test_filter_tenants_by_continent_level(self):
        """GET /api/unified-locations/tenants?level=continent - Should return only continent-level tenants"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/tenants?level=continent")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # All returned tenants should be continent level
        for tenant in data["tenants"]:
            assert tenant.get("tenant_level") == "continent"
    
    def test_filter_tenants_by_country_level(self):
        """GET /api/unified-locations/tenants?level=country - Should return only country-level tenants"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/tenants?level=country")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # All returned tenants should be country level
        for tenant in data["tenants"]:
            assert tenant.get("tenant_level") == "country"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
