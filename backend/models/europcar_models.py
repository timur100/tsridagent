"""
Pydantic Models für Europcar PKW-Vermietungssystem
Phase 1: Kern-Plattform
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


# ===============================
# ENUMS
# ===============================

class VehicleStatus(str, Enum):
    available = "available"
    rented = "rented"
    maintenance = "maintenance"
    damaged = "damaged"
    reserved = "reserved"


class FuelType(str, Enum):
    benzin = "benzin"
    diesel = "diesel"
    elektro = "elektro"
    hybrid = "hybrid"
    gas = "gas"


class TransmissionType(str, Enum):
    manual = "manual"
    automatic = "automatic"


class TireType(str, Enum):
    summer = "summer"
    winter = "winter"
    allseason = "allseason"


class ReservationStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class CustomerType(str, Enum):
    private = "private"
    business = "business"


class ContractStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


# ===============================
# VEHICLE MODELS (Modul 1)
# ===============================

class VehicleMaintenanceRecord(BaseModel):
    date: str
    type: str  # "service", "tire_change", "inspection", etc.
    description: str
    cost: Optional[float] = 0.0
    mileage_at_service: int
    next_service_date: Optional[str] = None


class VehicleDamageRecord(BaseModel):
    damage_id: str
    date_reported: str
    description: str
    severity: str  # "minor", "moderate", "severe"
    location: str  # part of vehicle
    repair_cost: Optional[float] = None
    repair_date: Optional[str] = None
    images: List[str] = []


class Vehicle(BaseModel):
    id: str
    # Stammdaten
    marke: str  # Brand
    modell: str  # Model
    baujahr: int  # Year
    kraftstoff: FuelType
    getriebe: TransmissionType
    vin: str  # Fahrgestellnummer
    kennzeichen: str  # License plate
    zulassung: str  # Registration date
    
    # Fahrzeugzustand
    kilometerstand: int
    tankstand: int  # in percent
    status: VehicleStatus
    verfuegbar: bool = True
    
    # Wartung & Reifen
    wartungsintervall_km: int = 15000
    naechste_wartung_km: int
    reifenstatus: TireType
    
    # Schaeden & Historie
    schaeden: List[VehicleDamageRecord] = []
    wartungshistorie: List[VehicleMaintenanceRecord] = []
    
    # GPS & Tracking
    gps_tracker_id: Optional[str] = None
    letzter_standort: Optional[Dict[str, float]] = None  # {"lat": x, "lng": y}
    
    # Versicherung & Besitz
    versicherungsstatus: str = "aktiv"
    versicherungsnummer: Optional[str] = None
    leasing_oder_besitz: str = "besitz"  # "leasing" or "besitz"
    
    # Zusatzausstattung & Devices
    zusatzausstattung: List[str] = []  # ["GPS", "Kindersitz", "Tablet", etc.]
    tsrid_device_id: Optional[str] = None
    
    # E-Fahrzeug spezifisch
    batterie_kapazitaet: Optional[int] = None  # in kWh
    ladestand: Optional[int] = None  # in percent
    
    # Metadata
    station_id: str
    created_at: str
    updated_at: str


class VehicleCreate(BaseModel):
    marke: str
    modell: str
    baujahr: int
    kraftstoff: FuelType
    getriebe: TransmissionType
    vin: str
    kennzeichen: str
    zulassung: str
    kilometerstand: int
    tankstand: int = 100
    wartungsintervall_km: int = 15000
    reifenstatus: TireType = TireType.summer
    station_id: str
    zusatzausstattung: List[str] = []
    batterie_kapazitaet: Optional[int] = None


class VehicleUpdate(BaseModel):
    kilometerstand: Optional[int] = None
    tankstand: Optional[int] = None
    status: Optional[VehicleStatus] = None
    verfuegbar: Optional[bool] = None
    reifenstatus: Optional[TireType] = None
    letzter_standort: Optional[Dict[str, float]] = None
    ladestand: Optional[int] = None


# ===============================
# RESERVATION MODELS (Modul 2)
# ===============================

class ReservationAdditionalOptions(BaseModel):
    gps: bool = False
    kindersitz: int = 0
    versicherungspaket: Optional[str] = None  # "basic", "premium", "full"
    zusatzfahrer: int = 0
    lte_hotspot: bool = False
    tablet_scanner: bool = False


class Reservation(BaseModel):
    id: str
    
    # Kunde & Fahrzeug
    customer_id: str
    vehicle_id: str
    
    # Buchungsdaten
    start_date: str
    end_date: str
    start_station_id: str
    end_station_id: str  # Kann unterschiedlich sein (One-Way)
    
    # Preisberechnung
    base_price: float
    additional_options_price: float
    total_price: float
    
    # Zusatzoptionen
    optionen: ReservationAdditionalOptions
    
    # Status
    status: ReservationStatus
    
    # Buchungstyp
    buchungstyp: str  # "online", "telefon", "counter"
    
    # Stornierung
    storniert_am: Optional[str] = None
    stornierungsgrund: Optional[str] = None
    
    # Metadata
    created_at: str
    updated_at: str
    created_by: str  # User ID


class ReservationCreate(BaseModel):
    customer_id: str
    vehicle_id: str
    start_date: str
    end_date: str
    start_station_id: str
    end_station_id: str
    optionen: ReservationAdditionalOptions
    buchungstyp: str = "online"


class ReservationUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[ReservationStatus] = None
    optionen: Optional[ReservationAdditionalOptions] = None


# ===============================
# CUSTOMER MODELS (Modul 3)
# ===============================

class DriverLicense(BaseModel):
    nummer: str
    ausstellungsort: str
    ausstellungsdatum: str
    ablaufdatum: str
    klassen: List[str]  # ["B", "BE", etc.]
    gueltig: bool = True


class PaymentMethod(BaseModel):
    type: str  # "kreditkarte", "lastschrift", "rechnung"
    last_four: Optional[str] = None
    expiry: Optional[str] = None
    is_default: bool = False


class Customer(BaseModel):
    id: str
    
    # Basisdaten
    customer_type: CustomerType
    vorname: str
    nachname: str
    email: EmailStr
    telefon: str
    geburtsdatum: str
    
    # Adresse
    strasse: str
    plz: str
    stadt: str
    land: str = "Deutschland"
    
    # Ausweis & Führerschein
    ausweis_nummer: str
    ausweis_typ: str  # "personalausweis", "reisepass"
    ausweis_ablaufdatum: str
    fuehrerschein: DriverLicense
    
    # TSRID Integration
    tsrid_scan_id: Optional[str] = None
    ausweis_verifiziert: bool = False
    ausweis_verifiziert_am: Optional[str] = None
    
    # Zahlungsmittel
    zahlungsmittel: List[PaymentMethod] = []
    
    # Geschäftskunden spezifisch
    firma: Optional[str] = None
    steuernummer: Optional[str] = None
    firmen_fahrerliste: List[str] = []  # List of driver IDs
    
    # Blacklist & Fraud
    blacklist: bool = False
    blacklist_grund: Optional[str] = None
    fraud_score: int = 0  # 0-100
    
    # Kundengruppe & Rabatte
    kundengruppe: str = "standard"  # "standard", "premium", "vip"
    rabatt_prozent: int = 0
    
    # Marketing
    newsletter_opt_in: bool = False
    
    # Metadata
    created_at: str
    updated_at: str


class CustomerCreate(BaseModel):
    customer_type: CustomerType
    vorname: str
    nachname: str
    email: EmailStr
    telefon: str
    geburtsdatum: str
    strasse: str
    plz: str
    stadt: str
    ausweis_nummer: str
    ausweis_typ: str
    ausweis_ablaufdatum: str
    fuehrerschein: DriverLicense
    firma: Optional[str] = None


class CustomerUpdate(BaseModel):
    telefon: Optional[str] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    stadt: Optional[str] = None
    blacklist: Optional[bool] = None
    kundengruppe: Optional[str] = None
    rabatt_prozent: Optional[int] = None


# ===============================
# CONTRACT MODELS (Modul 4)
# ===============================

class VehicleConditionCheck(BaseModel):
    area: str  # "front", "back", "left", "right", "interior"
    condition: str  # "perfect", "minor_scratches", "dent", "damaged"
    description: Optional[str] = None
    images: List[str] = []


class Contract(BaseModel):
    id: str
    
    # Verlinkungen
    reservation_id: str
    customer_id: str
    vehicle_id: str
    
    # Übergabeprotokoll
    uebergabe_datum: str
    uebergabe_station_id: str
    uebergabe_mitarbeiter_id: str
    uebergabe_kilometerstand: int
    uebergabe_tankstand: int
    uebergabe_zustand: List[VehicleConditionCheck]
    uebergabe_fotos: List[str] = []
    
    # Digitale Unterschrift
    unterschrift_kunde: Optional[str] = None  # Base64 encoded
    unterschrift_datum: Optional[str] = None
    
    # TSRID Integration (optional)
    tsrid_ausweis_scan_id: Optional[str] = None
    tsrid_scan_daten: Optional[Dict] = None
    
    # Vertragsstatus
    status: ContractStatus
    
    # Metadata
    created_at: str
    updated_at: str


class ContractCreate(BaseModel):
    reservation_id: str
    customer_id: str
    vehicle_id: str
    uebergabe_station_id: str
    uebergabe_mitarbeiter_id: str
    uebergabe_kilometerstand: int
    uebergabe_tankstand: int
    uebergabe_zustand: List[VehicleConditionCheck]


class ContractSign(BaseModel):
    contract_id: str
    unterschrift_kunde: str  # Base64 encoded


# ===============================
# RETURN MODELS (Modul 5)
# ===============================

class ReturnAdditionalCharge(BaseModel):
    type: str  # "cleaning", "fuel", "damage", "late_return"
    amount: float
    description: str


class VehicleReturn(BaseModel):
    id: str
    
    # Verlinkungen
    contract_id: str
    reservation_id: str
    customer_id: str
    vehicle_id: str
    
    # Rückgabedaten
    rueckgabe_datum: str
    rueckgabe_station_id: str
    rueckgabe_mitarbeiter_id: str
    rueckgabe_kilometerstand: int
    rueckgabe_tankstand: int
    
    # Schadenerfassung
    neue_schaeden: List[VehicleDamageRecord] = []
    schadenfotos: List[str] = []
    
    # KI-Schadenserkennung (Modul 15 - später)
    ki_schadenanalyse: Optional[Dict] = None
    
    # Zusätzliche Gebühren
    zusaetzliche_gebuehren: List[ReturnAdditionalCharge] = []
    gesamtbetrag_zusatzkosten: float = 0.0
    
    # Fahrzeugstatus
    reinigung_erforderlich: bool = False
    fahrzeug_bereit: bool = True
    
    # Metadata
    created_at: str
    updated_at: str


class VehicleReturnCreate(BaseModel):
    contract_id: str
    rueckgabe_station_id: str
    rueckgabe_mitarbeiter_id: str
    rueckgabe_kilometerstand: int
    rueckgabe_tankstand: int
    neue_schaeden: List[VehicleDamageRecord] = []
    reinigung_erforderlich: bool = False


class VehicleReturnUpdate(BaseModel):
    fahrzeug_bereit: Optional[bool] = None
    zusaetzliche_gebuehren: Optional[List[ReturnAdditionalCharge]] = None


# ===============================
# RESPONSE MODELS
# ===============================

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict] = None
