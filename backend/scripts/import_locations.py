"""
Import Europcar Locations from TSV data into MongoDB
Run this script once to populate the tenant_locations collection
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_url)
db = mongo_client['portal_db']

# Get tenant_id - you need to replace this with actual tenant ID
# Run: db.tenants.find_one() to get the tenant_id
TENANT_ID = "1d3653db-86cb-4dd1-9ef5-0236b116def8"  # Europcar tenant ID from tests

# Location data (Main Code, PLZ, ORT, STR, Telefon, Telefon Intern, E Mail, Main Typ, Stationsname, Manager, Bundesland, ID Checker, Switch, Port, IT Kommentar, TSR REMARKS, SN-PC, SN-SC, TV-ID)
LOCATIONS_DATA = """
BERN03	16321	BERNAU BEI BERLIN	SCHWANEBECKER CHAUSSEE 12	+49 (3338) 704099		destBERN03@europcar.com	A	BERNAU BEI BERLIN	Fibich & Scholz GbR	BB	1	Switch voll			Connected to Noname Switch and labeled		201728 00606	
BERT01	12529	BERLIN	FLUGHAFEN BERLIN BRANDENBURG	+49 (3063) 49160		destBERT01@europcar.com	CAP	BERLIN   BRANDENBURG AIRPORT -IKC-	Sascha Seelhoff	BB	2	ECARBERT01AZS01	7 +12	ok				
CBUC02	3050	COTTBUS	DRESDENER STR 18	+49 (355) 478570		destCBUC02@europcar.com	A	COTTBUS	Marvin Paethe	BB	1	ECARCBUC02AZS02	4					
EBXC02	16225	EBERSWALDE	BREITE STR. 144	+49 (3334) 289055		destEBXC02@europcar.com	A	EBERSWALDE	Wilmerstaedt und Buchwald Autovermietung GbR	BB	1	ECAREBXC02AZS01	1					
XXPC02	14467	POTSDAM	LANGE BRUECKE 6	+49 (331) 298240		destXXPC02@europcar.com	C	POTSDAM	Lars Pantel	BB	1	ECARXXPC02AZS01	20					
BERC01	10787	BERLIN	KURFUERSTENSTR. 101	+49 (30) 2350640		destBERC01@europcar.com	C	BERLIN  CITY WEST -IKC-	Andreas Krohn	BE	1	ECARBERC01AZS01	4			47714571453	201734 00745	
BERC02	10178	BERLIN	ALEXANDERPLATZ 8	+49 (30) 2407900		destBERC02@europcar.com	C	BERLIN  ALEXANDERPLATZ 24H NO TRUCK	Jens Georgi	BE	2	ECARBERC02AZS01	7 + 8					
BERE01	10365	BERLIN	SIEGFRIEDSTR. 64	+49 (30) 5577430		destBERE01@europcar.com	CSS	BERLIN VAN TRUCK CARS IKC	Sven Bartsch	BE	1	ECARBERE01AZZ01	2					
BERE02	12489	BERLIN	RUDOWER CHAUSSEE 25	+49 (30) 67825911		destBERE02@europcar.com	A	BERLIN  SOUTHEAST ADLERSHOF -IKC-	Uwe Kowalski	BE	1	ECARBERE02AZS01	1		No Rack, No Ports, no cables			
BERE03	12627	BERLIN	FRITZ-LANG-PLATZ 6	+49 (30) 99275827		destBERE03@europcar.com	A	BERLIN HELLERSDORF NO TRUCKS IKC	Uwe Kowalski	BE	1	ECARBERE03AZZ01	2		No Rack	 	 	
BERL01	10557	BERLIN	EUROPAPLATZ 1	+49 (30) 20624600		destBERL01@europcar.com	CRR	BERLIN   HAUPTBAHNHOF -IKC-	Angelika Fricke	BE	1	ECARBERL01AZS01	15					
BERN01	13405	BERLIN	KAPWEG 4	+49 (30) 4548920		destBERN01@europcar.com	C	BERLIN NORTH REINICKENDORF -IKC-	Vincent Eichhorst	BE	1	ECARBERN01AZS01	1	steckt derzeit am Router, muss umgesteckt werden	All Switches Full with Link Activity / connected on Port 5 FW			
BERW04	13597	BERLIN	SEEGEFELDER STR. 16	+49 (30) 3539500		destBERW04@europcar.com	A	BERLIN SPANDAU	Torsten Pohl	BE	1	ECARBERW01AZS01	1				201820 00661	
FDHC02	88045	FRIEDRICHSHAFEN	EUGENSTR. 47	+49 (7541) 23053		destFDHC02@europcar.com	C	FRIEDRICHSHAFEN CITY -IKC-	Anja Albrecht	BW	1	ECARFDHC02AZS02	5				201737 01611
"""

def parse_location_line(line):
    """Parse a single TSV line into location dict"""
    if not line.strip():
        return None
    
    parts = line.split('\t')
    if len(parts) < 12:
        return None
    
    # Parse fields
    location_code = parts[0].strip() if parts[0] else None
    postal_code = parts[1].strip() if parts[1] else None
    city = parts[2].strip() if parts[2] else None
    street = parts[3].strip() if parts[3] else None
    phone = parts[4].strip() if parts[4] else None
    phone_internal = parts[5].strip() if parts[5] else None
    email = parts[6].strip() if parts[6] else None
    main_type = parts[7].strip() if parts[7] else None
    station_name = parts[8].strip() if parts[8] else None
    manager = parts[9].strip() if parts[9] else None
    state = parts[10].strip() if parts[10] else None
    id_checker = parts[11].strip() if parts[11] and parts[11].strip().isdigit() else None
    switch_info = parts[12].strip() if len(parts) > 12 and parts[12] else None
    port = parts[13].strip() if len(parts) > 13 and parts[13] else None
    it_comment = parts[14].strip() if len(parts) > 14 and parts[14] else None
    tsr_remarks = parts[15].strip() if len(parts) > 15 and parts[15] else None
    sn_pc = parts[16].strip() if len(parts) > 16 and parts[16] else None
    sn_sc = parts[17].strip() if len(parts) > 17 and parts[17] else None
    tv_id = parts[18].strip() if len(parts) > 18 and parts[18] else None
    
    if not location_code:
        return None
    
    return {
        "location_id": str(uuid.uuid4()),
        "tenant_id": TENANT_ID,
        "location_code": location_code,
        "postal_code": postal_code or "",
        "city": city or "",
        "street": street or "",
        "phone": phone or "",
        "phone_internal": phone_internal or "",
        "email": email or "",
        "main_type": main_type or "",
        "station_name": station_name or "",
        "manager": manager or "",
        "state": state or "",
        "id_checker": int(id_checker) if id_checker and id_checker.isdigit() else None,
        "switch_info": switch_info or "",
        "port": port or "",
        "it_comment": it_comment or "",
        "tsr_remarks": tsr_remarks or "",
        "sn_pc": sn_pc or "",
        "sn_sc": sn_sc or "",
        "tv_id": tv_id or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "import_script"
    }

def import_locations():
    """Import all locations from LOCATIONS_DATA"""
    lines = LOCATIONS_DATA.strip().split('\n')
    
    imported = 0
    skipped = 0
    errors = 0
    
    for line in lines:
        try:
            location = parse_location_line(line)
            if not location:
                skipped += 1
                continue
            
            # Check if already exists
            existing = db.tenant_locations.find_one({
                "tenant_id": TENANT_ID,
                "location_code": location["location_code"]
            })
            
            if existing:
                print(f"⚠️  Location {location['location_code']} already exists, skipping")
                skipped += 1
                continue
            
            # Insert
            db.tenant_locations.insert_one(location)
            print(f"✅ Imported: {location['location_code']} - {location['station_name']}")
            imported += 1
            
        except Exception as e:
            print(f"❌ Error processing line: {str(e)}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"Import Summary:")
    print(f"  ✅ Imported: {imported}")
    print(f"  ⚠️  Skipped: {skipped}")
    print(f"  ❌ Errors: {errors}")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("Starting Europcar Locations Import...")
    print(f"Target Tenant ID: {TENANT_ID}")
    print(f"Target Collection: portal_db.tenant_locations")
    print(f"{'='*60}\n")
    
    # Confirm
    response = input("Continue with import? (yes/no): ")
    if response.lower() != 'yes':
        print("Import cancelled.")
        sys.exit(0)
    
    import_locations()
