"""
Label Printer Integration - Brother QL-820NWB
Supports network printing via TCP Socket (Port 9100)
"""
import os
import io
import socket
import struct
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFont
import qrcode

router = APIRouter(prefix="/api/label-printer", tags=["Label Printer"])

# Brother QL-820NWB specs
# Label width: 62mm = ~696 pixels at 300dpi, or ~580px at 300dpi for 62mm continuous
# We use 62mm die-cut labels (DK-11209 small address labels: 62x29mm)
LABEL_WIDTH_PX = 696
LABEL_HEIGHT_PX = 271  # For 29mm height at 300dpi

# Printer settings (can be overridden via API)
DEFAULT_PRINTER_IP = os.environ.get("LABEL_PRINTER_IP", "192.168.1.100")
DEFAULT_PRINTER_PORT = 9100


class PrinterSettings(BaseModel):
    ip_address: str
    port: int = 9100
    label_width_mm: int = 62
    label_height_mm: int = 29


class LabelData(BaseModel):
    asset_id: str
    type_label: str
    manufacturer_sn: str
    location_name: Optional[str] = None
    qr_content: Optional[str] = None


class PrintRequest(BaseModel):
    printer_ip: Optional[str] = None
    printer_port: int = 9100
    label: LabelData
    copies: int = 1


class BatchPrintRequest(BaseModel):
    printer_ip: Optional[str] = None
    printer_port: int = 9100
    labels: List[LabelData]
    copies: int = 1


class TestPrintRequest(BaseModel):
    printer_ip: str
    printer_port: int = 9100


def create_label_image(label: LabelData) -> Image.Image:
    """
    Create a label image with QR code and text for Brother QL printers.
    Layout: QR code on left, text on right
    """
    # Create white background
    img = Image.new('1', (LABEL_WIDTH_PX, LABEL_HEIGHT_PX), 1)  # 1-bit image, white background
    draw = ImageDraw.Draw(img)
    
    # Generate QR code
    qr_content = label.qr_content or label.asset_id
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=1
    )
    qr.add_data(qr_content)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Resize QR to fit label height (with some margin)
    qr_size = LABEL_HEIGHT_PX - 20
    qr_img = qr_img.resize((qr_size, qr_size))
    
    # Paste QR code on the left
    img.paste(qr_img, (10, 10))
    
    # Text area starts after QR code
    text_x = qr_size + 30
    
    # Try to load a font, fall back to default if not available
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except OSError:
        font_large = ImageFont.load_default()
        font_medium = font_large
        font_small = font_large
    
    # Draw Asset ID (main identifier)
    draw.text((text_x, 15), label.asset_id, font=font_large, fill=0)
    
    # Draw Type label
    draw.text((text_x, 55), label.type_label, font=font_medium, fill=0)
    
    # Draw Serial Number
    sn_text = f"SN: {label.manufacturer_sn}"
    if len(sn_text) > 30:
        sn_text = sn_text[:27] + "..."
    draw.text((text_x, 85), sn_text, font=font_small, fill=0)
    
    # Draw Location if available
    if label.location_name:
        loc_text = label.location_name[:35] if len(label.location_name) > 35 else label.location_name
        draw.text((text_x, 110), loc_text, font=font_small, fill=0)
    
    return img


def image_to_brother_raster(img: Image.Image) -> bytes:
    """
    Convert PIL Image to Brother QL raster data format.
    Brother QL printers use a specific raster format with ESC/P commands.
    """
    # Ensure image is 1-bit (black and white)
    if img.mode != '1':
        img = img.convert('1')
    
    # Brother QL-820NWB uses 62mm width = 696 pixels at 300dpi
    # Each row is sent as 90 bytes (720 pixels, but we use 696)
    row_bytes = 90
    
    data = bytearray()
    
    # Initialize printer
    data.extend(b'\x00' * 200)  # Invalidate
    data.extend(b'\x1b\x40')     # ESC @ - Initialize
    
    # Switch to raster mode
    data.extend(b'\x1b\x69\x61\x01')  # ESC i a 1 - Switch to raster mode
    
    # Print information command
    # Media type: 0x0A = continuous length tape, 0x0B = die-cut labels
    data.extend(b'\x1b\x69\x7a')  # ESC i z - Print information
    data.extend(bytes([
        0x86,  # Valid flags (PI_KIND | PI_WIDTH | PI_LENGTH | PI_QUALITY | PI_RECOVER)
        0x0B,  # Media type: die-cut labels
        0x3E,  # Media width: 62mm
        0x1D,  # Media length: 29mm
        0x00, 0x00, 0x00, 0x00,  # Page count (not used for continuous)
        0x00,  # Starting page
        0x00   # Reserved
    ]))
    
    # Set margin (0)
    data.extend(b'\x1b\x69\x64\x00\x00')  # ESC i d - Set margin amount
    
    # Set auto cut
    data.extend(b'\x1b\x69\x4d\x40')  # ESC i M - Auto cut on
    
    # Set cut-at-end
    data.extend(b'\x1b\x69\x4b\x08')  # ESC i K - Cut at end
    
    # Raster data
    width, height = img.size
    pixels = img.load()
    
    for y in range(height):
        # Build row data
        row_data = bytearray(row_bytes)
        for x in range(width):
            if x < width:
                byte_idx = x // 8
                bit_idx = 7 - (x % 8)
                if pixels[x, y] == 0:  # Black pixel
                    row_data[byte_idx] |= (1 << bit_idx)
        
        # Send raster line
        data.extend(b'\x67\x00')  # g 0x00 - Raster graphic transfer
        data.append(row_bytes)   # Number of bytes
        data.extend(row_data)
    
    # Print and feed
    data.extend(b'\x1a')  # Print command with cut
    
    return bytes(data)


