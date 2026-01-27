"""
Test suite for Unified Locations API - Stadt-Dropdown Bug Fix
Tests tenant filtering for cities and locations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://electron-sync.preview.emergentagent.com')

# Test tenant ID for Europcar
EUROPCAR_TENANT_ID = "1d3653db-86cb-4dd1-9ef5-0236b116def8"


class TestTenantsAPI:
    """Tests for /api/tenants endpoint"""
    
    def test_get_tenants_returns_success(self):
        """Test that tenants endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "tenants" in data
        print(f"✓ Found {len(data['tenants'])} tenants")
    
    def test_europcar_tenant_exists(self):
        """Test that Europcar tenant exists"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        data = response.json()
        
        europcar = next((t for t in data["tenants"] if t["name"] == "Europcar"), None)
        assert europcar is not None, "Europcar tenant not found"
        assert europcar["tenant_id"] == EUROPCAR_TENANT_ID
        print(f"✓ Europcar tenant found with ID: {europcar['tenant_id']}")


class TestContinentsAPI:
    """Tests for /api/unified-locations/continents endpoint"""
    
    def test_get_continents_returns_success(self):
        """Test that continents endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/continents")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "continents" in data
        assert len(data["continents"]) > 0
        print(f"✓ Found continents: {data['continents']}")
    
    def test_europa_continent_exists(self):
        """Test that Europa continent exists"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/continents")
        assert response.status_code == 200
        data = response.json()
        assert "Europa" in data["continents"]
        print("✓ Europa continent found")


class TestCountriesAPI:
    """Tests for /api/unified-locations/countries endpoint"""
    
    def test_get_countries_for_europa(self):
        """Test that countries endpoint returns countries for Europa"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/countries?continent=Europa")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "countries" in data
        assert len(data["countries"]) > 0
        print(f"✓ Found {len(data['countries'])} countries in Europa")
    
    def test_deutschland_exists_in_europa(self):
        """Test that Deutschland exists in Europa"""
        response = requests.get(f"{BASE_URL}/api/unified-locations/countries?continent=Europa")
        assert response.status_code == 200
        data = response.json()
        assert "Deutschland" in data["countries"]
        print("✓ Deutschland found in Europa")


class TestCitiesAPI:
    """Tests for /api/unified-locations/cities endpoint - BUG FIX VERIFICATION"""
    
    def test_get_cities_with_tenant_filter(self):
        """Test that cities endpoint returns cities filtered by tenant"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/cities",
            params={"country": "Deutschland", "tenant_id": EUROPCAR_TENANT_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "cities" in data
        assert len(data["cities"]) > 0
        assert data["tenant_id"] == EUROPCAR_TENANT_ID
        print(f"✓ Found {len(data['cities'])} cities for Europcar in Deutschland")
    
    def test_cities_are_uppercase(self):
        """BUG FIX: Test that cities are in UPPERCASE (from tenant_locations)"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/cities",
            params={"country": "Deutschland", "tenant_id": EUROPCAR_TENANT_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that most cities are uppercase
        uppercase_count = sum(1 for city in data["cities"] if city.isupper())
        total_cities = len(data["cities"])
        uppercase_ratio = uppercase_count / total_cities if total_cities > 0 else 0
        
        print(f"✓ {uppercase_count}/{total_cities} cities are UPPERCASE ({uppercase_ratio*100:.1f}%)")
        
        # At least 90% should be uppercase (some may have mixed case like "Schwäbisch-Gmünd")
        assert uppercase_ratio >= 0.9, f"Expected >90% uppercase cities, got {uppercase_ratio*100:.1f}%"
    
    def test_berlin_in_cities(self):
        """Test that BERLIN is in the cities list"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/cities",
            params={"country": "Deutschland", "tenant_id": EUROPCAR_TENANT_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for BERLIN (uppercase)
        assert "BERLIN" in data["cities"], "BERLIN not found in cities list"
        print("✓ BERLIN found in cities list (UPPERCASE)")


class TestLocationsByCityAPI:
    """Tests for /api/unified-locations/by-city endpoint"""
    
    def test_get_locations_by_city_with_tenant(self):
        """Test that locations are filtered by tenant"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/by-city",
            params={
                "city": "BERLIN",
                "country": "Deutschland",
                "tenant_id": EUROPCAR_TENANT_ID
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "locations" in data
        assert len(data["locations"]) > 0
        assert data["tenant_id"] == EUROPCAR_TENANT_ID
        print(f"✓ Found {len(data['locations'])} locations in BERLIN for Europcar")
    
    def test_locations_have_tenant_info(self):
        """Test that locations include tenant information"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/by-city",
            params={
                "city": "BERLIN",
                "country": "Deutschland",
                "tenant_id": EUROPCAR_TENANT_ID
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check first location has tenant info
        if data["locations"]:
            loc = data["locations"][0]
            assert "tenant_id" in loc or "tenant_name" in loc
            print(f"✓ Location has tenant info: {loc.get('tenant_name', loc.get('tenant_id'))}")
    
    def test_berlin_locations_have_station_codes(self):
        """Test that Berlin locations have valid station codes"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/by-city",
            params={
                "city": "BERLIN",
                "country": "Deutschland",
                "tenant_id": EUROPCAR_TENANT_ID
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that locations have station codes
        for loc in data["locations"][:5]:
            assert "station_code" in loc
            assert loc["station_code"], f"Empty station_code for location"
            print(f"  Station: {loc['station_code']} - {loc.get('name', 'N/A')}")


class TestMuenchenLocations:
    """Test MUENCHEN locations to verify bug fix"""
    
    def test_muenchen_in_cities(self):
        """Test that MUENCHEN is in the cities list"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/cities",
            params={"country": "Deutschland", "tenant_id": EUROPCAR_TENANT_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for MUENCHEN (uppercase)
        assert "MUENCHEN" in data["cities"], "MUENCHEN not found in cities list"
        print("✓ MUENCHEN found in cities list (UPPERCASE)")
    
    def test_muenchen_locations(self):
        """Test that MUENCHEN has locations"""
        response = requests.get(
            f"{BASE_URL}/api/unified-locations/by-city",
            params={
                "city": "MUENCHEN",
                "country": "Deutschland",
                "tenant_id": EUROPCAR_TENANT_ID
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["locations"]) > 0
        print(f"✓ Found {len(data['locations'])} locations in MUENCHEN")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
