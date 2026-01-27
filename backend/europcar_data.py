"""
Europcar Sample Data
Diese Daten sollten später aus dem Google Spreadsheet importiert werden
"""

EUROPCAR_DATA = {
    "customer_email": "demo@customer.de",
    "company": "Europcar Autovermietung GmbH",
    
    "locations": [
        {
            "id": "loc-001",
            "name": "Europcar Berlin Hauptbahnhof",
            "address": "Washingtonplatz 1",
            "city": "Berlin",
            "postal_code": "10557",
            "country": "Deutschland",
            "phone": "+49 30 12345678",
            "opening_hours": "Mo-Fr: 08:00-18:00, Sa-So: 09:00-16:00"
        },
        {
            "id": "loc-002",
            "name": "Europcar München Flughafen",
            "address": "Nordallee 25",
            "city": "München",
            "postal_code": "85356",
            "country": "Deutschland",
            "phone": "+49 89 98765432",
            "opening_hours": "Mo-So: 06:00-23:00"
        },
        {
            "id": "loc-003",
            "name": "Europcar Frankfurt Zentrum",
            "address": "Mainzer Landstraße 123",
            "city": "Frankfurt am Main",
            "postal_code": "60329",
            "country": "Deutschland",
            "phone": "+49 69 11223344",
            "opening_hours": "Mo-Fr: 07:00-19:00, Sa: 09:00-14:00"
        }
    ],
    
    "devices": [
        {
            "id": "dev-001",
            "device_name": "ID Scanner Berlin HBF",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "location_id": "loc-001",
            "status": "online",
            "ip_address": "192.168.1.101",
            "last_seen": "2024-11-01 16:30:00",
            "firmware_version": "v2.3.1"
        },
        {
            "id": "dev-002",
            "device_name": "ID Scanner München MUC T1",
            "mac_address": "AA:BB:CC:DD:EE:02",
            "location_id": "loc-002",
            "status": "online",
            "ip_address": "192.168.2.101",
            "last_seen": "2024-11-01 16:28:00",
            "firmware_version": "v2.3.1"
        },
        {
            "id": "dev-003",
            "device_name": "ID Scanner München MUC T2",
            "mac_address": "AA:BB:CC:DD:EE:03",
            "location_id": "loc-002",
            "status": "offline",
            "ip_address": "192.168.2.102",
            "last_seen": "2024-10-30 14:15:00",
            "firmware_version": "v2.3.0"
        },
        {
            "id": "dev-004",
            "device_name": "ID Scanner Frankfurt",
            "mac_address": "AA:BB:CC:DD:EE:04",
            "location_id": "loc-003",
            "status": "online",
            "ip_address": "192.168.3.101",
            "last_seen": "2024-11-01 16:31:00",
            "firmware_version": "v2.3.1"
        }
    ],
    
    "employees": [
        {
            "id": "emp-001",
            "name": "Max Mustermann",
            "email": "max.mustermann@europcar.de",
            "role": "Standortleiter",
            "location_id": "loc-001",
            "phone": "+49 170 1234567",
            "hire_date": "2020-03-15"
        },
        {
            "id": "emp-002",
            "name": "Anna Schmidt",
            "email": "anna.schmidt@europcar.de",
            "role": "Mitarbeiter",
            "location_id": "loc-001",
            "phone": "+49 170 2345678",
            "hire_date": "2021-06-01"
        },
        {
            "id": "emp-003",
            "name": "Thomas Müller",
            "email": "thomas.mueller@europcar.de",
            "role": "Standortleiter",
            "location_id": "loc-002",
            "phone": "+49 170 3456789",
            "hire_date": "2019-01-10"
        },
        {
            "id": "emp-004",
            "name": "Sarah Weber",
            "email": "sarah.weber@europcar.de",
            "role": "Mitarbeiter",
            "location_id": "loc-002",
            "phone": "+49 170 4567890",
            "hire_date": "2022-02-20"
        },
        {
            "id": "emp-005",
            "name": "Michael Becker",
            "email": "michael.becker@europcar.de",
            "role": "Regionalmanager",
            "location_id": "loc-003",
            "phone": "+49 170 5678901",
            "hire_date": "2018-09-01"
        }
    ],
    
    "licenses": [
        {
            "id": "lic-001",
            "license_type": "Enterprise Scanner License",
            "quantity": 10,
            "purchase_date": "2024-01-15",
            "expiry_date": "2025-01-14",
            "status": "active",
            "license_key": "ECEU-2024-ABCD-1234"
        },
        {
            "id": "lic-002",
            "license_type": "Cloud Sync License",
            "quantity": 5,
            "purchase_date": "2024-03-01",
            "expiry_date": "2025-02-28",
            "status": "active",
            "license_key": "ECEU-2024-SYNC-5678"
        },
        {
            "id": "lic-003",
            "license_type": "Premium Support",
            "quantity": 1,
            "purchase_date": "2024-01-15",
            "expiry_date": "2025-01-14",
            "status": "active",
            "license_key": "ECEU-2024-SUPP-9012"
        }
    ]
}
