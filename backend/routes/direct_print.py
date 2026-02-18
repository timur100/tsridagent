"""
Label Printer API - Direct printing to Brother QL-820NWB via IPP
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import tempfile
import subprocess
import base64

router = APIRouter(prefix="/api/label-printer", tags=["Label Printer"])

# Database reference
db = None

def set_database(database):
    global db
    db = database


class PrinterConfig(BaseModel):
    ip_address: str
    port: int = 631
    name: str = "Brother QL-820NWB"


class LabelPrintRequest(BaseModel):
    printer_ip: str
    html_content: str
    width_mm: int = 62
    height_mm: Optional[int] = None
    copies: int = 1


class PrinterSettings(BaseModel):
    ip_address: str
    port: int = 631
    name: str = "Brother QL-820NWB"
    is_default: bool = False


@router.get("/discover")
async def discover_printers():
    """Discover network printers using avahi/bonjour"""
    try:
        # Try to find IPP printers on the network
        result = subprocess.run(
            ["avahi-browse", "-t", "-r", "_ipp._tcp"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        printers = []
        lines = result.stdout.split('\n')
        current_printer = {}
        
        for line in lines:
            if 'hostname' in line.lower():
                parts = line.split('=')
                if len(parts) > 1:
                    current_printer['hostname'] = parts[1].strip().strip('[]')
            elif 'address' in line.lower():
                parts = line.split('=')
                if len(parts) > 1:
                    current_printer['ip'] = parts[1].strip().strip('[]')
            elif 'port' in line.lower():
                parts = line.split('=')
                if len(parts) > 1:
                    current_printer['port'] = int(parts[1].strip().strip('[]'))
            elif line.strip() == '' and current_printer:
                if current_printer.get('ip'):
                    printers.append(current_printer)
                current_printer = {}
        
        return {
            "success": True,
            "printers": printers,
            "message": f"Found {len(printers)} printer(s)"
        }
    except subprocess.TimeoutExpired:
        return {"success": True, "printers": [], "message": "Discovery timed out"}
    except FileNotFoundError:
        return {"success": True, "printers": [], "message": "avahi-browse not available"}
    except Exception as e:
        return {"success": False, "printers": [], "error": str(e)}


@router.post("/test-connection")
async def test_printer_connection(config: PrinterConfig):
    """Test connection to a printer"""
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((config.ip_address, config.port))
        sock.close()
        
        if result == 0:
            return {
                "success": True,
                "message": f"Verbindung zu {config.ip_address}:{config.port} erfolgreich",
                "printer": {
                    "ip": config.ip_address,
                    "port": config.port,
                    "name": config.name
                }
            }
        else:
            return {
                "success": False,
                "message": f"Keine Verbindung zu {config.ip_address}:{config.port}"
            }
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/print")
async def print_label(request: LabelPrintRequest):
    """
    Print a label directly to Brother QL-820NWB via IPP
    Falls back to generating a PDF if direct IPP fails
    """
    try:
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            # Add print-optimized CSS
            html_with_styles = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page {{
                        size: {request.width_mm}mm {request.height_mm or 'auto'}mm;
                        margin: 0;
                    }}
                    body {{
                        margin: 0;
                        padding: 1mm;
                        width: {request.width_mm}mm;
                        font-family: Arial, sans-serif;
                    }}
                </style>
            </head>
            <body>
                {request.html_content}
            </body>
            </html>
            """
            f.write(html_with_styles)
            html_file = f.name
        
        # Convert HTML to PDF using wkhtmltopdf (if available)
        pdf_file = html_file.replace('.html', '.pdf')
        
        try:
            # Try wkhtmltopdf first
            subprocess.run([
                'wkhtmltopdf',
                '--page-width', f'{request.width_mm}mm',
                '--page-height', f'{request.height_mm or 100}mm',
                '--margin-top', '0',
                '--margin-bottom', '0',
                '--margin-left', '0',
                '--margin-right', '0',
                html_file,
                pdf_file
            ], check=True, capture_output=True, timeout=30)
            
            # Print via IPP using lp command
            ipp_uri = f"ipp://{request.printer_ip}:{631}/ipp/print"
            
            print_result = subprocess.run([
                'lp',
                '-d', f'ipp://{request.printer_ip}/ipp/print',
                '-n', str(request.copies),
                pdf_file
            ], capture_output=True, text=True, timeout=30)
            
            # Cleanup
            os.unlink(html_file)
            os.unlink(pdf_file)
            
            if print_result.returncode == 0:
                return {
                    "success": True,
                    "message": f"Label an {request.printer_ip} gesendet",
                    "job_id": print_result.stdout.strip()
                }
            else:
                # Fallback: Return PDF as base64 for client-side handling
                return {
                    "success": False,
                    "message": "IPP-Druck fehlgeschlagen. Bitte Browser-Druck verwenden.",
                    "error": print_result.stderr
                }
                
        except FileNotFoundError:
            # wkhtmltopdf not available - return HTML for browser printing
            os.unlink(html_file)
            return {
                "success": False,
                "message": "Direkt-Druck nicht verfügbar. Browser-Druck wird verwendet.",
                "fallback": "browser"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Fehler: {str(e)}",
            "fallback": "browser"
        }


@router.get("/settings")
async def get_printer_settings():
    """Get saved printer settings"""
    try:
        settings = await db.printer_settings.find_one({"type": "label_printer"}, {"_id": 0})
        return {
            "success": True,
            "settings": settings
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/settings")
async def save_printer_settings(settings: PrinterSettings):
    """Save printer settings"""
    try:
        await db.printer_settings.update_one(
            {"type": "label_printer"},
            {"$set": {
                "type": "label_printer",
                "ip_address": settings.ip_address,
                "port": settings.port,
                "name": settings.name,
                "is_default": settings.is_default
            }},
            upsert=True
        )
        return {
            "success": True,
            "message": "Drucker-Einstellungen gespeichert"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
