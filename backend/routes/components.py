from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os
import uuid
from routes.portal_auth import verify_token
from db.connection import get_mongo_client

router = APIRouter(prefix="/api/components", tags=["Components"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db = get_mongo_client()['test_database']

# ==================== Models ====================

class Component(BaseModel):
    """Individual hardware component"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    component_type: str  # tablet, scanner, docking_station, accessory, pc
    identification_type: str  # SN-PC, SN-SC, SN-DC, Article_Number, Barcode, QR_Code
    identification_value: str  # The actual serial number or article number
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    quantity_in_stock: int = 0
    min_stock_level: int = 5
    unit: str = "Stück"
    storage_location: Optional[str] = None  # e.g., "Regal A-3-2"
    description: Optional[str] = ""
    notes: Optional[str] = ""
    images: List[str] = []  # List of image URLs/base64
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ComponentCreate(BaseModel):
    name: str
    component_type: str
    identification_type: str
    identification_value: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    quantity_in_stock: int = 0
    min_stock_level: int = 5
    unit: str = "Stück"
    storage_location: Optional[str] = None  # e.g., "Regal A-3-2"
    description: Optional[str] = ""
    notes: Optional[str] = ""
    images: List[str] = []  # List of image URLs/base64

class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    component_type: Optional[str] = None
    identification_type: Optional[str] = None
    identification_value: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    quantity_in_stock: Optional[int] = None
    min_stock_level: Optional[int] = None
    unit: Optional[str] = None
    storage_location: Optional[str] = None  # e.g., "Regal A-3-2"
    description: Optional[str] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = None  # List of image URLs/base64

class ComponentTemplate(BaseModel):
    """Template for standard component sets"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_name: str
    article_number: Optional[str] = None  # NL-SET-001 format for new location sets
    description: Optional[str] = ""
    components: List[Dict[str, Any]]  # List of {component_id, quantity}
    customer_type: Optional[str] = None  # For different customer requirements
    shop_enabled: bool = False  # Template visible in shop
    shop_category: Optional[str] = None  # airport, corporate, agency
    shop_display_name: Optional[str] = None
    shop_description: Optional[str] = None
    shop_priority: int = 0  # For sorting in shop
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ComponentTemplateCreate(BaseModel):
    template_name: str
    article_number: Optional[str] = None  # NL-SET-001
    description: Optional[str] = ""
    components: List[Dict[str, Any]]
    customer_type: Optional[str] = None
    shop_enabled: bool = False
    shop_category: Optional[str] = None
    shop_display_name: Optional[str] = None
    shop_description: Optional[str] = None
    shop_priority: int = 0

class ComponentTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    article_number: Optional[str] = None  # NL-SET-001
    description: Optional[str] = None
    components: Optional[List[Dict[str, Any]]] = None
    customer_type: Optional[str] = None
    shop_enabled: Optional[bool] = None
    shop_category: Optional[str] = None
    shop_display_name: Optional[str] = None
    shop_description: Optional[str] = None
    shop_priority: Optional[int] = None

class ComponentSet(BaseModel):
    """Assembled component set"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    set_id: str  # Format: AAHC01-01-S
    template_id: Optional[str] = None
    components: List[Dict[str, Any]]  # List of {component_id, component_name, serial_number, quantity}
    status: str = "assembled"  # assembled, deployed, in_storage, decommissioned
    location_code: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    deployed_at: Optional[str] = None
    notes: Optional[str] = ""

class ComponentSetCreate(BaseModel):
    template_id: Optional[str] = None
    components: List[Dict[str, Any]]
    status: str = "assembled"
    location_code: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = ""

class ComponentSetUpdate(BaseModel):
    status: Optional[str] = None
    location_code: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class DemandCalculationRequest(BaseModel):
    template_id: str
    target_sets: int  # Number of sets to build

class LabelGenerationRequest(BaseModel):
    component_id: str

# ==================== Component CRUD ====================

@router.post("/create")
def create_component(
    component_data: ComponentCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new component"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Create component object
        component = Component(**component_data.model_dump())
        
        # Convert to dict for MongoDB
        component_dict = component.model_dump()
        
        # Check if identification_value already exists
        existing = db.components.find_one({
            "identification_type": component_dict["identification_type"],
            "identification_value": component_dict["identification_value"]
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Component with {component_dict['identification_type']} '{component_dict['identification_value']}' already exists"
            )
        
        # Insert into MongoDB
        db.components.insert_one(component_dict)
        
        # Remove _id for response
        response_component = component_dict.copy()
        if '_id' in response_component:
            del response_component['_id']
        
        return {
            "success": True,
            "message": "Component created successfully",
            "component_id": component.id,
            "component": response_component
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def get_components(
    component_type: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    token_data: dict = Depends(verify_token)
):
    """Get all components with optional filtering"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {}
        
        if component_type:
            query['component_type'] = component_type
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'identification_value': {'$regex': search, '$options': 'i'}},
                {'manufacturer': {'$regex': search, '$options': 'i'}},
                {'model': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get components
        components_cursor = db.components.find(query)
        components = []
        
        for component in components_cursor:
            # Remove MongoDB _id
            if '_id' in component:
                del component['_id']
            
            # Check if low stock
            is_low_stock = component.get('quantity_in_stock', 0) <= component.get('min_stock_level', 5)
            component['is_low_stock'] = is_low_stock
            
            # Filter by low stock if requested
            if low_stock_only and not is_low_stock:
                continue
            
            components.append(component)
        
        # Get summary statistics
        total_components = len(components)
        low_stock_count = sum(1 for c in components if c.get('is_low_stock', False))
        out_of_stock_count = sum(1 for c in components if c.get('quantity_in_stock', 0) == 0)
        
        # Count by type
        by_type = {}
        for component in components:
            comp_type = component.get('component_type', 'unknown')
            by_type[comp_type] = by_type.get(comp_type, 0) + 1
        
        return {
            "success": True,
            "components": components,
            "summary": {
                "total": total_components,
                "low_stock": low_stock_count,
                "out_of_stock": out_of_stock_count,
                "by_type": by_type
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{component_id}")
def get_component(
    component_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific component by ID"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        component = db.components.find_one({"id": component_id})
        
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")
        
        # Remove MongoDB _id
        if '_id' in component:
            del component['_id']
        
        # Add low stock flag
        component['is_low_stock'] = component.get('quantity_in_stock', 0) <= component.get('min_stock_level', 5)
        
        return {
            "success": True,
            "component": component
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{component_id}")
def update_component(
    component_id: str,
    update_data: ComponentUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update a component"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if component exists
        existing = db.components.find_one({"id": component_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Component not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update in MongoDB
        db.components.update_one(
            {"id": component_id},
            {"$set": update_dict}
        )
        
        # Get updated component
        updated_component = db.components.find_one({"id": component_id})
        if '_id' in updated_component:
            del updated_component['_id']
        
        return {
            "success": True,
            "message": "Component updated successfully",
            "component": updated_component
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{component_id}")
def delete_component(
    component_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a component"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if component exists
        existing = db.components.find_one({"id": component_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Component not found")
        
        # Check if component is used in any sets
        sets_using = db.component_sets.find_one({
            "components.component_id": component_id
        })
        
        if sets_using:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete component. It is used in one or more component sets."
            )
        
        # Delete from MongoDB
        db.components.delete_one({"id": component_id})
        
        return {
            "success": True,
            "message": "Component deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Template CRUD ====================

@router.post("/templates/create")
def create_template(
    template_data: ComponentTemplateCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new component template"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Generate NL-SET article number if not provided
        template_dict = template_data.model_dump()
        if not template_dict.get('article_number'):
            template_dict['article_number'] = generate_nl_set_article_number()
        
        # Create template object
        template = ComponentTemplate(**template_dict)
        
        # Convert to dict for MongoDB
        template_dict = template.model_dump()
        
        # Validate that all components exist
        for comp in template_dict['components']:
            component = db.components.find_one({"id": comp.get("component_id")})
            if not component:
                raise HTTPException(
                    status_code=400,
                    detail=f"Component with ID {comp.get('component_id')} not found"
                )
        
        # Insert into MongoDB
        db.component_templates.insert_one(template_dict)
        
        # Remove _id for response
        response_template = template_dict.copy()
        if '_id' in response_template:
            del response_template['_id']
        
        return {
            "success": True,
            "message": "Template created successfully",
            "template_id": template.id,
            "article_number": template.article_number,
            "template": response_template
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/list")
def get_templates(
    customer_type: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all component templates"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {}
        if customer_type:
            query['customer_type'] = customer_type
        
        # Get templates
        templates_cursor = db.component_templates.find(query)
        templates = []
        
        for template in templates_cursor:
            # Remove MongoDB _id
            if '_id' in template:
                del template['_id']
            
            # Enrich with component details
            enriched_components = []
            for comp in template.get('components', []):
                component = db.components.find_one({"id": comp.get("component_id")})
                if component:
                    if '_id' in component:
                        del component['_id']
                    enriched_components.append({
                        **comp,
                        "component_name": component.get("name"),
                        "component_type": component.get("component_type"),
                        "identification_type": component.get("identification_type")
                    })
            
            template['components'] = enriched_components
            templates.append(template)
        
        return {
            "success": True,
            "templates": templates
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}")
def get_template(
    template_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific template by ID"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        template = db.component_templates.find_one({"id": template_id})
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Remove MongoDB _id
        if '_id' in template:
            del template['_id']
        
        # Enrich with component details
        enriched_components = []
        for comp in template.get('components', []):
            component = db.components.find_one({"id": comp.get("component_id")})
            if component:
                if '_id' in component:
                    del component['_id']
                enriched_components.append({
                    **comp,
                    "component_name": component.get("name"),
                    "component_type": component.get("component_type"),
                    "identification_type": component.get("identification_type"),
                    "quantity_in_stock": component.get("quantity_in_stock", 0)
                })
        
        template['components'] = enriched_components
        
        return {
            "success": True,
            "template": template
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/templates/{template_id}")
def update_template(
    template_id: str,
    update_data: ComponentTemplateUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update a template"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if template exists
        existing = db.component_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Validate components if provided
        if 'components' in update_dict:
            for comp in update_dict['components']:
                component = db.components.find_one({"id": comp.get("component_id")})
                if not component:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Component with ID {comp.get('component_id')} not found"
                    )
        
        # Update in MongoDB
        db.component_templates.update_one(
            {"id": template_id},
            {"$set": update_dict}
        )
        
        # Get updated template
        updated_template = db.component_templates.find_one({"id": template_id})
        if '_id' in updated_template:
            del updated_template['_id']
        
        return {
            "success": True,
            "message": "Template updated successfully",
            "template": updated_template
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}")
def delete_template(
    template_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a template"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if template exists
        existing = db.component_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if template is used in any sets
        sets_using = db.component_sets.find_one({"template_id": template_id})
        
        if sets_using:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete template. It is used in one or more component sets."
            )
        
        # Delete from MongoDB
        db.component_templates.delete_one({"id": template_id})
        
        return {
            "success": True,
            "message": "Template deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Component Set CRUD ====================

def generate_nl_set_article_number():
    """Generate next NL-SET article number in format NL-SET-XXX"""
    # Get the highest existing NL-SET number
    existing_templates = list(db.component_templates.find(
        {"article_number": {"$regex": "^NL-SET-"}},
        {"article_number": 1}
    ))
    
    if not existing_templates:
        return "NL-SET-001"
    
    # Extract numbers and find the max
    numbers = []
    for template in existing_templates:
        article_num = template.get('article_number', '')
        if article_num.startswith('NL-SET-'):
            try:
                num = int(article_num.split('-')[-1])
                numbers.append(num)
            except (ValueError, IndexError):
                continue
    
    next_num = max(numbers) + 1 if numbers else 1
    return f"NL-SET-{next_num:03d}"

def generate_set_id(location_code=None):
    """Generate a unique Set ID in format {LocationCode}-SET-{count:02d}"""
    if not location_code:
        # Fallback if no location provided
        location_code = "GEN"
    
    # Get the count of existing sets for this location
    count = db.component_sets.count_documents({"location_code": location_code}) + 1
    # Format: {LocationCode}-SET-{count:02d}
    return f"{location_code}-SET-{count:02d}"

@router.post("/sets/create")
def create_component_set(
    set_data: ComponentSetCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new component set"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Generate Set ID
        set_id = generate_set_id(set_data.location_code)
        
        # Create set object
        component_set = ComponentSet(
            set_id=set_id,
            **set_data.model_dump()
        )
        
        # Convert to dict for MongoDB
        set_dict = component_set.model_dump()
        
        # Validate that all components exist and reduce stock
        for comp in set_dict['components']:
            component = db.components.find_one({"id": comp.get("component_id")})
            if not component:
                raise HTTPException(
                    status_code=400,
                    detail=f"Component with ID {comp.get('component_id')} not found"
                )
            
            # Check if sufficient stock available
            required_quantity = comp.get("quantity", 1)
            available_quantity = component.get("quantity_in_stock", 0)
            
            if available_quantity < required_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for component '{component.get('name')}'. Required: {required_quantity}, Available: {available_quantity}"
                )
            
            # Reduce stock
            db.components.update_one(
                {"id": comp.get("component_id")},
                {
                    "$set": {
                        "quantity_in_stock": available_quantity - required_quantity,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        # Insert into MongoDB
        db.component_sets.insert_one(set_dict)
        
        # Remove _id for response
        response_set = set_dict.copy()
        if '_id' in response_set:
            del response_set['_id']
        
        return {
            "success": True,
            "message": "Component set created successfully",
            "set_id": set_id,
            "component_set": response_set
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sets/list")
def get_component_sets(
    status: Optional[str] = None,
    location_code: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get all component sets"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {}
        if status:
            query['status'] = status
        if location_code:
            query['location_code'] = location_code
        
        # Get sets
        sets_cursor = db.component_sets.find(query)
        sets = []
        
        for set_item in sets_cursor:
            # Remove MongoDB _id
            if '_id' in set_item:
                del set_item['_id']
            
            sets.append(set_item)
        
        # Get summary statistics
        total_sets = len(sets)
        by_status = {}
        for set_item in sets:
            status = set_item.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1
        
        return {
            "success": True,
            "sets": sets,
            "summary": {
                "total": total_sets,
                "by_status": by_status
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sets/{set_id}")
def get_component_set(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Get a specific component set by set_id"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        component_set = db.component_sets.find_one({"set_id": set_id})
        
        if not component_set:
            raise HTTPException(status_code=404, detail="Component set not found")
        
        # Remove MongoDB _id
        if '_id' in component_set:
            del component_set['_id']
        
        return {
            "success": True,
            "component_set": component_set
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sets/{set_id}")
def update_component_set(
    set_id: str,
    update_data: ComponentSetUpdate,
    token_data: dict = Depends(verify_token)
):
    """Update a component set"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if set exists
        existing = db.component_sets.find_one({"set_id": set_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Component set not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # If status is being changed to 'deployed', set deployed_at timestamp
        if update_dict.get('status') == 'deployed' and existing.get('status') != 'deployed':
            update_dict['deployed_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update in MongoDB
        db.component_sets.update_one(
            {"set_id": set_id},
            {"$set": update_dict}
        )
        
        # Get updated set
        updated_set = db.component_sets.find_one({"set_id": set_id})
        if '_id' in updated_set:
            del updated_set['_id']
        
        return {
            "success": True,
            "message": "Component set updated successfully",
            "component_set": updated_set
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sets/{set_id}")
def delete_component_set(
    set_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete a component set and restore component stock"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if set exists
        existing = db.component_sets.find_one({"set_id": set_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Component set not found")
        
        # Restore component stock
        for comp in existing.get('components', []):
            component = db.components.find_one({"id": comp.get("component_id")})
            if component:
                restored_quantity = component.get("quantity_in_stock", 0) + comp.get("quantity", 1)
                db.components.update_one(
                    {"id": comp.get("component_id")},
                    {
                        "$set": {
                            "quantity_in_stock": restored_quantity,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
        
        # Delete from MongoDB
        db.component_sets.delete_one({"set_id": set_id})
        
        return {
            "success": True,
            "message": "Component set deleted successfully and stock restored"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Demand Calculation ====================

@router.post("/demand-calculation")
def calculate_demand(
    request: DemandCalculationRequest,
    token_data: dict = Depends(verify_token)
):
    """Calculate component demand to build target number of sets"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get template
        template = db.component_templates.find_one({"id": request.template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Calculate demand
        demand_result = []
        can_build_sets = request.target_sets
        shortages = []
        
        for comp_ref in template.get('components', []):
            component_id = comp_ref.get('component_id')
            required_per_set = comp_ref.get('quantity', 1)
            total_required = required_per_set * request.target_sets
            
            # Get component details
            component = db.components.find_one({"id": component_id})
            if not component:
                continue
            
            current_stock = component.get('quantity_in_stock', 0)
            shortage = max(0, total_required - current_stock)
            sets_can_build = current_stock // required_per_set if required_per_set > 0 else 0
            
            # Update can_build_sets to minimum
            can_build_sets = min(can_build_sets, sets_can_build)
            
            demand_item = {
                "component_id": component_id,
                "component_name": component.get('name'),
                "component_type": component.get('component_type'),
                "identification_type": component.get('identification_type'),
                "identification_value": component.get('identification_value'),
                "required_per_set": required_per_set,
                "total_required": total_required,
                "current_stock": current_stock,
                "shortage": shortage,
                "sets_can_build": sets_can_build,
                "is_sufficient": shortage == 0
            }
            
            demand_result.append(demand_item)
            
            if shortage > 0:
                shortages.append({
                    "component_name": component.get('name'),
                    "shortage": shortage,
                    "unit": component.get('unit', 'Stück')
                })
        
        # Low stock alerts
        low_stock_components = []
        for item in demand_result:
            component = db.components.find_one({"id": item['component_id']})
            if component:
                min_stock_level = component.get('min_stock_level', 5)
                if item['current_stock'] <= min_stock_level:
                    low_stock_components.append({
                        "component_name": item['component_name'],
                        "current_stock": item['current_stock'],
                        "min_stock_level": min_stock_level
                    })
        
        return {
            "success": True,
            "template_id": request.template_id,
            "template_name": template.get('template_name'),
            "target_sets": request.target_sets,
            "can_build_sets": can_build_sets,
            "all_components_available": len(shortages) == 0,
            "demand": demand_result,
            "shortages": shortages,
            "low_stock_alerts": low_stock_components
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Label Generation ====================

@router.post("/generate-label")
def generate_label(
    request: LabelGenerationRequest,
    token_data: dict = Depends(verify_token)
):
    """Generate a label for a component"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get component
        component = db.components.find_one({"id": request.component_id})
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")
        
        # Generate label data
        label_data = {
            "component_id": component.get('id'),
            "component_name": component.get('name'),
            "component_type": component.get('component_type'),
            "identification_type": component.get('identification_type'),
            "identification_value": component.get('identification_value'),
            "manufacturer": component.get('manufacturer', ''),
            "model": component.get('model', ''),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "label_format": "QR_CODE"  # Can be extended to support different formats
        }
        
        return {
            "success": True,
            "message": "Label data generated successfully",
            "label": label_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Dashboard Statistics ====================

@router.get("/dashboard/stats")
def get_dashboard_stats(
    token_data: dict = Depends(verify_token)
):
    """Get component management statistics for dashboard widget"""
    try:
        # Check if user is admin
        if token_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Component statistics
        total_components = db.components.count_documents({})
        low_stock_components = db.components.count_documents({
            "$expr": {"$lte": ["$quantity_in_stock", "$min_stock_level"]}
        })
        out_of_stock_components = db.components.count_documents({"quantity_in_stock": 0})
        
        # Template statistics
        total_templates = db.component_templates.count_documents({})
        
        # Set statistics
        total_sets = db.component_sets.count_documents({})
        assembled_sets = db.component_sets.count_documents({"status": "assembled"})
        deployed_sets = db.component_sets.count_documents({"status": "deployed"})
        
        # Low stock list (top 5)
        low_stock_list = []
        components_cursor = db.components.find({
            "$expr": {"$lte": ["$quantity_in_stock", "$min_stock_level"]}
        }).limit(5)
        
        for component in components_cursor:
            if '_id' in component:
                del component['_id']
            low_stock_list.append({
                "name": component.get('name'),
                "current_stock": component.get('quantity_in_stock', 0),
                "min_stock_level": component.get('min_stock_level', 5),
                "component_type": component.get('component_type')
            })
        
        return {
            "success": True,
            "stats": {
                "components": {
                    "total": total_components,
                    "low_stock": low_stock_components,
                    "out_of_stock": out_of_stock_components
                },
                "templates": {
                    "total": total_templates
                },
                "sets": {
                    "total": total_sets,
                    "assembled": assembled_sets,
                    "deployed": deployed_sets
                }
            },
            "low_stock_alerts": low_stock_list
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Shop APIs ====================

@router.get("/shop/templates")
def get_shop_templates(
    category: Optional[str] = None
):
    """Get shop-enabled templates for customer ordering (no auth required for viewing)"""
    try:
        # Build query for shop-enabled templates
        query = {"shop_enabled": True}
        
        if category:
            query['shop_category'] = category
        
        # Get templates sorted by priority
        templates_cursor = db.component_templates.find(query).sort("shop_priority", -1)
        templates = []
        
        for template in templates_cursor:
            # Remove MongoDB _id
            if '_id' in template:
                del template['_id']
            
            # Check component availability and collect images
            all_available = True
            total_components = 0
            component_images = []
            
            for comp_ref in template.get('components', []):
                component = db.components.find_one({"id": comp_ref.get('component_id')})
                if component:
                    total_components += 1
                    required = comp_ref.get('quantity', 1)
                    available = component.get('quantity_in_stock', 0)
                    if available < required:
                        all_available = False
                    
                    # Collect first image from each component (max 4 images for display)
                    comp_imgs = component.get('images', [])
                    if comp_imgs and len(component_images) < 4:
                        component_images.append(comp_imgs[0])
            
            template['available'] = all_available
            template['component_count'] = total_components
            template['component_images'] = component_images  # First image from each component
            
            # Use first component image as main image_url if not set
            if not template.get('image_url') and component_images:
                template['image_url'] = component_images[0]
            
            templates.append(template)
        
        return {
            "success": True,
            "templates": templates
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shop/check-availability")
def check_cart_availability(
    cart_items: List[Dict[str, Any]],
    token_data: dict = Depends(verify_token)
):
    """
    Check availability for cart items (templates or individual components)
    cart_items: [{"type": "template|component", "id": "...", "quantity": 1}]
    """
    try:
        results = []
        all_available = True
        
        for item in cart_items:
            item_type = item.get('type')
            item_id = item.get('id')
            item_quantity = item.get('quantity', 1)
            
            if item_type == 'template':
                # Check template availability
                template = db.component_templates.find_one({"id": item_id})
                if not template:
                    results.append({
                        "item": item,
                        "available": False,
                        "message": "Template nicht gefunden"
                    })
                    all_available = False
                    continue
                
                missing_components = []
                
                for comp_ref in template.get('components', []):
                    component = db.components.find_one({"id": comp_ref.get('component_id')})
                    if not component:
                        continue
                    
                    required = comp_ref.get('quantity', 1) * item_quantity
                    available = component.get('quantity_in_stock', 0)
                    
                    if available < required:
                        missing_components.append({
                            "component_name": component.get('name'),
                            "required": required,
                            "available": available,
                            "shortage": required - available
                        })
                
                if missing_components:
                    all_available = False
                    results.append({
                        "item": item,
                        "template_name": template.get('template_name'),
                        "available": False,
                        "missing_components": missing_components
                    })
                else:
                    results.append({
                        "item": item,
                        "template_name": template.get('template_name'),
                        "available": True
                    })
            
            elif item_type == 'component':
                # Check individual component availability
                component = db.components.find_one({"id": item_id})
                if not component:
                    results.append({
                        "item": item,
                        "available": False,
                        "message": "Komponente nicht gefunden"
                    })
                    all_available = False
                    continue
                
                available = component.get('quantity_in_stock', 0)
                
                if available < item_quantity:
                    all_available = False
                    results.append({
                        "item": item,
                        "component_name": component.get('name'),
                        "available": False,
                        "required": item_quantity,
                        "available_stock": available,
                        "shortage": item_quantity - available
                    })
                else:
                    results.append({
                        "item": item,
                        "component_name": component.get('name'),
                        "available": True
                    })
        
        return {
            "success": True,
            "all_available": all_available,
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/shop/template-details/{template_id}")
def get_template_details_with_availability(template_id: str):
    """Get template details with component availability for shop display"""
    try:
        # Get template
        template = db.component_templates.find_one({"id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        # Remove MongoDB _id
        if '_id' in template:
            del template['_id']
        
        # Get detailed component info with availability
        components_detail = []
        all_available = True
        missing_count = 0
        
        for comp_ref in template.get('components', []):
            component = db.components.find_one({"id": comp_ref.get('component_id')})
            if not component:
                continue
            
            required_qty = comp_ref.get('quantity', 1)
            available_qty = component.get('quantity_in_stock', 0)
            is_available = available_qty >= required_qty
            
            if not is_available:
                all_available = False
                missing_count += 1
            
            components_detail.append({
                "component_id": component.get('id'),
                "name": component.get('name'),
                "component_type": component.get('component_type'),
                "manufacturer": component.get('manufacturer'),
                "model": component.get('model'),
                "required_quantity": required_qty,
                "available_quantity": available_qty,
                "is_available": is_available,
                "images": component.get('images', []),
                "description": component.get('description', '')
            })
        
        template['components_detail'] = components_detail
        template['all_components_available'] = all_available
        template['missing_components_count'] = missing_count
        
        return {
            "success": True,
            "template": template
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