def send_to_printer(printer_ip: str, printer_port: int, data: bytes, timeout: int = 10) -> dict:
    """
    Send raw data to printer via TCP socket.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((printer_ip, printer_port))
        sock.sendall(data)
        sock.close()
        return {"success": True, "message": "Daten an Drucker gesendet"}
    except socket.timeout:
        return {"success": False, "error": "Verbindungs-Timeout - Drucker nicht erreichbar"}
    except ConnectionRefusedError:
        return {"success": False, "error": "Verbindung abgelehnt - Drucker offline oder falscher Port"}
    except socket.gaierror:
        return {"success": False, "error": "DNS-Fehler - IP-Adresse ungültig"}
    except Exception as e:
        return {"success": False, "error": f"Druckfehler: {str(e)}"}


@router.post("/test-connection")
async def test_printer_connection(req: TestPrintRequest):
    """
    Test connection to the printer.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((req.printer_ip, req.printer_port))
        sock.close()
        
        if result == 0:
            return {
                "success": True,
                "message": f"Drucker erreichbar unter {req.printer_ip}:{req.printer_port}",
                "status": "online"
            }
        else:
            return {
                "success": False,
                "message": f"Drucker nicht erreichbar unter {req.printer_ip}:{req.printer_port}",
                "status": "offline",
                "error_code": result
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Verbindungsfehler: {str(e)}",
            "status": "error"
        }


@router.post("/print-test-label")
async def print_test_label(req: TestPrintRequest):
    """
    Print a test label to verify printer setup.
    """
    test_label = LabelData(
        asset_id="TEST-LABEL-001",
        type_label="Testdruck",
        manufacturer_sn="TEST-SN-12345",
        location_name="Drucker-Testseite",
        qr_content="TSRID:TEST:12345"
    )
    
    # Create label image
    img = create_label_image(test_label)
    
    # Convert to Brother raster format
    raster_data = image_to_brother_raster(img)
    
    # Send to printer
    result = send_to_printer(req.printer_ip, req.printer_port, raster_data)
    
    if result.get("success"):
        return {
            "success": True,
            "message": "Testlabel wurde gedruckt",
            "printer_ip": req.printer_ip
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Druckfehler"))


@router.post("/print")
async def print_label(req: PrintRequest):
    """
    Print a single asset label.
    """
    printer_ip = req.printer_ip or DEFAULT_PRINTER_IP
    
    # Create label image
    img = create_label_image(req.label)
    
    # Convert to Brother raster format
    raster_data = image_to_brother_raster(img)
    
    # Send to printer (repeat for copies)
    for i in range(req.copies):
        result = send_to_printer(printer_ip, req.printer_port, raster_data)
        if not result.get("success"):
            raise HTTPException(
                status_code=500, 
                detail=f"Druckfehler bei Kopie {i+1}: {result.get('error')}"
            )
    
    return {
        "success": True,
        "message": f"{req.copies} Label gedruckt für {req.label.asset_id}",
        "asset_id": req.label.asset_id,
        "copies": req.copies
    }


@router.post("/print-batch")
async def print_batch_labels(req: BatchPrintRequest):
    """
    Print multiple labels in batch.
    """
    printer_ip = req.printer_ip or DEFAULT_PRINTER_IP
    printed = 0
    errors = []
    
    for label in req.labels:
        # Create label image
        img = create_label_image(label)
        
        # Convert to Brother raster format
        raster_data = image_to_brother_raster(img)
        
        # Send to printer (repeat for copies)
        for i in range(req.copies):
            result = send_to_printer(printer_ip, req.printer_port, raster_data)
            if result.get("success"):
                printed += 1
            else:
                errors.append(f"{label.asset_id}: {result.get('error')}")
    
    total_expected = len(req.labels) * req.copies
    
    return {
        "success": len(errors) == 0,
        "printed": printed,
        "total": total_expected,
        "errors": errors if errors else None,
        "message": f"{printed}/{total_expected} Labels gedruckt"
    }


@router.get("/preview/{asset_id}")
async def preview_label(asset_id: str, type_label: str = "Asset", sn: str = "", location: str = ""):
    """
    Generate a preview image of the label (returns PNG).
    """
    from fastapi.responses import StreamingResponse
    
    label = LabelData(
        asset_id=asset_id,
        type_label=type_label,
        manufacturer_sn=sn or "N/A",
        location_name=location or None,
        qr_content=asset_id
    )
    
    img = create_label_image(label)
    
    # Convert 1-bit image to RGB for better preview
    img_rgb = img.convert('RGB')
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img_rgb.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return StreamingResponse(img_bytes, media_type="image/png")


@router.get("/status")
async def get_printer_status():
    """
    Get current printer configuration and status.
    """
    return {
        "default_ip": DEFAULT_PRINTER_IP,
        "default_port": DEFAULT_PRINTER_PORT,
        "label_size": {
            "width_mm": 62,
            "height_mm": 29,
            "width_px": LABEL_WIDTH_PX,
            "height_px": LABEL_HEIGHT_PX
        },
        "supported_printer": "Brother QL-820NWB",
        "connection_types": ["TCP/IP (Port 9100)", "Network", "WiFi", "USB (via CUPS)"]
    }
