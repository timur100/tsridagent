"""
Tests for Enhanced Locations Tab in Asset Management V2
Features tested:
1. State field in location response
2. Cities array in filters
3. States array in filters
4. City filter parameter
5. State filter parameter
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLocationsEnhanced:
    """Tests for enhanced Locations tab features"""
    
    def test_locations_returns_state_field(self):
        """GET /api/asset-mgmt/locations should return state field in each location"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        assert 'locations' in data
        assert len(data['locations']) > 0
        
        # Check that state field is present in location
        first_location = data['locations'][0]
        assert 'state' in first_location, "Location should have 'state' field"
        assert 'location_id' in first_location
        assert 'city' in first_location
        assert 'postal_code' in first_location
        assert 'address' in first_location
    
    def test_locations_returns_cities_in_filters(self):
        """GET /api/asset-mgmt/locations should return cities array in filters"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        assert 'filters' in data
        assert 'cities' in data['filters'], "Filters should contain 'cities' array"
        
        cities = data['filters']['cities']
        assert isinstance(cities, list), "cities should be a list"
        assert len(cities) > 0, "cities list should not be empty"
        # Cities should be sorted alphabetically
        assert cities == sorted(cities), "cities should be sorted alphabetically"
    
    def test_locations_returns_states_in_filters(self):
        """GET /api/asset-mgmt/locations should return states array in filters"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        assert 'filters' in data
        assert 'states' in data['filters'], "Filters should contain 'states' array"
        
        states = data['filters']['states']
        assert isinstance(states, list), "states should be a list"
        assert len(states) > 0, "states list should not be empty"
        # States should be sorted alphabetically  
        assert states == sorted(states), "states should be sorted alphabetically"
    
    def test_city_filter_parameter(self):
        """GET /api/asset-mgmt/locations?city=BERLIN should filter by city"""
        # First get available cities
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        data = response.json()
        cities = data.get('filters', {}).get('cities', [])
        
        # Find a city that exists
        test_city = "BERLIN"
        if "BERLIN" not in cities and cities:
            test_city = cities[0]
        
        # Test city filter
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?city={test_city}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        
        locations = data.get('locations', [])
        if locations:
            # All results should match the filtered city (case-insensitive)
            for loc in locations:
                assert loc.get('city', '').upper() == test_city.upper(), \
                    f"Expected city {test_city}, got {loc.get('city')}"
    
    def test_state_filter_parameter(self):
        """GET /api/asset-mgmt/locations?state=BY should filter by state"""
        # First get available states
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        data = response.json()
        states = data.get('filters', {}).get('states', [])
        
        # Find a state that exists (BY = Bavaria)
        test_state = "BY"
        if "BY" not in states and states:
            test_state = states[0]
        
        # Test state filter
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?state={test_state}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        
        locations = data.get('locations', [])
        if locations:
            # All results should match the filtered state (case-insensitive)
            for loc in locations:
                assert loc.get('state', '').upper() == test_state.upper(), \
                    f"Expected state {test_state}, got {loc.get('state')}"
    
    def test_combined_city_and_state_filter(self):
        """GET /api/asset-mgmt/locations?city=X&state=Y should filter by both"""
        # Get filters first
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        data = response.json()
        
        # Test with München (Munich) which is in BY (Bavaria)
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?city=MUENCHEN&state=BY")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        # The API should handle combined filters
    
    def test_location_has_all_required_columns(self):
        """Verify location response has all required columns for the enhanced table"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        
        if data.get('locations'):
            location = data['locations'][0]
            # Required columns as per requirements
            required_fields = [
                'location_id',    # Location ID
                'name',           # Stationsname
                'address',        # Straße
                'postal_code',    # PLZ
                'city',           # Stadt
                'state',          # Bundesland
                'customer',       # Kunde
                'slot_count',     # Slots
                'status',         # Status
            ]
            
            for field in required_fields:
                assert field in location, f"Location should have '{field}' field"
    
    def test_filters_contain_german_bundesland_abbreviations(self):
        """States array should contain German Bundesland abbreviations"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations")
        assert response.status_code == 200
        
        data = response.json()
        states = data.get('filters', {}).get('states', [])
        
        # Common German Bundesland abbreviations
        expected_abbreviations = ['BY', 'NW', 'BE', 'HH', 'BW', 'HE', 'NI', 'SN', 'BB']
        
        # At least some of these should be present
        found = [s for s in expected_abbreviations if s in states]
        assert len(found) > 0, f"Expected to find some Bundesland abbreviations, got {states}"


class TestLocationsSearchAndFiltering:
    """Tests for search and combined filtering in locations"""
    
    def test_search_filter_with_station_name(self):
        """Search should find locations by station name"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?search=Flughafen")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
        # Should return results or empty list
    
    def test_search_filter_with_city_name(self):
        """Search should find locations by city name"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?search=Berlin")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True
    
    def test_search_filter_with_state(self):
        """Search should find locations by state"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/locations?search=BY")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
