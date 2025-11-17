#!/usr/bin/env python3
"""
Import real location data from TSV into MongoDB
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Federal state mapping (German abbreviations to full names)
STATE_MAPPING = {
    'BW': 'Baden-Württemberg',
    'BY': 'Bayern',
    'BE': 'Berlin',
    'BB': 'Brandenburg',
    'HB': 'Bremen',
    'HH': 'Hamburg',
    'HE': 'Hessen',
    'MV': 'Mecklenburg-Vorpommern',
    'NI': 'Niedersachsen',
    'NW': 'Nordrhein-Westfalen',
    'RP': 'Rheinland-Pfalz',
    'SL': 'Saarland',
    'SN': 'Sachsen',
    'ST': 'Sachsen-Anhalt',
    'SH': 'Schleswig-Holstein',
    'TH': 'Thüringen'
}

# TSV data from Google Sheet
TSV_DATA = """LOCATIONCODE	LOCATIONNAME	STREET	ZIP	CITY	COUNTRY	PHONE	EMAIL	MANAGER	FEDERAL STATE	COUNT ID-CHECKER	SERIAL PC	SERIAL SCANNER	MAC	TEAMVIEWER-ID	SETUP DATE	SETUP TIME	LICENSE ACTIVATION DATE	INTERNET AVAILABLE	
AAHC01	AACHEN -IKC-	JUELICHER STR. 340	52070	AACHEN	GERMANY	+49 (241) 958150	destAAHC01@europcar.com	Sellam Duenow	NW	1									
ZCBC01	ASCHAFFENBURG	HANAUER STR. 78	63739	ASCHAFFENBURG	GERMANY	+49 (6021) 443690	destZCBC01@europcar.com	Tobias Resnik	BY	2?									
AGBC02	AUGSBURG LECHHAUSEN	ZUGSPITZSTR 187	86165	AUGSBURG	GERMANY	+49 (405) 20188000	destAGBC02@europcar.com	Alexander Baur	BY	1									
BQMC03	BAD HOMBURG	HINDENBURGRING 36	61348	BAD HOMBURG	GERMANY	+49 (6172) 37804	destBQMC03@europcar.com	Michael Martin	HE	1									
BPEC01	BAD HONNEF	HAUPTSTR. 102	53604	BAD HONNEF	GERMANY	+49 (2224) 72222	destBPEC01@europcar.com	Juergen Lemke	NW	1									
QMZS01	BAD KREUZNACH	BOSENHEIMER STR 284	55543	BAD KREUZNACH	GERMANY	+49 (671) 886820	destQMZS01@europcar.com	Bernd Gaens	RP	1									
ZCCC01	BADEN-BADEN	SINZHEIMER STR. 79 A	76532	BADEN-BADEN	GERMANY	+49 (7221) 50660	destZCCC01@europcar.com	Swetlana Bogatyrev	BW	2?									
BPZC01	BAUTZEN	DRESDENER STR. 88 B	2625	BAUTZEN	GERMANY	+49 (3591) 529530	destBPZC01@europcar.com	Henry Hein	SN	1									
BYUC01	BAYREUTH	ALBRECHT-DUERER-STR. 3	95448	BAYREUTH	GERMANY	+49 (921) 726360	destBYUC01@europcar.com	Philipp Thoma	BY	1									
BERC01	BERLIN  CITY WEST -IKC-	KURFUERSTENSTR. 101	10787	BERLIN	GERMANY	+49 (30) 2350640	destBERC01@europcar.com	Andreas Krohn	BE	1									
BERC02	BERLIN  ALEXANDERPLATZ 24H NO TRUCK	ALEXANDERPLATZ 8	10178	BERLIN	GERMANY	+49 (30) 2407900	destBERC02@europcar.com	Jens Georgi	BE	2									
BERE01	BERLIN VAN TRUCK CARS IKC	SIEGFRIEDSTR. 64	10365	BERLIN	GERMANY	+49 (30) 5577430	destBERE01@europcar.com	Sven Bartsch	BE	1									
BERE02	BERLIN  SOUTHEAST ADLERSHOF -IKC-	RUDOWER CHAUSSEE 25	12489	BERLIN	GERMANY	+49 (30) 67825911	destBERE02@europcar.com	Uwe Kowalski	BE	1									
BERE03	BERLIN HELLERSDORF NO TRUCKS IKC	FRITZ-LANG-PLATZ 6	12627	BERLIN	GERMANY	+49 (30) 99275827	destBERE03@europcar.com	Uwe Kowalski	BE	1									
BERL01	BERLIN   HAUPTBAHNHOF -IKC-	EUROPAPLATZ 1	10557	BERLIN	GERMANY	+49 (30) 20624600	destBERL01@europcar.com	Angelika Fricke	BE	1									
BERN01	BERLIN NORTH REINICKENDORF -IKC-	KAPWEG 4	13405	BERLIN	GERMANY	+49 (30) 4548920	destBERN01@europcar.com	Vincent Eichhorst	BE	1									
BERT01	BERLIN   BRANDENBURG AIRPORT -IKC-	FLUGHAFEN BERLIN BRANDENBURG	12529	BERLIN	GERMANY	+49 (3063) 49160	destBERT01@europcar.com	Sascha Seelhoff	BB	2									
BERW04	BERLIN SPANDAU	SEEGEFELDER STR. 16	13597	BERLIN	GERMANY	+49 (30) 3539500	destBERW04@europcar.com	Torsten Pohl	BE	1									
BERN03	BERNAU BEI BERLIN	SCHWANEBECKER CHAUSSEE 12	16321	BERNAU BEI BERLIN	GERMANY	+49 (3338) 704099	destBERN03@europcar.com	Fibich & Scholz GbR	BB	1									
BFEC01	BIELEFELD	ECKENDORFER STR. 34	33609	BIELEFELD	GERMANY	+49 (521) 529940	destBFEC01@europcar.com	Markus Aktan	NW	1									
GEZC01	BOCHUM	ALLEESTR. 53	44793	BOCHUM	GERMANY	+49 (234) 963030	destGEZC01@europcar.com	Heiko Feierabend	NW	1									
GFHN01	BONN   NORTH 24H OPEN	POTSDAMER PLATZ 7	53119	BONN	GERMANY	+49 (228) 604340	destGFHN01@europcar.com	Pedro Ferreira	NW	1									
GFHS01	BONN  SOUTH BAD GODESBERG -IKC-	KOBLENZER STR. 171	53177	BONN	GERMANY	+49 (228) 333720	destGFHS01@europcar.com	Willi Suelzen GmbH & Co. KG	NW	1									
BXPC01	BOTTROP NEARBY MAINSTATION	ESSENER STR. 155	46242	BOTTROP	GERMANY	+49 (2041) 28855	destBXPC01@europcar.com	Ralf Pauschert	NW	1									
BWEC01	BRAUNSCHWEIG	BERLINER PLATZ 1C	38102	BRAUNSCHWEIG	GERMANY	+49 (531) 244980	destBWEC01@europcar.com	Jan Dannemann	NI	1									
BREC01	BREMEN TILL 12AM *NO TRUCKS*	BREITENWEG 32	28195	BREMEN	GERMANY	+49 (421) 173510	destBREC01@europcar.com	Thomas Nabow	HB	1									
BREN25	BREMEN VAN TRUCK CARS IKC	LUDWIG ERHARD STR 45	28197	BREMEN	GERMANY	+49 (421) 5350980	destBREN25@europcar.com	Thorsten Buschmann	HB	1									
BRET01	BREMEN   AIRPORT -IKC-	FLUGHAFENALLEE 29	28199	BREMEN	GERMANY	+49 (421) 557440	destBRET01@europcar.com	Malte Kuehl	HB	1									
FKBN02	BRUCHSAL *NO TRUCKS*	CHRISTIAN PAEHR STR 4	76646	BRUCHSAL	GERMANY	+49 (7251) 9297592	destFKBN02@europcar.com	Autohaus Schlimm	BW	1									
ZCKC02	BRUEHL	RHEINSTR. 209	50321	BRUEHL	GERMANY	+49 (2232) 566819	destZCKC02@europcar.com	Lahbib Rabhioui	NW	1									
QFLN01	BURGHAUSEN	MARKTLER STR. 65	84489	BURGHAUSEN	GERMANY	+49 (8677) 878762	destQFLN01@europcar.com	Marlene Dracopoulos	BY	1									
CHWC01	CHEMNITZ TILL 12AM	NEEFESTR. 149	9116	CHEMNITZ	GERMANY	+49 (371) 281310	destCHWC01@europcar.com	Sebastian Bonitz	SN	1									
CBUC02	COTTBUS	DRESDENER STR 18	3050	COTTBUS	GERMANY	+49 (355) 478570	destCBUC02@europcar.com	Marvin Paethe	BB	1									
QEIC01	CRAILSHEIM  NO TRUCKS	HALLER STR  208	74564	CRAILSHEIM	GERMANY	+49 (7951) 295920	destQEIC01@europcar.com	Linda Nguyen & Viktor Frank GbR	BW	1?									
DASC01	DARMSTADT	OTTO-ROEHM-STR. 53	64293	DARMSTADT NORTH	GERMANY	+49 (6151) 98890	destDASC01@europcar.com	Bjoern-Alexander Behnke	HE	1									
BREW03	DELMENHORST	NIEDERSACHSENDAMM 2	27751	DELMENHORST	GERMANY	+49 (4221) 60553	destBREW03@europcar.com	Ferhat Yalcin	NI	1"""

async def parse_and_import():
    """Parse TSV data and import into MongoDB"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    locations_collection = db['locations']
    
    try:
        # Test connection
        await client.server_info()
        print("✓ Connected to MongoDB\n")
        
        # Parse TSV data
        lines = TSV_DATA.strip().split('\n')
        headers = lines[0].split('\t')
        
        locations = []
        for line in lines[1:]:
            if not line.strip():
                continue
                
            fields = line.split('\t')
            if len(fields) < 10:
                continue
            
            # Extract device number from location code (last 2 digits)
            location_code = fields[0].strip()
            # Most codes end with digits like "01", "02", "03", etc.
            # Extract the last 2 characters if they're digits
            if len(location_code) >= 2 and location_code[-2:].isdigit():
                device_number = location_code[-2:]
            else:
                device_number = "01"  # Default
            
            # Map federal state abbreviation to full name
            state_abbr = fields[9].strip() if len(fields) > 9 else ""
            state_full = STATE_MAPPING.get(state_abbr, state_abbr)
            
            location = {
                "locationCode": location_code,
                "deviceNumber": device_number,
                "locationName": fields[1].strip(),
                "street": fields[2].strip(),
                "zip": fields[3].strip(),
                "city": fields[4].strip(),
                "state": state_full,
                "country": fields[5].strip(),
                "continent": "Europe",  # All are in Germany/Europe
                "phone": fields[6].strip(),
                "email": fields[7].strip(),
                "manager": fields[8].strip() if len(fields) > 8 else "",
                "tvid": fields[14].strip() if len(fields) > 14 else "",
                "snStation": fields[11].strip() if len(fields) > 11 else "",
                "snScanner": fields[12].strip() if len(fields) > 12 else ""
            }
            
            locations.append(location)
        
        print(f"Parsed {len(locations)} locations from TSV data\n")
        
        # Clear existing data
        existing_count = await locations_collection.count_documents({})
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing locations")
            response = input("Clear existing data and import real locations? (y/N): ")
            if response.lower() != 'y':
                print("Import cancelled")
                return
            
            await locations_collection.delete_many({})
            print("✓ Cleared existing locations\n")
        
        # Import new data
        if locations:
            result = await locations_collection.insert_many(locations)
            print(f"✓ Successfully imported {len(result.inserted_ids)} real locations!\n")
            
            # Show sample
            print("Sample locations imported:")
            sample = locations[:5]
            for loc in sample:
                print(f"  - {loc['locationCode']}: {loc['locationName']}, {loc['city']}")
            
            # Show statistics
            total = await locations_collection.count_documents({})
            continents = await locations_collection.distinct("continent")
            countries = await locations_collection.distinct("country")
            states = await locations_collection.distinct("state")
            cities = await locations_collection.distinct("city")
            
            print(f"\n📊 Database Statistics:")
            print(f"  Total Locations: {total}")
            print(f"  Continents: {len(continents)} ({', '.join(continents)})")
            print(f"  Countries: {len(countries)} ({', '.join(countries)})")
            print(f"  States: {len(states)}")
            print(f"  Cities: {len(cities)}")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    # Only include first batch for testing
    asyncio.run(parse_and_import())
