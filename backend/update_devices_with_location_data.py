"""
Script zum Anreichern der Geräte mit Standortdaten
Fügt Straße, PLZ, Ort, Land, TVID, IP, SW Vers. hinzu
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime, timezone

# Standort-Daten aus der Tabelle
LOCATION_DATA = {
    "AAHC01": {"street": "JUELICHER STR. 340", "zip": "52070", "city": "AACHEN", "country": "GERMANY"},
    "ZCBC01": {"street": "HANAUER STR. 78", "zip": "63739", "city": "ASCHAFFENBURG", "country": "GERMANY"},
    "AGBC02": {"street": "ZUGSPITZSTR 187", "zip": "86165", "city": "AUGSBURG", "country": "GERMANY"},
    "BQMC03": {"street": "HINDENBURGRING 36", "zip": "61348", "city": "BAD HOMBURG", "country": "GERMANY"},
    "BPEC01": {"street": "HAUPTSTR. 102", "zip": "53604", "city": "BAD HONNEF", "country": "GERMANY"},
    "QMZS01": {"street": "BOSENHEIMER STR 284", "zip": "55543", "city": "BAD KREUZNACH", "country": "GERMANY"},
    "ZCCC01": {"street": "SINZHEIMER STR. 79 A", "zip": "76532", "city": "BADEN-BADEN", "country": "GERMANY"},
    "BPZC01": {"street": "DRESDENER STR. 88 B", "zip": "2625", "city": "BAUTZEN", "country": "GERMANY"},
    "BYUC01": {"street": "ALBRECHT-DUERER-STR. 3", "zip": "95448", "city": "BAYREUTH", "country": "GERMANY"},
    "BERC01": {"street": "KURFUERSTENSTR. 101", "zip": "10787", "city": "BERLIN", "country": "GERMANY"},
    "BERC02": {"street": "ALEXANDERPLATZ 8", "zip": "10178", "city": "BERLIN", "country": "GERMANY"},
    "BERE01": {"street": "SIEGFRIEDSTR. 64", "zip": "10365", "city": "BERLIN", "country": "GERMANY"},
    "BERE02": {"street": "RUDOWER CHAUSSEE 25", "zip": "12489", "city": "BERLIN", "country": "GERMANY"},
    "BERE03": {"street": "FRITZ-LANG-PLATZ 6", "zip": "12627", "city": "BERLIN", "country": "GERMANY"},
    "BERL01": {"street": "EUROPAPLATZ 1", "zip": "10557", "city": "BERLIN", "country": "GERMANY"},
    "BERN01": {"street": "KAPWEG 4", "zip": "13405", "city": "BERLIN", "country": "GERMANY"},
    "BERT01": {"street": "FLUGHAFEN BERLIN BRANDENBURG", "zip": "12529", "city": "BERLIN", "country": "GERMANY"},
    "BERW04": {"street": "SEEGEFELDER STR. 16", "zip": "13597", "city": "BERLIN", "country": "GERMANY"},
    "BERN03": {"street": "SCHWANEBECKER CHAUSSEE 12", "zip": "16321", "city": "BERNAU BEI BERLIN", "country": "GERMANY"},
    "BFEC01": {"street": "ECKENDORFER STR. 34", "zip": "33609", "city": "BIELEFELD", "country": "GERMANY"},
    "GEZC01": {"street": "ALLEESTR. 53", "zip": "44793", "city": "BOCHUM", "country": "GERMANY"},
    "GFHN01": {"street": "POTSDAMER PLATZ 7", "zip": "53119", "city": "BONN", "country": "GERMANY"},
    "GFHS01": {"street": "KOBLENZER STR. 171", "zip": "53177", "city": "BONN", "country": "GERMANY"},
    "BXPC01": {"street": "ESSENER STR. 155", "zip": "46242", "city": "BOTTROP", "country": "GERMANY"},
    "BWEC01": {"street": "BERLINER PLATZ 1C", "zip": "38102", "city": "BRAUNSCHWEIG", "country": "GERMANY"},
    "BREC01": {"street": "BREITENWEG 32", "zip": "28195", "city": "BREMEN", "country": "GERMANY"},
    "BREN25": {"street": "LUDWIG ERHARD STR 45", "zip": "28197", "city": "BREMEN", "country": "GERMANY"},
    "BRET01": {"street": "FLUGHAFENALLEE 29", "zip": "28199", "city": "BREMEN", "country": "GERMANY"},
    "FKBN02": {"street": "CHRISTIAN PAEHR STR 4", "zip": "76646", "city": "BRUCHSAL", "country": "GERMANY"},
    "ZCKC02": {"street": "RHEINSTR. 209", "zip": "50321", "city": "BRUEHL", "country": "GERMANY"},
    "QFLN01": {"street": "MARKTLER STR. 65", "zip": "84489", "city": "BURGHAUSEN", "country": "GERMANY"},
    "CHWC01": {"street": "NEEFESTR. 149", "zip": "9116", "city": "CHEMNITZ", "country": "GERMANY"},
    "CBUC02": {"street": "DRESDENER STR 18", "zip": "3050", "city": "COTTBUS", "country": "GERMANY"},
    "QEIC01": {"street": "HALLER STR  208", "zip": "74564", "city": "CRAILSHEIM", "country": "GERMANY"},
    "DASC01": {"street": "OTTO-ROEHM-STR. 53", "zip": "64293", "city": "DARMSTADT NORTH", "country": "GERMANY"},
    "BREW03": {"street": "NIEDERSACHSENDAMM 2", "zip": "27751", "city": "DELMENHORST", "country": "GERMANY"},
    "BREW03-01-READY": {"street": "NIEDERSACHSENDAMM 2", "zip": "27751", "city": "DELMENHORST", "country": "GERMANY"},
    "ZSUC03": {"street": "ELISABETHSTR 40", "zip": "6844", "city": "DESSAU", "country": "GERMANY"},
    "DTMC01": {"street": "SPICHERNER STR. 67", "zip": "44149", "city": "DORTMUND", "country": "GERMANY"},
    "DTMN01": {"street": "EVINGERSTR 70", "zip": "44145", "city": "DORTMUND", "country": "GERMANY"},
    "DTMN25": {"street": "HANNOEVERSCHE STR. 107", "zip": "44143", "city": "DORTMUND", "country": "GERMANY"},
    "DTMT01": {"street": "FLUGHAFENRING 1", "zip": "44319", "city": "DORTMUND", "country": "GERMANY"},
    "DRSC02": {"street": "STREHLENER STR. 5", "zip": "1069", "city": "DRESDEN", "country": "GERMANY"},
    "DRSN01": {"street": "SCHLESISCHER PLATZ 1", "zip": "1097", "city": "DRESDEN", "country": "GERMANY"},
    "DRSN25": {"street": "HAUBOLDSTR. 5-7", "zip": "1239", "city": "DRESDEN", "country": "GERMANY"},
    "DRST01": {"street": "WILHELMINE-REICHARD-RING 1", "zip": "1109", "city": "DRESDEN", "country": "GERMANY"},
    "DUSC01": {"street": "BISMARCKSTR. 95", "zip": "40210", "city": "DUESSELDORF", "country": "GERMANY"},
    "DUSN01": {"street": "KIESHECKER WEG 141", "zip": "40468", "city": "DUESSELDORF", "country": "GERMANY"},
    "DUST01": {"street": "FLUGHAFENSTR.120 ARRIVAL TERMINAL B", "zip": "40474", "city": "DUESSELDORF", "country": "GERMANY"},
    "DUIC02": {"street": "MAINSTR. 19", "zip": "47051", "city": "DUISBURG", "country": "GERMANY"},
    "EBXC02": {"street": "BREITE STR. 144", "zip": "16225", "city": "EBERSWALDE", "country": "GERMANY"},
    "EMEC03": {"street": "BUTJADINGER STR 2", "zip": "26723", "city": "EMDEN", "country": "GERMANY"},
    "ERFC01": {"street": "WEIMARISCHE STR. 32", "zip": "99099", "city": "ERFURT", "country": "GERMANY"},
    "DUSW04": {"street": "GEWERBESTR. SUED 10", "zip": "41812", "city": "ERKELENZ", "country": "GERMANY"},
    "ERLC01": {"street": "HILPERTSTR. 29", "zip": "91052", "city": "ERLANGEN", "country": "GERMANY"},
    "ESSC01": {"street": "SCHUETZENBAHN 65", "zip": "45141", "city": "ESSEN", "country": "GERMANY"},
    "ESSS01": {"street": "RUHRTALSTR. 101", "zip": "45239", "city": "ESSEN", "country": "GERMANY"},
    "ZEBC02": {"street": "SCHORNDORFER STR. 14", "zip": "73730", "city": "ESSLINGEN", "country": "GERMANY"},
    "FKBS02": {"street": "SCHOELLBRONNER STR. 9-11", "zip": "76275", "city": "ETTLINGEN", "country": "GERMANY"},
    "ZEDC02": {"street": "EIFELRING 45 49", "zip": "53879", "city": "EUSKIRCHEN", "country": "GERMANY"},
    "FLFC01": {"street": "ZUR BLEICHE 51", "zip": "24941", "city": "FLENSBURG", "country": "GERMANY"},
    "FRAC03": {"street": "EUROPA ALLEE 6", "zip": "60327", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "FRAE02": {"street": "HANAUER LANDSTR. 334", "zip": "60314", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "FRAL01": {"street": "IM HAUPTBAHNHOF 1", "zip": "60329", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "FRAT01": {"street": "AIRPORT CITY MALL, BEREICH A", "zip": "60549", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "FRAT02": {"street": "TERMINAL 2, LEVEL 2, HALLE D", "zip": "60549", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "FRAW01": {"street": "LUDWIG LANDMANN STR 399", "zip": "60486", "city": "FRANKFURT AM MAIN", "country": "GERMANY"},
    "CGNW04": {"street": "EUROPAALLEE 115", "zip": "50226", "city": "FRECHEN", "country": "GERMANY"},
    "ZTZE02": {"street": "ANTON-GUENTHER-STR. 1 B", "zip": "9599", "city": "FREIBERG / SACHSEN", "country": "GERMANY"},
    "QFBC01": {"street": "LOERRACHER STR. 10", "zip": "79115", "city": "FREIBURG", "country": "GERMANY"},
    "FRAN05": {"street": "KAISERSTR. 156", "zip": "61169", "city": "FRIEDBERG", "country": "GERMANY"},
    "FDHC02": {"street": "EUGENSTR. 47", "zip": "88045", "city": "FRIEDRICHSHAFEN", "country": "GERMANY"},
    "FUHC01": {"street": "HANS-VOGEL-STR. 134", "zip": "90765", "city": "FUERTH", "country": "GERMANY"},
    "GJHC01": {"street": "PETERSBERGER STR. 42", "zip": "36037", "city": "FULDA", "country": "GERMANY"},
    "HQTC01": {"street": "LEIBNIZSTR. 74", "zip": "7548", "city": "GERA", "country": "GERMANY"},
    "ZQYC01": {"street": "SCHIFFENBERGER WEG  120", "zip": "35394", "city": "GIESSEN", "country": "GERMANY"},
    "GOXC01": {"street": "ULMER STR. 42", "zip": "73037", "city": "GOEPPINGEN", "country": "GERMANY"},
    "ZEUC01": {"street": "GRONER LANDSTR. 27", "zip": "37081", "city": "GOETTINGEN", "country": "GERMANY"},
    "ZGWC01": {"street": "AN DEN BAECKERWIESEN 1", "zip": "17489", "city": "GREIFSWALD", "country": "GERMANY"},
    "GMJC01": {"street": "GUMMERSBACHER STR. 70", "zip": "51645", "city": "GUMMERSBACH", "country": "GERMANY"},
    "GKCC01": {"street": "ELBERFELDER STR. 90", "zip": "58095", "city": "HAGEN", "country": "GERMANY"},
    "HHNT01": {"street": "TERMINAL - CAR RENTAL CENTER", "zip": "55483", "city": "HAHN-FLUGHAFEN", "country": "GERMANY"},
    "ZHZC01": {"street": "GRENZSTR 17", "zip": "6112", "city": "HALLE SAALE", "country": "GERMANY"},
    "HAMC03": {"street": "BRAUHAUSSTR. 24-28", "zip": "22041", "city": "HAMBURG", "country": "GERMANY"},
    "HAML01": {"street": "HEIDI-KABEL-PLATZ 10", "zip": "20099", "city": "HAMBURG", "country": "GERMANY"},
    "HAMN25": {"street": "BORNKAMPSWEG 60", "zip": "22761", "city": "HAMBURG", "country": "GERMANY"},
    "HAMS01": {"street": "WINSENER STR. 210", "zip": "21077", "city": "HAMBURG", "country": "GERMANY"},
    "HAMS01-01-READY": {"street": "WINSENER STR. 210", "zip": "21077", "city": "HAMBURG", "country": "GERMANY"},
    "HAMS25": {"street": "SUEDERSTR. 185", "zip": "20537", "city": "HAMBURG", "country": "GERMANY"},
    "HAMT01": {"street": "FLUGHAFENSTR. 1", "zip": "22335", "city": "HAMBURG", "country": "GERMANY"},
    "HNUC03": {"street": "AUHEIMER STR. 2", "zip": "63450", "city": "HANAU", "country": "GERMANY"},
    "HAJC01": {"street": "HEUERSTR 5", "zip": "30519", "city": "HANNOVER", "country": "GERMANY"},
    "HAJL01": {"street": "ERNST-AUGUST-PLATZ 1", "zip": "30159", "city": "HANNOVER", "country": "GERMANY"},
    "HAJN01": {"street": "VAHRENWALDER STR. 197", "zip": "30165", "city": "HANNOVER", "country": "GERMANY"},
    "QBOS01": {"street": "BRUCHSTR. 37", "zip": "45525", "city": "HATTINGEN", "country": "GERMANY"},
    "HDBC01": {"street": "BERGHEIMER STR. 159", "zip": "69115", "city": "HEIDELBERG", "country": "GERMANY"},
    "QULW02": {"street": "SIEMENSSTR 70", "zip": "89520", "city": "HEIDENHEIM", "country": "GERMANY"},
    "HLEC01": {"street": "ALBERT-SCHAEFFLER-STR. 2", "zip": "74080", "city": "HEILBRONN", "country": "GERMANY"},
    "DUSW02": {"street": "INDUSTRIESTR. 54", "zip": "52525", "city": "HEINSBERG", "country": "GERMANY"},
    "QBON04": {"street": "CASTROPER STR 7", "zip": "44628", "city": "HERNE", "country": "GERMANY"},
    "ZNOC02": {"street": "PORSCHESTR 2", "zip": "31135", "city": "HILDESHEIM", "country": "GERMANY"},
    "ZQWN01": {"street": "BERLINER STR 130", "zip": "66424", "city": "HOMBURG", "country": "GERMANY"},
    "ZNQC01": {"street": "MUENCHENER STR 29", "zip": "85051", "city": "INGOLSTADT", "country": "GERMANY"},
    "ISEW02": {"street": "HAGENER STR. 162", "zip": "58642", "city": "ISERLOHN LETMATHE", "country": "GERMANY"},
    "EUMC04": {"street": "POTTHOFSTR. 1A", "zip": "25524", "city": "ITZEHOE", "country": "GERMANY"},
    "KLTC01": {"street": "PARISER STR. 200", "zip": "67663", "city": "KAISERSLAUTERN", "country": "GERMANY"},
    "FKBC01": {"street": "OTTOSTR. 18", "zip": "76227", "city": "KARLSRUHE", "country": "GERMANY"},
    "KSFC01": {"street": "LEIPZIGER STR. 65-71", "zip": "34123", "city": "KASSEL", "country": "GERMANY"},
    "QLHC01": {"street": "KLEINER KORNWEG 2-4", "zip": "65451", "city": "KELSTERBACH", "country": "GERMANY"},
    "FMMS01": {"street": "BLEICHERSTR 4", "zip": "87437", "city": "KEMPTEN", "country": "GERMANY"},
    "ZNTC02": {"street": "DIESELSTR. 17", "zip": "50170", "city": "KERPEN SINDORF", "country": "GERMANY"},
    "KELC01": {"street": "STORMARNSTR. 41", "zip": "24113", "city": "KIEL", "country": "GERMANY"},
    "ZQPW02": {"street": "TICHELSTR. 14", "zip": "47533", "city": "KLEVE", "country": "GERMANY"},
    "ZNVC01": {"street": "ANDERNACHER STR. 199", "zip": "56070", "city": "KOBLENZ", "country": "GERMANY"},
    "CGNE01": {"street": "WILLY-BRANDT-PLATZ 2", "zip": "50679", "city": "KOELN", "country": "GERMANY"},
    "CGNE04": {"street": "BERGISCH GLADBACHER STR. 696", "zip": "51067", "city": "KOELN", "country": "GERMANY"},
    "CGNL01": {"street": "TRANKGASSE 11", "zip": "50667", "city": "KOELN", "country": "GERMANY"},
    "CGNN01": {"street": "ROBERT-PERTHEL-STR. 28", "zip": "50739", "city": "KOELN", "country": "GERMANY"},
    "CGNS01": {"street": "KOBLENZER STR 1 9", "zip": "50968", "city": "KOELN", "country": "GERMANY"},
    "CGNW02": {"street": "WIDDERSDORFER STR. 209", "zip": "50825", "city": "KOELN", "country": "GERMANY"},
    "QKZC01": {"street": "REICHENAUSTR. 184", "zip": "78467", "city": "KONSTANZ", "country": "GERMANY"},
    "QKFC03": {"street": "UERDINGER STR. 72-74", "zip": "47799", "city": "KREFELD", "country": "GERMANY"},
    "KLTS04": {"street": "QUEICHHEIMER HAUPTSTR 249", "zip": "76829", "city": "LANDAU", "country": "GERMANY"},
    "QLGN01": {"street": "ALTDORFER STR 1", "zip": "84032", "city": "LANDSHUT", "country": "GERMANY"},
    "NWBW02": {"street": "AMPERESTR. 7-11", "zip": "63225", "city": "LANGEN", "country": "GERMANY"},
    "HAJT01": {"street": "FLUGHAFENSTR. 4", "zip": "30855", "city": "LANGENHAGEN", "country": "GERMANY"},
    "LEYC01": {"street": "ZOOSTR 1", "zip": "26789", "city": "LEER", "country": "GERMANY"},
    "LEJC01": {"street": "LUETZNER STR. 179", "zip": "4179", "city": "LEIPZIG", "country": "GERMANY"},
    "LEJC02": {"street": "SACHSENSEITE 3", "zip": "4103", "city": "LEIPZIG", "country": "GERMANY"},
    "LVEC02": {"street": "CARL-DUISBERG-STR. 101", "zip": "51373", "city": "LEVERKUSEN WIESDORF", "country": "GERMANY"},
    "QFBS02": {"street": "WIESENTALSTR. 24", "zip": "79540", "city": "LOERRACH", "country": "GERMANY"},
    "LLBC01": {"street": "HEILBRONNER STR. 20", "zip": "71634", "city": "LUDWIGSBURG", "country": "GERMANY"},
    "LWFC01": {"street": "ROHRLACHSTR. 110", "zip": "67059", "city": "LUDWIGSHAFEN", "country": "GERMANY"},
    "LBCC01": {"street": "FACKENBURGER ALLEE 32 A - 38", "zip": "23554", "city": "LUEBECK", "country": "GERMANY"},
    "ZOCC01": {"street": "LENNESTR 92", "zip": "58507", "city": "LUEDENSCHEID", "country": "GERMANY"},
    "ZOHC01": {"street": "DORTMUNDER STR. 39", "zip": "44536", "city": "LUENEN", "country": "GERMANY"},
    "MQGC01": {"street": "LUEBECKER STR. 85", "zip": "39124", "city": "MAGDEBURG", "country": "GERMANY"},
    "QMZC01": {"street": "RHEINALLEE 104", "zip": "55120", "city": "MAINZ", "country": "GERMANY"},
    "MHGC01": {"street": "ROLLBUEHLSTR. 91-93", "zip": "68309", "city": "MANNHEIM", "country": "GERMANY"},
    "MHGC02": {"street": "NECKARAUER STR. 50-52", "zip": "68199", "city": "MANNHEIM", "country": "GERMANY"},
    "ZOIC01": {"street": "AFFOELLERSTR. 82", "zip": "35039", "city": "MARBURG", "country": "GERMANY"},
    "FMMT01": {"street": "AM FLUGHAFEN 42", "zip": "87766", "city": "MEMMINGERBERG", "country": "GERMANY"},
    "ZOMC03": {"street": "POTSDAMER STR 7", "zip": "32423", "city": "MINDEN", "country": "GERMANY"},
    "DUSW03": {"street": "KORSCHENBROICHER STR. 55", "zip": "41065", "city": "MOENCHENGLADBACH", "country": "GERMANY"},
    "ZOON01": {"street": "DICKSWALL 60", "zip": "45468", "city": "MUELHEIM AN DER RUHR", "country": "GERMANY"},
    "MUCC01": {"street": "MARSSTR. 24", "zip": "80335", "city": "MUENCHEN", "country": "GERMANY"},
    "MUCE02": {"street": "BAJUWARENSTR. 118", "zip": "81825", "city": "MUENCHEN", "country": "GERMANY"},
    "MUCN01": {"street": "INGOLSTAEDTER STR. 43", "zip": "80807", "city": "MUENCHEN", "country": "GERMANY"},
    "MUCN25": {"street": "INGOLSTAEDTER STR. 172-180", "zip": "80939", "city": "MUENCHEN", "country": "GERMANY"},
    "MUCS01": {"street": "CHIEMGAUSTR. 161", "zip": "81549", "city": "MUENCHEN", "country": "GERMANY"},
    "OBFS01": {"street": "BOSCHETSRIEDER STR. 46", "zip": "81379", "city": "MUENCHEN", "country": "GERMANY"},
    "OBFW01": {"street": "LORTZINGSTR 22", "zip": "81241", "city": "MUENCHEN", "country": "GERMANY"},
    "MUCT01": {"street": "TERMINALSTR. MITTE", "zip": "85356", "city": "MUENCHEN FLUGHAFEN", "country": "GERMANY"},
    "MSRC01": {"street": "MUENSTERMANNWEG 14", "zip": "48153", "city": "MUENSTER", "country": "GERMANY"},
    "NEBC01": {"street": "AM GUETERBAHNHOF 5", "zip": "17033", "city": "NEUBRANDENBURG", "country": "GERMANY"},
    "EUMC03": {"street": "KIELER STR. 203", "zip": "24536", "city": "NEUMUENSTER", "country": "GERMANY"},
    "DUSW07": {"street": "FURTHER STR. 3", "zip": "41462", "city": "NEUSS", "country": "GERMANY"},
    "ZOVC02": {"street": "SEGEBERGER CHAUSSEE 3", "zip": "22850", "city": "NORDERSTEDT", "country": "GERMANY"},
    "NUES01": {"street": "FRANKENSTR. 100", "zip": "90461", "city": "NUERNBERG", "country": "GERMANY"},
    "NUET01": {"street": "FLUGHAFENSTR. 100", "zip": "90411", "city": "NUERNBERG", "country": "GERMANY"},
    "NUEW01": {"street": "EDISONSTR 23", "zip": "90431", "city": "NUERNBERG", "country": "GERMANY"},
    "OBRC01": {"street": "BUSCHHAUSENER STR. 185", "zip": "46149", "city": "OBERHAUSEN", "country": "GERMANY"},
    "OFEC01": {"street": "SPRENDLINGER LANDSTR. 173 a", "zip": "63069", "city": "OFFENBACH", "country": "GERMANY"},
    "LHAN01": {"street": "OKENSTR 76A", "zip": "77652", "city": "OFFENBURG", "country": "GERMANY"},
    "OENC01": {"street": "MOSLESTR. 74", "zip": "26122", "city": "OLDENBURG / OLDENBURG", "country": "GERMANY"},
    "FMOE01": {"street": "MINDENER STR 234", "zip": "49084", "city": "OSNABRUECK", "country": "GERMANY"},
    "PADC02": {"street": "ELSENER STR. 50-52", "zip": "33102", "city": "PADERBORN", "country": "GERMANY"},
    "UPFC01": {"street": "MANNHEIMER STR. 19", "zip": "75179", "city": "PFORZHEIM", "country": "GERMANY"},
    "XXPC02": {"street": "LANGE BRUECKE 6", "zip": "14467", "city": "POTSDAM", "country": "GERMANY"},
    "RMSC01": {"street": "KINDSBACHER STR. 47", "zip": "66877", "city": "RAMSTEIN", "country": "GERMANY"},
    "ZRWC02": {"street": "IM WOEHR 3", "zip": "76437", "city": "RASTATT", "country": "GERMANY"},
    "RTJC01": {"street": "SANDSTR. 65", "zip": "40878", "city": "RATINGEN", "country": "GERMANY"},
    "QBON03": {"street": "DIESELSTR 9", "zip": "45661", "city": "RECKLINGHAUSEN", "country": "GERMANY"},
    "ZPMC01": {"street": "BAJUWARENSTR. 2", "zip": "93053", "city": "REGENSBURG", "country": "GERMANY"},
    "ZPNC02": {"street": "FREIHEITSTR. 14-18", "zip": "42853", "city": "REMSCHEID", "country": "GERMANY"},
    "RULC01": {"street": "STUTTGARTER STR. 8", "zip": "72766", "city": "REUTLINGEN", "country": "GERMANY"},
    "BCOC01": {"street": "DAENNENDIEK 21", "zip": "46414", "city": "RHEDE", "country": "GERMANY"},
    "FKBT01": {"street": "HALIFAX AVENUE 420B", "zip": "77836", "city": "RHEINMUENSTER", "country": "GERMANY"},
    "RSQC01": {"street": "KLEPPERSTR. 20", "zip": "83026", "city": "ROSENHEIM", "country": "GERMANY"},
    "RSOC01": {"street": "WARNOWUFER 32", "zip": "18057", "city": "ROSTOCK", "country": "GERMANY"},
    "ZPSC01": {"street": "STAHLSTR. 18", "zip": "65428", "city": "RUESSELSHEIM", "country": "GERMANY"},
    "SCNC01": {"street": "MAINZER STR. 152-154", "zip": "66121", "city": "SAARBRUECKEN", "country": "GERMANY"},
    "ZPYC02": {"street": "EINSTEINSTR 10", "zip": "53757", "city": "SANKT AUGUSTIN", "country": "GERMANY"},
    "LEJT01": {"street": "TERMINALRING 13", "zip": "4435", "city": "SCHKEUDITZ", "country": "GERMANY"},
    "SZWC02": {"street": "GREVESMUEHLENER STR 18 F", "zip": "19057", "city": "SCHWERIN LANKOW", "country": "GERMANY"},
    "SGEC01": {"street": "SANDSTR. 147", "zip": "57072", "city": "SIEGEN", "country": "GERMANY"},
    "QKZN03": {"street": "IN DEN BURGWIESEN 20", "zip": "72488", "city": "SIGMARINGEN", "country": "GERMANY"},
    "STRS03": {"street": "BOEBLINGER STR 134", "zip": "71065", "city": "SINDELFINGEN", "country": "GERMANY"},
    "SGYC01": {"street": "GUETERSTR 31", "zip": "78224", "city": "SINGEN", "country": "GERMANY"},
    "UWPS02": {"street": "SCHLAGBAUMER STR. 14-16", "zip": "42653", "city": "SOLINGEN", "country": "GERMANY"},
    "ZQEC01": {"street": "ESCHWEILERSTR. 133", "zip": "52222", "city": "STOLBERG", "country": "GERMANY"},
    "STRC03": {"street": "KRONENSTR. 17", "zip": "70173", "city": "STUTTGART", "country": "GERMANY"},
    "STRL01": {"street": "AM HAUPTBAHNHOF 2", "zip": "70173", "city": "STUTTGART", "country": "GERMANY"},
    "STRN01": {"street": "LUDWIGSBURGER STR. 13", "zip": "70435", "city": "STUTTGART", "country": "GERMANY"},
    "STRT01": {"street": "FLUGHAFENSTR.", "zip": "70629", "city": "STUTTGART", "country": "GERMANY"},
    "STRW01": {"street": "HAUPTSTR. 189 B", "zip": "70563", "city": "STUTTGART", "country": "GERMANY"},
    "SPMS01": {"street": "SCHOENBORNSTR. 18A", "zip": "54295", "city": "TRIER", "country": "GERMANY"},
    "TFGC01": {"street": "ROSENTALSTR. 8-12", "zip": "72070", "city": "TUEBINGEN", "country": "GERMANY"},
    "QULC01": {"street": "JAEGERSTR 35", "zip": "89081", "city": "ULM", "country": "GERMANY"},
    "ZQLC01": {"street": "UTZENBUEHL 19", "zip": "78052", "city": "VILLINGEN-SCHWENNINGEN", "country": "GERMANY"},
    "STRE02": {"street": "DEVIZESSTR. 18", "zip": "71332", "city": "WAIBLINGEN", "country": "GERMANY"},
    "ZORN01": {"street": "DR.-SEELING-STR. 23", "zip": "92637", "city": "WEIDEN", "country": "GERMANY"},
    "UWEC01": {"street": "MAINZER STR. 96", "zip": "65189", "city": "WIESBADEN", "country": "GERMANY"},
    "ZQUC01": {"street": "DIESELSTR. 19", "zip": "38446", "city": "WOLFSBURG", "country": "GERMANY"},
    "WUEC01": {"street": "GATTINGERSTR. 5", "zip": "97076", "city": "WUERZBURG", "country": "GERMANY"},
    "UWPC04": {"street": "CLAUSENSTR 32", "zip": "42285", "city": "WUPPERTAL", "country": "GERMANY"},
    "UWPC05": {"street": "CLAUSENSTR 32", "zip": "42285", "city": "WUPPERTAL", "country": "GERMANY"},
    "TXSC01": {"street": "BAENSCHSTR. 4-7", "zip": "6712", "city": "ZEITZ", "country": "GERMANY"},
    "ZWIC01": {"street": "OSKAR-ARNOLD-STR. 10", "zip": "8056", "city": "ZWICKAU", "country": "GERMANY"},
    "ZQPC02": {"street": "CLARENBACHSTR. 7", "zip": "46485", "city": "WESEL", "country": "GERMANY"},
    "ZPFC03": {"street": "HAITZINGER STR. 22A", "zip": "94032", "city": "PASSAU", "country": "GERMANY"},
    "QULE01": {"street": "LORCHER STR. 141", "zip": "73529", "city": "SCHWAEBISCH-GMUEND", "country": "GERMANY"},
}

async def update_devices_with_location_data():
    """Aktualisiert Geräte mit Standortinformationen"""
    
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL nicht gefunden!")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    try:
        # Hole alle Geräte
        devices = await db.europcar_devices.find({}).to_list(length=None)
        
        print(f"📊 Zu aktualisierende Geräte: {len(devices)}")
        
        updated_count = 0
        not_found_count = 0
        not_found_locations = set()
        
        for device in devices:
            device_id = device['device_id']
            locationcode = device['locationcode']
            
            # Suche Standortdaten
            location_info = LOCATION_DATA.get(locationcode)
            
            if location_info:
                # Update-Daten vorbereiten
                update_data = {
                    "street": location_info['street'],
                    "zip": location_info['zip'],
                    "country": location_info['country'],
                    # Stadt aus Standortdaten übernehmen (präziser als device.city)
                    "city": location_info['city'],
                    # Neue Felder hinzufügen
                    "tvid": "",  # Wird später befüllt
                    "ip": "",    # Wird später befüllt
                    "sw_version": "",  # Wird später befüllt
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Update durchführen
                result = await db.europcar_devices.update_one(
                    {"device_id": device_id},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    updated_count += 1
                    if updated_count <= 5:
                        print(f"  ✅ {device_id}: {location_info['street']}, {location_info['zip']} {location_info['city']}")
            else:
                not_found_count += 1
                not_found_locations.add(locationcode)
        
        print(f"\n✅ Erfolgreich aktualisiert: {updated_count} Geräte")
        print(f"⚠️  Keine Standortdaten gefunden für: {not_found_count} Geräte")
        
        if not_found_locations:
            print(f"\nFehlende Locationcodes:")
            for loc in sorted(not_found_locations)[:10]:
                print(f"  - {loc}")
        
        # Überprüfung: Zeige ein aktualisiertes Gerät
        sample = await db.europcar_devices.find_one({"street": {"$exists": True}})
        if sample:
            print(f"\n📝 Beispiel eines aktualisierten Geräts:")
            print(f"  Device-ID: {sample.get('device_id')}")
            print(f"  Location: {sample.get('locationcode')}")
            print(f"  Straße: {sample.get('street')}")
            print(f"  PLZ: {sample.get('zip')}")
            print(f"  Stadt: {sample.get('city')}")
            print(f"  Land: {sample.get('country')}")
        
    except Exception as e:
        print(f"❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    print("🔄 Starte Geräte-Update mit Standortdaten...")
    asyncio.run(update_devices_with_location_data())
    print("✅ Update abgeschlossen!")
