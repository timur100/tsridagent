"""
Import Europcar Device Data into MongoDB
"""
import os
from pymongo import MongoClient
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Device data from the provided table
devices_data = [
    {"device_id": "AAHC01-01", "locationcode": "AAHC01", "city": "AACHEN", "sn_pc": "047924271453", "sn_sc": "201737 01567"},
    {"device_id": "AGBC02-01", "locationcode": "AGBC02", "city": "AUGSBURG", "sn_pc": "010242571153", "sn_sc": "201734 00748"},
    {"device_id": "BCOC01-01", "locationcode": "BCOC01", "city": "RHEDE", "sn_pc": "017661771353", "sn_sc": "201820 00651"},
    {"device_id": "BERC01-01", "locationcode": "BERC01", "city": "BERLIN", "sn_pc": "047714571453", "sn_sc": "201734 00745"},
    {"device_id": "BERC02-01", "locationcode": "BERC02", "city": "BERLIN  ALEXANDERPLATZ 24H NO TRUCK", "sn_pc": "020201255253", "sn_sc": "201743 00715"},
    {"device_id": "BERC02-02", "locationcode": "BERC02", "city": "BERLIN  ALEXANDERPLATZ 24H NO TRUCK", "sn_pc": "006368562653", "sn_sc": "201743 00735"},
    {"device_id": "BERE01-01", "locationcode": "BERE01", "city": "BERN03", "sn_pc": "047757571453", "sn_sc": "201734 00728"},
    {"device_id": "BERE02-01", "locationcode": "BERE02", "city": "BERLIN", "sn_pc": "015082580153", "sn_sc": "201840 00045"},
    {"device_id": "BERE03-01", "locationcode": "BERE03", "city": "BERLIN", "sn_pc": "016909380153", "sn_sc": "201820 00663"},
    {"device_id": "BERL01-01", "locationcode": "BERL01", "city": "BERLIN", "sn_pc": "047566771453", "sn_sc": "201734 00729"},
    {"device_id": "BERN01-01", "locationcode": "BERN01", "city": "BERLIN", "sn_pc": "047926771453", "sn_sc": "201734 00732"},
    {"device_id": "BERN03-01", "locationcode": "BERN03", "city": "BERNAU BEI BERLIN", "sn_pc": "047640771453", "sn_sc": "201728 00606"},
    {"device_id": "BERW04-01", "locationcode": "BERW04", "city": "Berlin", "sn_pc": "015047480153", "sn_sc": "201820 00661"},
    {"device_id": "BQMC03-01", "locationcode": "BQMC03", "city": "BAD HOMBURG", "sn_pc": "033341763753", "sn_sc": "201743 00737"},
    {"device_id": "BREW03-01", "locationcode": "BREW03-01-READY", "city": "DELMENHORST", "sn_pc": "047925171453", "sn_sc": "201840 00037"},
    {"device_id": "BWEC01-01", "locationcode": "BWEC01", "city": "BRAUNSCHWEIG", "sn_pc": "047455371453", "sn_sc": "201737 01554"},
    {"device_id": "CBUC02-01", "locationcode": "CBUC02", "city": "COTTBUS", "sn_pc": "000876770153", "sn_sc": "201743 00708"},
    {"device_id": "DUST01-01", "locationcode": "DUST01", "city": "DUESSELDORF", "sn_pc": "049409205053", "sn_sc": "201728 00602"},
    {"device_id": "HAJT01-02", "locationcode": "HAJT01", "city": "LANGENHAGEN", "sn_pc": "047504171453", "sn_sc": "201743 00734"},
    {"device_id": "ZQPC02-01", "locationcode": "ZQPC02", "city": "WESEL", "sn_pc": "037181170253", "sn_sc": "201743 00710"},
    {"device_id": "DUST01-02", "locationcode": "DUST01", "city": "DUESSELDORF", "sn_pc": "047968171453", "sn_sc": "201737 01604"},
    {"device_id": "FRAT01-04", "locationcode": "FRAT01", "city": "FRANKFURT AM MAIN", "sn_pc": "000656470153", "sn_sc": "201743 00694"},
    {"device_id": "MUCC01-02", "locationcode": "MUCC01", "city": "MUENCHEN", "sn_pc": "047904471453", "sn_sc": "201743 00698"},
    {"device_id": "FKBC01-02", "locationcode": "FKBC01", "city": "KARLSRUHE", "sn_pc": "047915271453", "sn_sc": "201743 00685"},
    {"device_id": "STRT01-02", "locationcode": "STRT01", "city": "STUTTGART", "sn_pc": "039721671253", "sn_sc": "201840 00030"},
    {"device_id": "ZSUC03-01", "locationcode": "ZSUC03", "city": "DESSAU", "sn_pc": "026702464653", "sn_sc": "201734 00724"},
    {"device_id": "ZTZE02-01", "locationcode": "ZTZE02", "city": "FREIBERG / SACHSEN", "sn_pc": "038141481553", "sn_sc": "201840 00032"},
    {"device_id": "ZQLC01-01", "locationcode": "ZQLC01", "city": "VILLINGEN-SCHWENNINGEN", "sn_pc": "038140581553", "sn_sc": "201728 00618"},
    {"device_id": "ZQPW02-01", "locationcode": "ZQPW02", "city": "KLEVE", "sn_pc": "013935780153", "sn_sc": "201734 00772"},
    {"device_id": "ZQUC01-01", "locationcode": "ZQUC01", "city": "WOLFSBURG", "sn_pc": "000722370153", "sn_sc": "201734 00759"},
    {"device_id": "ZQWN01-01", "locationcode": "ZQWN01", "city": "HOMBURG", "sn_pc": "057171771053", "sn_sc": "201840 00024"},
    {"device_id": "ZPSC01-01", "locationcode": "ZPSC01", "city": "RUESSELSHEIM", "sn_pc": "039747555153", "sn_sc": "201737 01585"},
    {"device_id": "MQGC01-01", "locationcode": "MQGC01", "city": "MAGDEBURG", "sn_pc": "047945671453", "sn_sc": "201734 00760"},
    {"device_id": "MUCC01-01", "locationcode": "MUCC01", "city": "MUENCHEN", "sn_pc": "047572371453", "sn_sc": "201743 00697"},
    {"device_id": "MUCE02-01", "locationcode": "MUCE02", "city": "MUENCHEN", "sn_pc": "047772171453", "sn_sc": "201837 00386"},
    {"device_id": "MUCN01-01", "locationcode": "MUCN01", "city": "MUENCHEN", "sn_pc": "035741162353", "sn_sc": "201840 00046"},
    {"device_id": "MUCT01-01", "locationcode": "MUCT01", "city": "MUENCHEN FLUGHAFEN", "sn_pc": "047553471453", "sn_sc": "201728 00622"},
    {"device_id": "MUCT01-03", "locationcode": "MUCT01", "city": "MUENCHEN FLUGHAFEN", "sn_pc": "047979671453", "sn_sc": "201728 00615"},
    {"device_id": "NUES01-01", "locationcode": "NUES01", "city": "NUERNBERG", "sn_pc": "047902671453", "sn_sc": "201743 00717"},
    {"device_id": "NUET01-01", "locationcode": "NUET01", "city": "NUERNBERG", "sn_pc": "037911781553", "sn_sc": "201743 00732"},
    {"device_id": "NUEW01-01", "locationcode": "NUEW01", "city": "NUERNBERG", "sn_pc": "039178772653", "sn_sc": "201734 00761"},
    {"device_id": "OENC01-01", "locationcode": "OENC01", "city": "OLDENBURG / OLDENBURG", "sn_pc": "049482105053", "sn_sc": "201734 00744"},
    {"device_id": "OFEC01-01", "locationcode": "OFEC01", "city": "OFFENBACH", "sn_pc": "049073505053", "sn_sc": "201737 01605"},
    {"device_id": "PADC02-01", "locationcode": "PADC02", "city": "PADERBORN", "sn_pc": "03362780053", "sn_sc": "201734 00751"},
    {"device_id": "QBON03-01", "locationcode": "QBON03", "city": "RECKLINGHAUSEN", "sn_pc": "012240572553", "sn_sc": "201734 00749"},
    {"device_id": "QBON04-01", "locationcode": "QBON04", "city": "HERNE", "sn_pc": "066709772553", "sn_sc": "201823 00006"},
    {"device_id": "QKFC03-01", "locationcode": "QKFC03", "city": "KREFELD", "sn_pc": "000667270153", "sn_sc": "201737 01555"},
    {"device_id": "QLGN01-01", "locationcode": "QLGN01", "city": "LANDSHUT", "sn_pc": "014815280153", "sn_sc": "201840 00048"},
    {"device_id": "QLHC01-01", "locationcode": "QLHC01", "city": "KELSTERBACH", "sn_pc": "047698171453", "sn_sc": "201737 01586"},
    {"device_id": "QMZC01-01", "locationcode": "QMZC01", "city": "MAINZ", "sn_pc": "047898671453", "sn_sc": "201737 01571"},
    {"device_id": "QMZS01-01", "locationcode": "QMZS01", "city": "BAD KREUZNACH", "sn_pc": "087558272453", "sn_sc": "201743 00693"},
    # Continuing with more devices...
]

