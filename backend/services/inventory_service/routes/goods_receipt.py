from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO
import base64
from models.inventory_item import GoodsReceiptItem, LabelRequest
from utils.db import inventory_collection, goods_receipts_collection

router = APIRouter(prefix="/goods-receipt", tags=["Goods Receipt"])

@router.get("/low-stock")
async def get_low_stock_items():
    """
    Get items with stock below minimum level
    """
    try:
        # Find items where quantity_in_stock <= min_stock_level
        pipeline = [
            {
                "$match": {
                    "$expr": {
                        "$lte": ["$quantity_in_stock", "$min_stock_level"]
                    }
                }
            },
            {
                "$sort": {
                    "quantity_in_stock": 1  # Sort by stock level (lowest first)
                }
            }
        ]
        
        items_cursor = inventory_collection.aggregate(pipeline)
        items = []
        async for item in items_cursor:
            # Remove MongoDB _id
            if '_id' in item:
                del item['_id']
            items.append(item)
        
        return {
            "success": True,
            "count": len(items),
            "items": items
        }
    
    except Exception as e:
        print(f"Get low stock items error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_goods_receipt(receipt: GoodsReceiptItem):
    """
    Process goods receipt and update inventory
    """
    try:
        # Get item
        item = await inventory_collection.find_one({"id": receipt.item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        # Update stock
        new_quantity = item.get('quantity_in_stock', 0) + receipt.quantity
        
        # Add serial numbers if provided
        existing_serials = item.get('serial_numbers', [])
        if receipt.serial_numbers:
            existing_serials.extend(receipt.serial_numbers)
        
        # Update item
        await inventory_collection.update_one(
            {"id": receipt.item_id},
            {
                "$set": {
                    "quantity_in_stock": new_quantity,
                    "serial_numbers": existing_serials,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create goods receipt history entry
        receipt_doc = {
            "id": str(uuid.uuid4()),
            "item_id": receipt.item_id,
            "item_name": item.get('name'),
            "quantity": receipt.quantity,
            "serial_numbers": receipt.serial_numbers or [],
            "notes": receipt.notes,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "old_stock": item.get('quantity_in_stock', 0),
            "new_stock": new_quantity
        }
        
        await goods_receipts_collection.insert_one(receipt_doc)
        
        return {
            "success": True,
            "message": f"Wareneingang erfolgreich gebucht: {receipt.quantity} {item.get('unit', 'Stück')}",
            "item_id": receipt.item_id,
            "old_stock": item.get('quantity_in_stock', 0),
            "new_stock": new_quantity,
            "receipt_id": receipt_doc['id']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Process goods receipt error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-labels")
async def generate_labels(label_request: LabelRequest):
    """
    Generate PDF labels for items
    """
    try:
        # Get item
        item = await inventory_collection.find_one({"id": label_request.item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
        
        # Create PDF buffer
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        
        # Label dimensions (62x29mm for Dymo-compatible labels)
        label_width = 62 * mm
        label_height = 29 * mm
        margin = 5 * mm
        
        # Current date
        current_date = datetime.now(timezone.utc).strftime("%d.%m.%Y")
        
        # Generate labels
        labels_per_page = 10
        x_offset = 20
        y_offset = A4[1] - 40  # Start from top
        
        for i in range(label_request.quantity):
            # Generate QR code for barcode
            qr = qrcode.QRCode(version=1, box_size=10, border=0)
            qr.add_data(item.get('barcode', ''))
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert QR code to bytes
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            qr_reader = ImageReader(qr_buffer)
            
            # Draw label border
            c.rect(x_offset, y_offset - label_height, label_width, label_height)
            
            # Draw QR code
            qr_size = 20 * mm
            c.drawImage(qr_reader, x_offset + margin, y_offset - qr_size - margin, 
                       width=qr_size, height=qr_size, preserveAspectRatio=True)
            
            # Draw text information
            text_x = x_offset + qr_size + margin + 5
            text_y = y_offset - 10
            
            # Article name
            c.setFont("Helvetica-Bold", 10)
            c.drawString(text_x, text_y, item.get('name', '')[:30])
            
            # Article number / Barcode
            c.setFont("Helvetica", 8)
            c.drawString(text_x, text_y - 12, f"Art.Nr.: {item.get('barcode', '')}")
            
            # Date
            c.drawString(text_x, text_y - 20, f"Datum: {current_date}")
            
            # Serial number if provided
            if label_request.serial_numbers and i < len(label_request.serial_numbers):
                c.setFont("Helvetica-Bold", 7)
                c.drawString(text_x, text_y - 28, f"S/N: {label_request.serial_numbers[i]}")
            
            # Move to next label position
            y_offset -= (label_height + 5)
            
            # New page if needed
            if (i + 1) % labels_per_page == 0 and i < label_request.quantity - 1:
                c.showPage()
                y_offset = A4[1] - 40
        
        # Save PDF
        c.save()
        
        # Get PDF bytes
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.read()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "success": True,
            "message": f"{label_request.quantity} Etikett(en) generiert",
            "pdf_data": f"data:application/pdf;base64,{pdf_base64}",
            "filename": f"etiketten_{item.get('barcode')}_{current_date}.pdf"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Generate labels error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_goods_receipts(
    item_id: Optional[str] = None,
    limit: int = 50
):
    """
    Get goods receipt history
    """
    try:
        # Build query
        query = {}
        if item_id:
            query['item_id'] = item_id
        
        # Get receipts
        receipts_cursor = goods_receipts_collection.find(query).sort("received_at", -1).limit(limit)
        receipts = []
        async for receipt in receipts_cursor:
            # Remove MongoDB _id
            if '_id' in receipt:
                del receipt['_id']
            receipts.append(receipt)
        
        return {
            "success": True,
            "count": len(receipts),
            "receipts": receipts
        }
    
    except Exception as e:
        print(f"Get goods receipts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))