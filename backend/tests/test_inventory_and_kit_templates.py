"""
Test Suite for Inventory API and Kit Templates with Inventory Support
Tests:
1. Inventory Items CRUD (/api/inventory/items)
2. Inventory Categories (/api/inventory/categories)
3. Kit Templates with both device and inventory components
4. Kit availability calculation with inventory items
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bundle-inventory-pro.preview.emergentagent.com').rstrip('/')


class TestInventoryItemsAPI:
    """Test Inventory Items CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_item_ids = []
        yield
        # Cleanup test items
        for item_id in self.test_item_ids:
            try:
                requests.delete(f"{BASE_URL}/api/inventory/items/{item_id}")
            except:
                pass
    
    def test_list_inventory_items(self):
        """Test GET /api/inventory/items - List all items"""
        response = requests.get(f"{BASE_URL}/api/inventory/items")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "items" in data
        assert "total" in data
        assert "summary" in data
        assert isinstance(data["items"], list)
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary
        assert "low_stock" in summary
        assert "out_of_stock" in summary
        print(f"✓ Listed {len(data['items'])} inventory items")
    
    def test_create_inventory_item(self):
        """Test POST /api/inventory/items - Create new item"""
        test_item = {
            "name": f"TEST_Item_{uuid.uuid4().hex[:8]}",
            "category": "Kabel",
            "description": "Test item for automated testing",
            "quantity_in_stock": 100,
            "min_stock_level": 10,
            "unit": "Stück"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/items",
            json=test_item
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "item_id" in data
        assert "item" in data
        
        # Verify created item data
        created_item = data["item"]
        assert created_item["name"] == test_item["name"]
        assert created_item["category"] == test_item["category"]
        assert created_item["quantity_in_stock"] == test_item["quantity_in_stock"]
        
        self.test_item_ids.append(data["item_id"])
        print(f"✓ Created inventory item: {data['item_id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/inventory/items/{data['item_id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["success"] == True
        assert get_data["item"]["name"] == test_item["name"]
        print(f"✓ Verified item persistence via GET")
    
    def test_get_single_inventory_item(self):
        """Test GET /api/inventory/items/{id} - Get single item"""
        # First create an item
        test_item = {
            "name": f"TEST_GetItem_{uuid.uuid4().hex[:8]}",
            "category": "Adapter",
            "quantity_in_stock": 50
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/items", json=test_item)
        item_id = create_response.json()["item_id"]
        self.test_item_ids.append(item_id)
        
        # Get the item
        response = requests.get(f"{BASE_URL}/api/inventory/items/{item_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "item" in data
        assert data["item"]["name"] == test_item["name"]
        print(f"✓ Retrieved single item: {item_id}")
    
    def test_update_inventory_item(self):
        """Test PUT /api/inventory/items/{id} - Update item"""
        # Create item first
        test_item = {
            "name": f"TEST_UpdateItem_{uuid.uuid4().hex[:8]}",
            "category": "Zubehör",
            "quantity_in_stock": 20
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/items", json=test_item)
        item_id = create_response.json()["item_id"]
        self.test_item_ids.append(item_id)
        
        # Update the item
        update_data = {
            "name": f"TEST_UpdatedItem_{uuid.uuid4().hex[:8]}",
            "quantity_in_stock": 75
        }
        response = requests.put(
            f"{BASE_URL}/api/inventory/items/{item_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/inventory/items/{item_id}")
        get_data = get_response.json()
        assert get_data["item"]["name"] == update_data["name"]
        assert get_data["item"]["quantity_in_stock"] == update_data["quantity_in_stock"]
        print(f"✓ Updated and verified item: {item_id}")
    
    def test_delete_inventory_item(self):
        """Test DELETE /api/inventory/items/{id} - Delete item"""
        # Create item first
        test_item = {
            "name": f"TEST_DeleteItem_{uuid.uuid4().hex[:8]}",
            "category": "Hardware",
            "quantity_in_stock": 5
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/items", json=test_item)
        item_id = create_response.json()["item_id"]
        
        # Delete the item
        response = requests.delete(f"{BASE_URL}/api/inventory/items/{item_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/inventory/items/{item_id}")
        assert get_response.status_code == 404
        print(f"✓ Deleted and verified removal: {item_id}")
    
    def test_update_stock(self):
        """Test PUT /api/inventory/items/{id}/stock - Update stock quantity"""
        # Create item first
        test_item = {
            "name": f"TEST_StockItem_{uuid.uuid4().hex[:8]}",
            "category": "Kabel",
            "quantity_in_stock": 50
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/items", json=test_item)
        item_id = create_response.json()["item_id"]
        self.test_item_ids.append(item_id)
        
        # Add stock (+10)
        response = requests.put(f"{BASE_URL}/api/inventory/items/{item_id}/stock?quantity_change=10")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["new_quantity"] == 60
        
        # Remove stock (-5)
        response = requests.put(f"{BASE_URL}/api/inventory/items/{item_id}/stock?quantity_change=-5")
        assert response.status_code == 200
        data = response.json()
        assert data["new_quantity"] == 55
        print(f"✓ Stock update working: 50 -> 60 -> 55")
    
    def test_filter_by_category(self):
        """Test filtering items by category"""
        response = requests.get(f"{BASE_URL}/api/inventory/items?category=Kabel")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # All items should be in Kabel category
        for item in data["items"]:
            assert item["category"] == "Kabel"
        print(f"✓ Category filter working: {len(data['items'])} items in 'Kabel'")
    
    def test_search_items(self):
        """Test searching items"""
        response = requests.get(f"{BASE_URL}/api/inventory/items?search=USB")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Search working: {len(data['items'])} items matching 'USB'")


class TestInventoryCategoriesAPI:
    """Test Inventory Categories API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_category_ids = []
        yield
        # Cleanup test categories
        for cat_id in self.test_category_ids:
            try:
                requests.delete(f"{BASE_URL}/api/inventory/categories/{cat_id}")
            except:
                pass
    
    def test_list_categories(self):
        """Test GET /api/inventory/categories - List all categories"""
        response = requests.get(f"{BASE_URL}/api/inventory/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "categories" in data
        assert isinstance(data["categories"], list)
        
        # Should have default categories
        category_names = [c["name"] for c in data["categories"]]
        assert "Hardware" in category_names
        assert "Kabel" in category_names
        assert "Adapter" in category_names
        print(f"✓ Listed {len(data['categories'])} categories")
    
    def test_create_category(self):
        """Test POST /api/inventory/categories - Create new category"""
        test_category = {
            "name": f"TEST_Category_{uuid.uuid4().hex[:8]}",
            "description": "Test category for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/categories",
            json=test_category
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "category_id" in data
        
        self.test_category_ids.append(data["category_id"])
        print(f"✓ Created category: {data['category_id']}")
    
    def test_update_category(self):
        """Test PUT /api/inventory/categories/{id} - Update category"""
        # Create category first
        test_category = {
            "name": f"TEST_UpdateCat_{uuid.uuid4().hex[:8]}",
            "description": "Original description"
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/categories", json=test_category)
        cat_id = create_response.json()["category_id"]
        self.test_category_ids.append(cat_id)
        
        # Update the category
        update_data = {"name": f"TEST_UpdatedCat_{uuid.uuid4().hex[:8]}"}
        response = requests.put(
            f"{BASE_URL}/api/inventory/categories/{cat_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Updated category: {cat_id}")
    
    def test_toggle_category_visibility(self):
        """Test PUT /api/inventory/categories/{id}/visibility - Toggle visibility"""
        # Create category first
        test_category = {
            "name": f"TEST_VisCat_{uuid.uuid4().hex[:8]}",
            "description": "Test visibility toggle"
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory/categories", json=test_category)
        cat_id = create_response.json()["category_id"]
        self.test_category_ids.append(cat_id)
        
        # Toggle visibility
        response = requests.put(f"{BASE_URL}/api/inventory/categories/{cat_id}/visibility")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "visible" in data
        print(f"✓ Toggled visibility: {data['visible']}")
    
    def test_reorder_category(self):
        """Test PUT /api/inventory/categories/{id}/reorder - Reorder category"""
        # Get existing categories
        list_response = requests.get(f"{BASE_URL}/api/inventory/categories")
        categories = list_response.json()["categories"]
        
        if len(categories) > 1:
            cat_id = categories[0]["id"]
            
            # Move down
            response = requests.put(f"{BASE_URL}/api/inventory/categories/{cat_id}/reorder?direction=down")
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] == True
            print(f"✓ Reordered category: {cat_id}")
        else:
            pytest.skip("Not enough categories to test reorder")
    
    def test_delete_category_with_items_fails(self):
        """Test that deleting a category with items fails"""
        # Get categories
        list_response = requests.get(f"{BASE_URL}/api/inventory/categories")
        categories = list_response.json()["categories"]
        
        # Find a category with items (Kabel should have items)
        kabel_cat = next((c for c in categories if c["name"] == "Kabel"), None)
        if kabel_cat:
            response = requests.delete(f"{BASE_URL}/api/inventory/categories/{kabel_cat['id']}")
            # Should fail because category has items
            assert response.status_code == 400
            print(f"✓ Delete category with items correctly rejected")
        else:
            pytest.skip("Kabel category not found")


class TestKitTemplatesWithInventory:
    """Test Kit Templates with both device and inventory components"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_template_ids = []
        self.test_item_ids = []
        yield
        # Cleanup
        for template_id in self.test_template_ids:
            try:
                requests.delete(f"{BASE_URL}/api/kit-templates/{template_id}")
            except:
                pass
        for item_id in self.test_item_ids:
            try:
                requests.delete(f"{BASE_URL}/api/inventory/items/{item_id}")
            except:
                pass
    
    def test_get_inventory_for_kit_templates(self):
        """Test GET /api/inventory/for-kit-templates - Get items grouped by category"""
        response = requests.get(f"{BASE_URL}/api/inventory/for-kit-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "by_category" in data
        assert "total_items" in data
        
        # Verify structure
        for category, items in data["by_category"].items():
            assert isinstance(items, list)
            for item in items:
                assert "id" in item
                assert "name" in item
                assert "quantity_available" in item
                assert "unit" in item
        
        print(f"✓ Got {data['total_items']} items for kit templates")
    
    def test_create_kit_template_with_inventory_components(self):
        """Test creating a kit template with both device and inventory components"""
        # First get an inventory item ID
        items_response = requests.get(f"{BASE_URL}/api/inventory/items")
        items = items_response.json()["items"]
        
        if not items:
            pytest.skip("No inventory items available")
        
        inventory_item = items[0]
        
        # Create template with mixed components
        test_template = {
            "name": f"TEST_MixedKit_{uuid.uuid4().hex[:8]}",
            "description": "Kit with devices and inventory items",
            "tenant_id": "europcar",
            "components": [
                {
                    "source": "device",
                    "device_type": "tablet",
                    "quantity": 1
                },
                {
                    "source": "inventory",
                    "inventory_item_id": inventory_item["id"],
                    "inventory_item_name": inventory_item["name"],
                    "quantity": 2
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kit-templates/create",
            json=test_template
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "template_id" in data
        
        self.test_template_ids.append(data["template_id"])
        print(f"✓ Created mixed kit template: {data['template_id']}")
        
        # Verify template was created correctly
        get_response = requests.get(f"{BASE_URL}/api/kit-templates/{data['template_id']}")
        get_data = get_response.json()
        assert get_data["success"] == True
        
        template = get_data["template"]
        assert len(template["components"]) == 2
        
        # Verify device component
        device_comp = next((c for c in template["components"] if c.get("source") == "device"), None)
        assert device_comp is not None
        assert device_comp["device_type"] == "tablet"
        
        # Verify inventory component
        inv_comp = next((c for c in template["components"] if c.get("source") == "inventory"), None)
        assert inv_comp is not None
        assert inv_comp["inventory_item_id"] == inventory_item["id"]
        assert inv_comp["quantity"] == 2
        
        print(f"✓ Verified mixed components in template")
    
    def test_kit_availability_with_inventory(self):
        """Test kit availability calculation includes inventory items"""
        # Create an inventory item with known quantity
        test_item = {
            "name": f"TEST_AvailItem_{uuid.uuid4().hex[:8]}",
            "category": "Kabel",
            "quantity_in_stock": 10
        }
        item_response = requests.post(f"{BASE_URL}/api/inventory/items", json=test_item)
        item_id = item_response.json()["item_id"]
        self.test_item_ids.append(item_id)
        
        # Create template using this item
        test_template = {
            "name": f"TEST_AvailKit_{uuid.uuid4().hex[:8]}",
            "description": "Kit for availability testing",
            "tenant_id": "europcar",
            "components": [
                {
                    "source": "inventory",
                    "inventory_item_id": item_id,
                    "inventory_item_name": test_item["name"],
                    "quantity": 2  # Need 2 per kit
                }
            ]
        }
        
        template_response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=test_template)
        template_id = template_response.json()["template_id"]
        self.test_template_ids.append(template_id)
        
        # Check availability
        avail_response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}/availability")
        assert avail_response.status_code == 200
        
        avail_data = avail_response.json()
        assert avail_data["success"] == True
        assert "possible_kits" in avail_data
        assert "component_availability" in avail_data
        
        # With 10 items and 2 required per kit, should be able to make 5 kits
        assert avail_data["possible_kits"] == 5
        
        # Verify component availability details
        comp_avail = avail_data["component_availability"][0]
        assert comp_avail["source"] == "inventory"
        assert comp_avail["available"] == 10
        assert comp_avail["required"] == 2
        assert comp_avail["possible_kits"] == 5
        
        print(f"✓ Availability calculation correct: {avail_data['possible_kits']} kits possible")
    
    def test_update_template_with_inventory_components(self):
        """Test updating a kit template to add/modify inventory components"""
        # Get an inventory item
        items_response = requests.get(f"{BASE_URL}/api/inventory/items")
        items = items_response.json()["items"]
        
        if not items:
            pytest.skip("No inventory items available")
        
        # Create template with device only
        test_template = {
            "name": f"TEST_UpdateKit_{uuid.uuid4().hex[:8]}",
            "description": "Kit to be updated",
            "tenant_id": "europcar",
            "components": [
                {
                    "source": "device",
                    "device_type": "tablet",
                    "quantity": 1
                }
            ]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/kit-templates/create", json=test_template)
        template_id = create_response.json()["template_id"]
        self.test_template_ids.append(template_id)
        
        # Update to add inventory component
        update_data = {
            "components": [
                {
                    "source": "device",
                    "device_type": "tablet",
                    "quantity": 1
                },
                {
                    "source": "inventory",
                    "inventory_item_id": items[0]["id"],
                    "inventory_item_name": items[0]["name"],
                    "quantity": 3
                }
            ]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/kit-templates/{template_id}",
            json=update_data
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/kit-templates/{template_id}")
        template = get_response.json()["template"]
        
        assert len(template["components"]) == 2
        inv_comp = next((c for c in template["components"] if c.get("source") == "inventory"), None)
        assert inv_comp is not None
        assert inv_comp["quantity"] == 3
        
        print(f"✓ Updated template with inventory component")


class TestExistingInventoryData:
    """Test existing seed data"""
    
    def test_seed_inventory_items_exist(self):
        """Verify seed inventory items exist"""
        response = requests.get(f"{BASE_URL}/api/inventory/items")
        assert response.status_code == 200
        
        data = response.json()
        items = data["items"]
        
        # Should have the 3 seed items
        item_names = [i["name"] for i in items]
        
        # Check for expected items (may have TEST_ prefix items too)
        expected_items = ["USB-C Kabel 1m", "HDMI Adapter", "Displayport Kabel 2m"]
        for expected in expected_items:
            assert expected in item_names, f"Missing seed item: {expected}"
        
        print(f"✓ All seed inventory items present")
    
    def test_seed_categories_exist(self):
        """Verify default categories exist"""
        response = requests.get(f"{BASE_URL}/api/inventory/categories")
        assert response.status_code == 200
        
        data = response.json()
        categories = data["categories"]
        
        category_names = [c["name"] for c in categories]
        expected_categories = ["Hardware", "Kabel", "Adapter", "Zubehör", "Verbrauchsmaterial"]
        
        for expected in expected_categories:
            assert expected in category_names, f"Missing category: {expected}"
        
        print(f"✓ All default categories present")
    
    def test_existing_kit_templates(self):
        """Verify existing kit templates"""
        response = requests.get(f"{BASE_URL}/api/kit-templates/list")
        assert response.status_code == 200
        
        data = response.json()
        templates = data["templates"]
        
        assert len(templates) >= 1, "Should have at least one kit template"
        
        # Check Standard-Scanner-Kit exists
        standard_kit = next((t for t in templates if t["name"] == "Standard-Scanner-Kit"), None)
        if standard_kit:
            assert standard_kit["tenant_id"] == "europcar"
            assert len(standard_kit["components"]) >= 1
            print(f"✓ Standard-Scanner-Kit exists with {len(standard_kit['components'])} components")
        else:
            print(f"✓ Found {len(templates)} kit templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
