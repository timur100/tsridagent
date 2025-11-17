"""
Führerscheinklassen-Analyse für deutsche Führerscheine
Extrahiert und validiert Führerscheinklassen aus OCR-Daten
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, date
import re

router = APIRouter(prefix="/license-classes", tags=["license-classes"])


class OcrField(BaseModel):
    """Einzelnes OCR-Feld vom Führerschein"""
    field_number: str  # z.B. "9" für Führerscheinklassen
    value: str
    confidence: Optional[float] = None


class OcrData(BaseModel):
    """Komplette OCR-Daten vom Führerschein"""
    front_fields: List[OcrField]  # Vorderseite (enthält Feld 9 mit Klassen)
    back_fields: List[OcrField]   # Rückseite (enthält Gültigkeitsdaten)


class LicenseClassValidity(BaseModel):
    """Gültigkeitsinformationen für eine Führerscheinklasse"""
    license_class: str
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    status: str  # "valid", "expired", "not_yet_valid"
    days_until_expiry: Optional[int] = None


class LicenseClassAnalysis(BaseModel):
    """Analyse-Ergebnis der Führerscheinklassen"""
    all_classes: List[str]  # Alle erkannten Klassen
    valid_classes: List[LicenseClassValidity]
    expired_classes: List[LicenseClassValidity]
    warnings: List[str]
    allowed_for_rental: List[str]  # Für Vermietung zugelassene Klassen
    rental_class_required: str  # Standardmäßig geprüfte Klasse
    is_eligible_for_rental: bool


# Deutsche Führerscheinklassen-Definitionen
GERMAN_LICENSE_CLASSES = {
    # PKW/Kleinfahrzeuge
    'B': {'category': 'PKW', 'description': 'PKW bis 3,5t', 'priority': 1},
    'BE': {'category': 'PKW', 'description': 'PKW mit Anhänger', 'priority': 2},
    'B96': {'category': 'PKW', 'description': 'PKW mit schwerem Anhänger', 'priority': 3},
    
    # LKW-Klassen
    'C1': {'category': 'LKW', 'description': 'Leichte LKW (3,5-7,5t)', 'priority': 4, 'critical': True},
    'C1E': {'category': 'LKW', 'description': 'Leichte LKW mit Anhänger', 'priority': 5, 'critical': True},
    'C': {'category': 'LKW', 'description': 'Schwere LKW (über 7,5t)', 'priority': 6, 'critical': True},
    'CE': {'category': 'LKW', 'description': 'Schwere LKW mit Anhänger', 'priority': 7, 'critical': True},
    
    # Bus-Klassen
    'D1': {'category': 'Bus', 'description': 'Kleinbusse', 'priority': 8, 'critical': True},
    'D1E': {'category': 'Bus', 'description': 'Kleinbusse mit Anhänger', 'priority': 9, 'critical': True},
    'D': {'category': 'Bus', 'description': 'Busse', 'priority': 10, 'critical': True},
    'DE': {'category': 'Bus', 'description': 'Busse mit Anhänger', 'priority': 11, 'critical': True},
    
    # Motorrad
    'AM': {'category': 'Motorrad', 'description': 'Kleinkrafträder', 'priority': 12},
    'A1': {'category': 'Motorrad', 'description': 'Leichtkrafträder', 'priority': 13},
    'A2': {'category': 'Motorrad', 'description': 'Krafträder bis 35 kW', 'priority': 14},
    'A': {'category': 'Motorrad', 'description': 'Krafträder', 'priority': 15},
    
    # Sonstige
    'L': {'category': 'Sonstige', 'description': 'Land-/Forstwirtschaft', 'priority': 16},
    'T': {'category': 'Sonstige', 'description': 'Zugmaschinen', 'priority': 17}
}

# Kritische Klassen die bei Ablauf eine Warnung auslösen
CRITICAL_CLASSES = ['C1E', 'CE', 'D1E', 'DE', 'C', 'C1', 'D', 'D1']


def parse_license_classes(field_9_value: str) -> List[str]:
    """
    Extrahiert Führerscheinklassen aus Feld 9
    Format: "B, BE, C1, C1E" oder "B/BE/C1/C1E"
    """
    # Entferne Leerzeichen und splitte bei Komma oder Slash
    classes = re.split(r'[,/\s]+', field_9_value.strip())
    
    # Filtere nur gültige Klassen
    valid_classes = []
    for cls in classes:
        cls_upper = cls.strip().upper()
        if cls_upper in GERMAN_LICENSE_CLASSES:
            valid_classes.append(cls_upper)
    
    return valid_classes


def parse_validity_date(date_str: str) -> Optional[date]:
    """
    Parst Datum im deutschen Format: DD.MM.YYYY
    """
    try:
        return datetime.strptime(date_str.strip(), '%d.%m.%Y').date()
    except (ValueError, AttributeError):
        return None


def extract_validity_from_backside(back_fields: List[OcrField], license_class: str) -> Optional[str]:
    """
    Extrahiert Gültigkeitsdatum für eine spezifische Klasse von der Rückseite
    Sucht nach Muster: "9. B    10. 15.10.2015    11. 15.10.2030"
    """
    for field in back_fields:
        # Suche nach Klassennamen in den Feldern
        if license_class in field.value:
            # Verschiedene Patterns testen
            # Pattern 1: "9. B    10. 15.10.2015    11. 15.10.2030"
            pattern1 = rf"9\.\s*{license_class}\s+10\.\s+\d{{2}}\.\d{{2}}\.\d{{4}}\s+11\.\s+(\d{{2}}\.\d{{2}}\.\d{{4}})"
            match1 = re.search(pattern1, field.value)
            if match1:
                return match1.group(1)
            
            # Pattern 2: Einfacher - nur nach letztem Datum suchen
            pattern2 = rf"{license_class}\s+.*?(\d{{2}}\.\d{{2}}\.\d{{4}})\s*$"
            match2 = re.search(pattern2, field.value)
            if match2:
                return match2.group(1)
            
            # Pattern 3: Alle Daten finden und letztes nehmen
            dates = re.findall(r'\d{2}\.\d{2}\.\d{4}', field.value)
            if dates and len(dates) >= 2:
                return dates[-1]  # Letztes Datum ist Gültigkeitsdatum
    
    return None


def calculate_class_status(valid_until_str: Optional[str]) -> tuple:
    """
    Berechnet Status und Tage bis Ablauf
    Returns: (status, days_until_expiry)
    """
    if not valid_until_str:
        return ("unknown", None)
    
    valid_until = parse_validity_date(valid_until_str)
    if not valid_until:
        return ("unknown", None)
    
    today = date.today()
    days_until = (valid_until - today).days
    
    if days_until < 0:
        return ("expired", days_until)
    elif days_until == 0:
        return ("expires_today", 0)
    elif days_until <= 30:
        return ("expiring_soon", days_until)
    else:
        return ("valid", days_until)


@router.post("/analyze", response_model=LicenseClassAnalysis)
async def analyze_license_classes(ocr_data: OcrData, rental_class: str = "C"):
    """
    Analysiert Führerscheinklassen aus OCR-Daten
    
    Args:
        ocr_data: OCR-Daten von Vorder- und Rückseite
        rental_class: Für Vermietung benötigte Klasse (Standard: C für LKW)
    
    Returns:
        Detaillierte Analyse mit gültigen/abgelaufenen Klassen und Warnungen
    """
    try:
        # Schritt 1: Extrahiere Klassen aus Feld 9 (Vorderseite)
        field_9_value = None
        for field in ocr_data.front_fields:
            if field.field_number == "9":
                field_9_value = field.value
                break
        
        if not field_9_value:
            raise HTTPException(status_code=400, detail="Feld 9 (Führerscheinklassen) nicht in OCR-Daten gefunden")
        
        all_classes = parse_license_classes(field_9_value)
        
        if not all_classes:
            raise HTTPException(status_code=400, detail="Keine gültigen Führerscheinklassen erkannt")
        
        # Schritt 2: Extrahiere Gültigkeitsdaten von Rückseite
        valid_classes_list = []
        expired_classes_list = []
        warnings = []
        
        for license_class in all_classes:
            # Finde Gültigkeitsdatum für diese Klasse
            valid_until_str = extract_validity_from_backside(ocr_data.back_fields, license_class)
            
            # Berechne Status
            status, days_until = calculate_class_status(valid_until_str)
            
            class_info = LicenseClassValidity(
                license_class=license_class,
                valid_from=None,  # Kann bei Bedarf auch extrahiert werden
                valid_until=valid_until_str,
                status=status,
                days_until_expiry=days_until
            )
            
            if status in ["valid", "expiring_soon"]:
                valid_classes_list.append(class_info)
            elif status == "expired":
                expired_classes_list.append(class_info)
                
                # Warnung für kritische abgelaufene Klassen
                if license_class in CRITICAL_CLASSES:
                    class_desc = GERMAN_LICENSE_CLASSES[license_class]['description']
                    warnings.append(
                        f"⚠️ Klasse {license_class} ({class_desc}) abgelaufen am {valid_until_str}"
                    )
            
            if status == "expiring_soon":
                warnings.append(
                    f"🔔 Klasse {license_class} läuft bald ab ({days_until} Tage) am {valid_until_str}"
                )
        
        # Schritt 3: Prüfe Berechtigung für Vermietung
        rental_class_valid = any(
            cls.license_class == rental_class and cls.status in ["valid", "expiring_soon"]
            for cls in valid_classes_list
        )
        
        allowed_for_rental = [cls.license_class for cls in valid_classes_list]
        
        # Zusätzliche Warnung wenn kritische Klassen abgelaufen sind (auch bei gültiger B-Klasse)
        if expired_classes_list:
            critical_expired = [
                cls.license_class for cls in expired_classes_list 
                if cls.license_class in CRITICAL_CLASSES
            ]
            if critical_expired:
                warnings.insert(0, 
                    f"⚠️ WICHTIG: Folgende kritische Klassen sind abgelaufen: {', '.join(critical_expired)}"
                )
        
        return LicenseClassAnalysis(
            all_classes=all_classes,
            valid_classes=valid_classes_list,
            expired_classes=expired_classes_list,
            warnings=warnings,
            allowed_for_rental=allowed_for_rental,
            rental_class_required=rental_class,
            is_eligible_for_rental=rental_class_valid
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der Analyse: {str(e)}")


@router.get("/classes")
async def get_all_license_classes():
    """
    Gibt alle deutschen Führerscheinklassen mit Beschreibungen zurück
    """
    return {
        "classes": GERMAN_LICENSE_CLASSES,
        "critical_classes": CRITICAL_CLASSES
    }
