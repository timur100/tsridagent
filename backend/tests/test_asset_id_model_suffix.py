"""
Test Erweitertes Asset-ID Format mit Modell-Suffixen
Format: [device_id]-[TYP]-[MODELL]
Beispiele: AAHC01-01-TAB-SP4 (Surface Pro 4), AAHC01-01-SCA-TSR (TSRID Scanner)

P0 Tests:
- Asset ID Format mit Modell-Suffix Backend API POST /api/asset-mgmt/devices/{device_id}/create-asset
- Alle Asset-Typen mit korrekten Suffixen
- Asset-ID Vorschau Format
- Asset-Typ Dropdown Suffixe

P1 Tests:
- Metadata Endpoint gibt korrekte Suffix-Map zurück
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://asset-id-formatter.preview.emergentagent.com"

# Erwartete Suffixe laut Anforderung
EXPECTED_SUFFIXES = {
    # Tablets
    'tab_sp4': 'TAB-SP4',    # Surface Pro 4
    'tab_sp6': 'TAB-SP6',    # Surface Pro 6
    'tab_tsr': 'TAB-TSR',    # TSRID Tablet
    # Scanner
    'sca_tsr': 'SCA-TSR',    # TSRID Scanner
    'sca_dsk': 'SCA-DSK',    # Desko Scanner
    # Tablet Docking
    'tdo_qer': 'TDO-QER',    # Quer Dock (Surface)
    'tdo_tsr': 'TDO-TSR',    # TSRID Tablet Dock
    # Scanner Docking
    'sdo_dsk': 'SDO-DSK',    # Desko Scanner Dock
    'sdo_tsr': 'SDO-TSR',    # TSRID Scanner Dock
    # Tablet PSU
    'tps_spx': 'TPS-SPX',    # Surface PSU
    'tps_tsr': 'TPS-TSR',    # TSRID Tablet PSU
    # Scanner PSU
    'sps_dsk': 'SPS-DSK',    # Desko Scanner PSU
    'sps_tsr': 'SPS-TSR',    # TSRID Scanner PSU
    # Extensions
    'usb': 'USB',
    'lan': 'LAN',
    '12v': '12V',
    # Kits
    'kit_sfd': 'KIT-SFD',    # Surface + Desko Kit
    'kit_tsr': 'KIT-TSR',    # TSRID Kit
    # Sonstiges
    'other': 'OTH'
}


class TestP1MetadataEndpoint:
    """P1: GET /api/asset-mgmt/metadata gibt korrekte Suffix-Map zurück"""
    
    def test_metadata_returns_all_suffixes(self):
        """Metadata Endpoint muss alle 19 Suffixe zurückgeben"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        assert response.status_code == 200, f"Metadata endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "asset_type_suffix_map" in data
        
        suffix_map = data["asset_type_suffix_map"]
        
        # Prüfe alle erwarteten Suffixe
        for asset_type, expected_suffix in EXPECTED_SUFFIXES.items():
            actual_suffix = suffix_map.get(asset_type)
            assert actual_suffix == expected_suffix, \
                f"Type '{asset_type}': erwartet '{expected_suffix}', erhalten '{actual_suffix}'"
        
        print(f"PASS: Alle {len(EXPECTED_SUFFIXES)} Asset-Typ Suffixe korrekt")
    
    def test_metadata_categories_contain_suffix(self):
        """Kategorien müssen Suffix-Info enthalten"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        data = response.json()
        
        categories = data.get("asset_type_categories", {})
        assert len(categories) > 0, "Keine Kategorien gefunden"
        
        # Prüfe dass alle Items in Kategorien suffix haben
        for category_name, items in categories.items():
            for item in items:
                assert "value" in item, f"Kategorie {category_name}: Item fehlt 'value'"
                assert "label" in item, f"Kategorie {category_name}: Item fehlt 'label'"
                assert "suffix" in item, f"Kategorie {category_name}: Item fehlt 'suffix'"
        
        print(f"PASS: {len(categories)} Kategorien enthalten Suffix-Info")


class TestP0AssetIDFormat:
    """P0: Asset ID Format mit Modell-Suffix testen"""
    
    @pytest.fixture(autouse=True)
    def get_test_device(self):
        """Hole ein Device ohne Asset für Tests"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/devices/all?has_asset=no&limit=1")
        devices = response.json().get("devices", [])
        if not devices:
            pytest.skip("Keine unverknüpften Devices verfügbar")
        self.test_device_id = devices[0]["device_id"]
        yield
    
    def test_create_asset_tab_sp4(self):
        """Surface Pro 4 Asset sollte TAB-SP4 Suffix haben"""
        # Erstelle Asset
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "tab_sp4", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        expected_asset_id = f"{self.test_device_id}-TAB-SP4"
        assert data.get("asset_id") == expected_asset_id, \
            f"Erwartet '{expected_asset_id}', erhalten '{data.get('asset_id')}'"
        
        print(f"PASS: Created {data.get('asset_id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
    
    def test_create_asset_tab_sp6(self):
        """Surface Pro 6 Asset sollte TAB-SP6 Suffix haben"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "tab_sp6", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        expected_asset_id = f"{self.test_device_id}-TAB-SP6"
        assert response.json().get("asset_id") == expected_asset_id
        
        print(f"PASS: Created {expected_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
    
    def test_create_asset_sca_tsr(self):
        """TSRID Scanner Asset sollte SCA-TSR Suffix haben"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "sca_tsr", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        expected_asset_id = f"{self.test_device_id}-SCA-TSR"
        assert response.json().get("asset_id") == expected_asset_id
        
        print(f"PASS: Created {expected_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
    
    def test_create_asset_sca_dsk(self):
        """Desko Scanner Asset sollte SCA-DSK Suffix haben"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "sca_dsk", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        expected_asset_id = f"{self.test_device_id}-SCA-DSK"
        assert response.json().get("asset_id") == expected_asset_id
        
        print(f"PASS: Created {expected_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
    
    def test_create_asset_kit_sfd(self):
        """Surface+Desko Kit Asset sollte KIT-SFD Suffix haben"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "kit_sfd", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        expected_asset_id = f"{self.test_device_id}-KIT-SFD"
        assert response.json().get("asset_id") == expected_asset_id
        
        print(f"PASS: Created {expected_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")
    
    def test_create_asset_kit_tsr(self):
        """TSRID Kit Asset sollte KIT-TSR Suffix haben"""
        response = requests.post(
            f"{BASE_URL}/api/asset-mgmt/devices/{self.test_device_id}/create-asset",
            json={"device_id": self.test_device_id, "asset_type": "kit_tsr", "additional_data": {}}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        expected_asset_id = f"{self.test_device_id}-KIT-TSR"
        assert response.json().get("asset_id") == expected_asset_id
        
        print(f"PASS: Created {expected_asset_id}")
        requests.delete(f"{BASE_URL}/api/asset-mgmt/assets/{expected_asset_id}")


class TestP0AllSuffixes:
    """P0: Alle Asset-Typen mit korrekten Suffixen testen"""
    
    def test_all_18_asset_types_have_correct_suffix(self):
        """Alle 18 Asset-Typen müssen korrekte Suffixe haben"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/metadata")
        suffix_map = response.json().get("asset_type_suffix_map", {})
        
        # Test all 18 types
        required_types = [
            ('tab_sp4', 'TAB-SP4'), ('tab_sp6', 'TAB-SP6'), ('tab_tsr', 'TAB-TSR'),
            ('sca_tsr', 'SCA-TSR'), ('sca_dsk', 'SCA-DSK'),
            ('tdo_qer', 'TDO-QER'), ('tdo_tsr', 'TDO-TSR'),
            ('sdo_dsk', 'SDO-DSK'), ('sdo_tsr', 'SDO-TSR'),
            ('tps_spx', 'TPS-SPX'), ('tps_tsr', 'TPS-TSR'),
            ('sps_dsk', 'SPS-DSK'), ('sps_tsr', 'SPS-TSR'),
            ('usb', 'USB'), ('lan', 'LAN'), ('12v', '12V'),
            ('kit_sfd', 'KIT-SFD'), ('kit_tsr', 'KIT-TSR')
        ]
        
        for asset_type, expected_suffix in required_types:
            assert suffix_map.get(asset_type) == expected_suffix, \
                f"Type '{asset_type}': erwartet '{expected_suffix}', erhalten '{suffix_map.get(asset_type)}'"
        
        print(f"PASS: Alle {len(required_types)} Asset-Typen haben korrekte Suffixe")


class TestExistingAssetsNewFormat:
    """Prüfe existierende Assets mit neuem Format"""
    
    def test_existing_assets_with_model_suffix(self):
        """Bereits erstellte Assets mit neuem Format prüfen"""
        response = requests.get(f"{BASE_URL}/api/asset-mgmt/assets?limit=50")
        assets = response.json().get("assets", [])
        
        # Erwartete Assets mit neuem Format laut Dokumentation
        expected_new_format = [
            "BERE01-01-TAB-SP4",
            "BERE02-01-SCA-TSR",
            "BERE03-01-SDO-DSK",
            "BERL01-01-KIT-SFD"
        ]
        
        found_assets = [a.get("asset_id") for a in assets]
        
        for expected_id in expected_new_format:
            assert expected_id in found_assets, f"Erwartet Asset {expected_id} nicht gefunden"
            print(f"FOUND: {expected_id}")
        
        print(f"PASS: Alle {len(expected_new_format)} erwarteten Assets mit neuem Format gefunden")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