def import_devices():
    """Import devices into MongoDB"""
    try:
        # Clear existing devices
        db.europcar_devices.delete_many({})
        print("Cleared existing devices")
        
        # Import new devices with additional fields
        imported_count = 0
        for device in devices_data:
            # Add additional fields
            device['customer'] = 'Europcar Autovermietung GmbH'
            device['status'] = 'online' if imported_count % 3 != 0 else 'offline'  # Mock status
            device['hardware_model'] = 'Desko IDenty chek.work'
            device['last_activity'] = datetime.now(timezone.utc).isoformat()
            device['created_at'] = datetime.now(timezone.utc).isoformat()
            device['active'] = True
            
            # Insert into MongoDB
            db.europcar_devices.insert_one(device)
            imported_count += 1
        
        print(f"✅ Successfully imported {imported_count} devices")
        
        # Print summary
        total = db.europcar_devices.count_documents({})
        online = db.europcar_devices.count_documents({"status": "online"})
        offline = db.europcar_devices.count_documents({"status": "offline"})
        
        print(f"\nSummary:")
        print(f"Total Devices: {total}")
        print(f"Online: {online}")
        print(f"Offline: {offline}")
        
    except Exception as e:
        print(f"❌ Error importing devices: {e}")

if __name__ == "__main__":
    import_devices()
