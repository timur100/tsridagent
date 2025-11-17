"""
Script zum Hinzufügen neuer Europcar Geräte
Überprüft vorhandene Geräte und fügt nur neue hinzu
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime, timezone

# Neue Geräte aus der Liste
NEW_DEVICES = [
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
    {"device_id": "QULC01-01", "locationcode": "QULC01", "city": "ULM", "sn_pc": "012656680153", "sn_sc": "201840 00023"},
    {"device_id": "RMSC01-01", "locationcode": "RMSC01", "city": "RAMSTEIN", "sn_pc": "088354772553", "sn_sc": "201728 00612"},
    {"device_id": "RSOC01-01", "locationcode": "RSOC01", "city": "ROSTOCK", "sn_pc": "038258281553", "sn_sc": "201820 00666"},
    {"device_id": "RSQC01-01", "locationcode": "RSQC01", "city": "ROSENHEIM", "sn_pc": "025553180153", "sn_sc": "201728 00601"},
    {"device_id": "RULC01-01", "locationcode": "RULC01", "city": "REUTLINGEN", "sn_pc": "047590371453", "sn_sc": "201743 00730"},
    {"device_id": "SCNC01-01", "locationcode": "SCNC01", "city": "SAARBRUECKEN", "sn_pc": "017982171353", "sn_sc": "201737 01588"},
    {"device_id": "SGEC01-01", "locationcode": "SGEC01", "city": "SIEGEN", "sn_pc": "057035105053", "sn_sc": "201737 01575"},
    {"device_id": "SPMS01-01", "locationcode": "SPMS01", "city": "TRIER", "sn_pc": "042055571253", "sn_sc": "201743 00726"},
    {"device_id": "STRC03-01", "locationcode": "STRC03", "city": "STUTTGART", "sn_pc": "000940170153", "sn_sc": "201840 00018"},
    {"device_id": "STRT01-01", "locationcode": "STRT01", "city": "STUTTGART", "sn_pc": "047906271453", "sn_sc": "201743 00743"},
    {"device_id": "SZWC02-01", "locationcode": "SZWC02", "city": "SCHWERIN LANKOW", "sn_pc": "047787271453", "sn_sc": "201820 00654"},
    {"device_id": "TXSC01-01", "locationcode": "TXSC01", "city": "ZEITZ", "sn_pc": "038338381553", "sn_sc": "201840 00040"},
    {"device_id": "UPFC01-01", "locationcode": "UPFC01", "city": "PFORZHEIM", "sn_pc": "012835280153", "sn_sc": "201728 00599"},
    {"device_id": "UWPC04-01", "locationcode": "UWPC04", "city": "WUPPERTAL", "sn_pc": "000728470153", "sn_sc": "201734 00765"},
    {"device_id": "UWPS02-01", "locationcode": "UWPS02", "city": "SOLINGEN", "sn_pc": "019973680153", "sn_sc": "201743 00714"},
    {"device_id": "XXPC02-01", "locationcode": "XXPC02", "city": "POTSDAM", "sn_pc": "001019370153", "sn_sc": "201734 00733"},
    {"device_id": "ZCBC01-01", "locationcode": "ZCBC01", "city": "ASCHAFFENBURG", "sn_pc": "038081181553", "sn_sc": "201840 00019"},
    {"device_id": "ZOIC01-01", "locationcode": "ZOIC01", "city": "MARBURG", "sn_pc": "038199581553", "sn_sc": "201728 00608"},
    {"device_id": "ZOMC03-01", "locationcode": "ZOMC03", "city": "MINDEN", "sn_pc": "047717271453", "sn_sc": "201734 00750"},
    {"device_id": "ZOON01-01", "locationcode": "ZOON01", "city": "MUELHEIM AN DER RUHR", "sn_pc": "016349571253", "sn_sc": "201734 00769"},
    {"device_id": "ZORN01-01", "locationcode": "ZORN01", "city": "WEIDEN", "sn_pc": "038044281553", "sn_sc": "201823 00014"},
    {"device_id": "ZOVC02-01", "locationcode": "ZOVC02", "city": "NORDERSTEDT", "sn_pc": "047732571453", "sn_sc": "201734 00739"},
    {"device_id": "ZCKC02-01", "locationcode": "ZCKC02", "city": "BRUEHL", "sn_pc": "012762380153", "sn_sc": "201823 00002"},
    {"device_id": "ZGWC01-01", "locationcode": "ZGWC01", "city": "GREIFSWALD", "sn_pc": "012781280153", "sn_sc": "201820 00659"},
    {"device_id": "ZOCC01-01", "locationcode": "ZOCC01", "city": "LUEDENSCHEID", "sn_pc": "037898781553", "sn_sc": "201737 01609"},
    {"device_id": "BERT01-01", "locationcode": "BERT01", "city": "BERLIN", "sn_pc": "059603570253", "sn_sc": "201743 00741"},
    {"device_id": "BFEC01-01", "locationcode": "BFEC01", "city": "BIELEFELD", "sn_pc": "047781171453", "sn_sc": "201734 00753"},
    {"device_id": "CGNE01-01", "locationcode": "CGNE01", "city": "KOELN", "sn_pc": "055204555253", "sn_sc": "201728 00616"},
    {"device_id": "CGNL01-01", "locationcode": "CGNL01", "city": "KOELN", "sn_pc": "047816271453", "sn_sc": "201737 01559"},
    {"device_id": "CGNN01-01", "locationcode": "CGNN01", "city": "KOELN", "sn_pc": "000768770153", "sn_sc": "201737 01561"},
    {"device_id": "CGNS01-01", "locationcode": "CGNS01", "city": "KOELN", "sn_pc": "047967271453", "sn_sc": "201737 01563"},
    {"device_id": "CGNW02-01", "locationcode": "CGNW02", "city": "KOELN", "sn_pc": "047534571453", "sn_sc": "201737 01562"},
    {"device_id": "DASC01-01", "locationcode": "DASC01", "city": "DARMSTADT NORTH", "sn_pc": "047533671453", "sn_sc": "201737 01583"},
    {"device_id": "DRSC02-01", "locationcode": "DRSC02", "city": "DRESDEN", "sn_pc": "046586663953", "sn_sc": "201734 00718"},
    {"device_id": "DRSN25-01", "locationcode": "DRSN25", "city": "DRESDEN", "sn_pc": "047876371453", "sn_sc": "201737 01564"},
    {"device_id": "DTMN01-01", "locationcode": "DTMN01", "city": "DORTMUND", "sn_pc": "037184572753", "sn_sc": "201743 00713"},
    {"device_id": "DTMN25-01", "locationcode": "DTMN25", "city": "DORTMUND", "sn_pc": "021061471353", "sn_sc": "201837 00395"},
    {"device_id": "DUIC02-01", "locationcode": "DUIC02", "city": "DUISBURG", "sn_pc": "020129780153", "sn_sc": "201823 00015"},
    {"device_id": "TFGC01-01", "locationcode": "TFGC01", "city": "TUEBINGEN", "sn_pc": "047824371453", "sn_sc": "201734 00723"},
    {"device_id": "LEJC02-01", "locationcode": "LEJC02", "city": "LEIPZIG", "sn_pc": "047570571453", "sn_sc": "201734 00721"},
    {"device_id": "MHGC01-01", "locationcode": "MHGC01", "city": "MANNHEIM", "sn_pc": "089137772553", "sn_sc": "201734 00720"},
    {"device_id": "MHGC02-01", "locationcode": "MHGC02", "city": "MANNHEIM", "sn_pc": "047974471453", "sn_sc": "201743 00736"},
    {"device_id": "LHAN01-01", "locationcode": "LHAN01", "city": "OFFENBURG", "sn_pc": "015076280153", "sn_sc": "201820 00655"},
    {"device_id": "LLBC01-01", "locationcode": "LLBC01", "city": "LUDWIGSBURG", "sn_pc": "038178181553", "sn_sc": "201743 00686"},
    {"device_id": "DUSC01-01", "locationcode": "DUSC01", "city": "DUESSELDORF", "sn_pc": "047921571453", "sn_sc": "201734 00762"},
    {"device_id": "DUSN01-01", "locationcode": "DUSN01", "city": "DUESSELDORF", "sn_pc": "047977171453", "sn_sc": "201734 00763"},
    {"device_id": "DUSW02-01", "locationcode": "DUSW02", "city": "HEINSBERG", "sn_pc": "012958380153", "sn_sc": "201823 00005"},
    {"device_id": "DUSW03-01", "locationcode": "DUSW03", "city": "MOENCHENGLADBACH", "sn_pc": "056000381453", "sn_sc": "201743 00739"},
    {"device_id": "DUSW04-01", "locationcode": "DUSW04", "city": "ERKELENZ", "sn_pc": "037919681553", "sn_sc": "201728 00617"},
    {"device_id": "EBXC02-01", "locationcode": "EBXC02", "city": "EBERSWALDE", "sn_pc": "025853580153", "sn_sc": "201728 00619"},
    {"device_id": "EMEC03-01", "locationcode": "EMEC03", "city": "EMDEN", "sn_pc": "038230581553", "sn_sc": "201734 00746"},
    {"device_id": "ERFC01-01", "locationcode": "ERFC01", "city": "ERFURT", "sn_pc": "047975371453", "sn_sc": "201743 00725"},
    {"device_id": "ERLC01-01", "locationcode": "ERLC01", "city": "ERLANGEN", "sn_pc": "047982571453", "sn_sc": "201743 00718"},
    {"device_id": "ESSS01-01", "locationcode": "ESSS01", "city": "ESSEN", "sn_pc": "025734780153", "sn_sc": "201823 00018"},
    {"device_id": "FDHC02-01", "locationcode": "FDHC02", "city": "FRIEDRICHSHAFEN", "sn_pc": "027474454653", "sn_sc": "201737 01611"},
    {"device_id": "FKBC01-01", "locationcode": "FKBC01", "city": "KARLSRUHE", "sn_pc": "047431271453", "sn_sc": "201743 00738"},
    {"device_id": "FMMT01-01", "locationcode": "FMMT01", "city": "MEMMINGERBERG", "sn_pc": "047890771453", "sn_sc": "201823 00031"},
    {"device_id": "FMOE01-01", "locationcode": "FMOE01", "city": "OSNABRUECK", "sn_pc": "047809771453", "sn_sc": "201737 01557"},
    {"device_id": "FRAL01-01", "locationcode": "FRAL01", "city": "FRANKFURT AM MAIN", "sn_pc": "000650370153", "sn_sc": "201737 01578"},
    {"device_id": "FRAN05-01", "locationcode": "FRAN05", "city": "FRIEDBERG", "sn_pc": "037988781553", "sn_sc": "201737 01597"},
    {"device_id": "FRAT01-02", "locationcode": "FRAT01", "city": "FRANKFURT AM MAIN", "sn_pc": "047514771453", "sn_sc": "201743 00720"},
    {"device_id": "FRAW01-01", "locationcode": "FRAW01", "city": "FRANKFURT AM MAIN", "sn_pc": "047813571453", "sn_sc": "201737 01579"},
    {"device_id": "FUHC01-01", "locationcode": "FUHC01", "city": "FUERTH", "sn_pc": "014867280153", "sn_sc": "201840 00012"},
    {"device_id": "GEZC01-01", "locationcode": "GEZC01", "city": "BOCHUM", "sn_pc": "047733471453", "sn_sc": "201734 00768"},
    {"device_id": "GFHN01-01", "locationcode": "GFHN01", "city": "BONN", "sn_pc": "047726271453", "sn_sc": "201737 01568"},
    {"device_id": "GKCC01-01", "locationcode": "GKCC01", "city": "HAGEN", "sn_pc": "037972781553", "sn_sc": "201820 00653"},
    {"device_id": "GMJC01-01", "locationcode": "GMJC01", "city": "GUMMERSBACH", "sn_pc": "047919571453", "sn_sc": "201837 00391"},
    {"device_id": "GOXC01-01", "locationcode": "GOXC01", "city": "GOEPPINGEN", "sn_pc": "059740370253", "sn_sc": "201734 00756"},
    {"device_id": "ISEW02-01", "locationcode": "ISEW02", "city": "ISERLOHN LETMATHE", "sn_pc": "039480472653", "sn_sc": "201737 01587"},
    {"device_id": "LEJC01-01", "locationcode": "LEJC01", "city": "LEIPZIG", "sn_pc": "040045182253", "sn_sc": "201734 00722"},
    {"device_id": "HNUC03-01", "locationcode": "HNUC03", "city": "HANAU", "sn_pc": "039688172653", "sn_sc": "201737 01581"},
    {"device_id": "HHNT01-01", "locationcode": "HHNT01", "city": "HAHN-FLUGHAFEN", "sn_pc": "047439171453", "sn_sc": "201743 00729"},
    {"device_id": "HAMC03-01", "locationcode": "HAMC03", "city": "HAMBURG", "sn_pc": "012823580153", "sn_sc": "201737 01593"},
    {"device_id": "HAML01-01", "locationcode": "HAML01", "city": "HAMBURG", "sn_pc": "016064464053", "sn_sc": "201737 01574"},
    {"device_id": "HAMS01-01", "locationcode": "HAMS01-01-READY", "city": "HAMBURG", "sn_pc": "016917480153", "sn_sc": "201743 00707"},
    {"device_id": "HAMT01-02", "locationcode": "HAMT01", "city": "HAMBURG", "sn_pc": "000947170153", "sn_sc": "201743 00733"},
    {"device_id": "BREN25-01", "locationcode": "BREN25", "city": "BREMEN", "sn_pc": "047944771453", "sn_sc": "201820 00656"},
    {"device_id": "BXPC01-01", "locationcode": "BXPC01", "city": "BOTTROP", "sn_pc": "025686180153", "sn_sc": "201823 00020"},
    {"device_id": "BYUC01-01", "locationcode": "BYUC01", "city": "BAYREUTH", "sn_pc": "045413465253", "sn_sc": "201823 00007"},
    {"device_id": "CGNE04-01", "locationcode": "CGNE04", "city": "KOELN", "sn_pc": "038129581553", "sn_sc": "201837 00388"},
    {"device_id": "HAJT01-01", "locationcode": "HAJT01", "city": "LANGENHAGEN", "sn_pc": "047480571453", "sn_sc": "201840 00031"},
    {"device_id": "HLEC01-01", "locationcode": "HLEC01", "city": "HEIDELBERG", "sn_pc": "014792580153", "sn_sc": "201737 01612"},
    {"device_id": "HQTC01-01", "locationcode": "HQTC01", "city": "GERA", "sn_pc": "027875675253", "sn_sc": "201734 00725"},
    {"device_id": "NEBC01-01", "locationcode": "NEBC01", "city": "NEUBRANDENBURG", "sn_pc": "025964280153", "sn_sc": "201734 00734"},
    {"device_id": "STRW01-01", "locationcode": "STRW01", "city": "STUTTGART", "sn_pc": "047980771453", "sn_sc": "201737 01589"},
    {"device_id": "ZHZC01-01", "locationcode": "ZHZC01", "city": "HALLE SAALE", "sn_pc": "028017375253", "sn_sc": "201734 00737"},
    {"device_id": "ZNVC01-01", "locationcode": "ZNVC01", "city": "KOBLENZ", "sn_pc": "047907171453", "sn_sc": "201737 01573"},
    {"device_id": "HAMT01-01", "locationcode": "HAMT01", "city": "HAMBURG", "sn_pc": "089966472553", "sn_sc": "201820 00667"},
    {"device_id": "QFBC01-01", "locationcode": "QFBC01", "city": "FREIBURG", "sn_pc": "046429381453", "sn_sc": "201840 00009"},
    {"device_id": "QULW02-01", "locationcode": "QULW02", "city": "HEIDENHEIM", "sn_pc": "041151271253", "sn_sc": "201738 00988"},
    {"device_id": "DTMC01-01", "locationcode": "DTMC01", "city": "DORTMUND", "sn_pc": "000712470153", "sn_sc": "201738 00989"},
    {"device_id": "DTMT01-01", "locationcode": "DTMT01", "city": "DORTMUND", "sn_pc": "037920781553", "sn_sc": "201823 00003"},
    {"device_id": "GFHS01-01", "locationcode": "GFHS01", "city": "BONN", "sn_pc": "002669580153", "sn_sc": "201823 00025"},
    {"device_id": "HAJN01-01", "locationcode": "HAJN01", "city": "HANNOVER", "sn_pc": "000640470153", "sn_sc": "201737 01606"},
    {"device_id": "KSFC01-01", "locationcode": "KSFC01", "city": "KASSEL", "sn_pc": "047449771453", "sn_sc": "201734 00754"},
    {"device_id": "HAJC01-01", "locationcode": "HAJC01", "city": "HANNOVER", "sn_pc": "087763472453", "sn_sc": "201734 00758"},
    {"device_id": "LVEC02-01", "locationcode": "LVEC02", "city": "LEVERKUSEN WIESDORF", "sn_pc": "053898271353", "sn_sc": "201737 01565"},
    {"device_id": "NWBW02-01", "locationcode": "NWBW02", "city": "LANGEN", "sn_pc": "037884581553", "sn_sc": "201840 00013"},
    {"device_id": "OBFS01-01", "locationcode": "OBFS01", "city": "MUENCHEN", "sn_pc": "015545180153", "sn_sc": "201823 00001"},
    {"device_id": "OBRC01-01", "locationcode": "OBRC01", "city": "OBERHAUSEN", "sn_pc": "047909671453", "sn_sc": "201728 00605"},
    {"device_id": "ZEDC02-01", "locationcode": "ZEDC02", "city": "EUSKIRCHEN", "sn_pc": "038317681553", "sn_sc": "201840 00038"},
    {"device_id": "ZNQC01-01", "locationcode": "ZNQC01", "city": "INGOLSTADT", "sn_pc": "047910771453", "sn_sc": "201728 00600"},
    {"device_id": "ZPNC02-01", "locationcode": "ZPNC02", "city": "REMSCHEID", "sn_pc": "020270380153", "sn_sc": "201743 00691"},
    {"device_id": "ZQYC01-01", "locationcode": "ZQYC01", "city": "GIESSEN", "sn_pc": "047691171453", "sn_sc": "201734 00755"},
    {"device_id": "ZRWC02-01", "locationcode": "ZRWC02", "city": "RASTATT", "sn_pc": "038257381553", "sn_sc": "201734 00719"},
    {"device_id": "ESSC01-01", "locationcode": "ESSC01", "city": "ESSEN", "sn_pc": "001535774353", "sn_sc": "201737 01599"},
    {"device_id": "BRET01-01", "locationcode": "BRET01", "city": "BREMEN", "sn_pc": "047424771453", "sn_sc": "201743 00719"},
    {"device_id": "CHWC01-01", "locationcode": "CHWC01", "city": "CHEMNITZ", "sn_pc": "000797570153", "sn_sc": "201734 00727"},
    {"device_id": "DRST01-01", "locationcode": "DRST01", "city": "DRESDEN", "sn_pc": "000678770153", "sn_sc": "201820 00657"},
    {"device_id": "FKBT01-01", "locationcode": "FKBT01", "city": "RHEINMUENSTER", "sn_pc": "047433771453", "sn_sc": "201743 00690"},
    {"device_id": "KLTS04-01", "locationcode": "KLTS04", "city": "LANDAU", "sn_pc": "001056270153", "sn_sc": "201728 00604"},
    {"device_id": "HDBC01-01", "locationcode": "HDBC01", "city": "HEIDELBERG", "sn_pc": "058879563953", "sn_sc": "201840 00035"},
    {"device_id": "LWFC01-01", "locationcode": "LWFC01", "city": "LUDWIGSHAFEN", "sn_pc": "039403272653", "sn_sc": "201737 01580"},
    {"device_id": "MSRC01-01", "locationcode": "MSRC01", "city": "MUENSTER", "sn_pc": "047801171453", "sn_sc": "201737 01556"},
    {"device_id": "QEIC01-01", "locationcode": "QEIC01", "city": "CRAILSHEIM", "sn_pc": "000607170153", "sn_sc": "201728 00614"},
    {"device_id": "RTJC01-01", "locationcode": "RTJC01", "city": "RATINGEN", "sn_pc": "047978771453", "sn_sc": "201743 00689"},
    {"device_id": "STRL01-01", "locationcode": "STRL01", "city": "STUTTGART", "sn_pc": "000590770153", "sn_sc": "201743 00721"},
    {"device_id": "STRS03-01", "locationcode": "STRS03", "city": "SINDELFINGEN", "sn_pc": "047922471453", "sn_sc": "201743 00740"},
    {"device_id": "ZNTC02-01", "locationcode": "ZNTC02", "city": "KERPEN SINDORF", "sn_pc": "063327765053", "sn_sc": "201823 00032"},
    {"device_id": "ZOHC01-01", "locationcode": "ZOHC01", "city": "LUENEN", "sn_pc": "046796363953", "sn_sc": "201823 00009"},
    {"device_id": "HAMN25-01", "locationcode": "HAMN25", "city": "HAMBURG", "sn_pc": "034665461053", "sn_sc": "201728 00598"},
    {"device_id": "KELC01-01", "locationcode": "KELC01", "city": "KIEL", "sn_pc": "050165454853", "sn_sc": "201737 01608"},
    {"device_id": "ZQEC01-01", "locationcode": "ZQEC01", "city": "STOLBERG", "sn_pc": "038322381553", "sn_sc": "201737 01558"},
    {"device_id": "ZWIC01-01", "locationcode": "ZWIC01", "city": "ZWICKAU", "sn_pc": "047803671453", "sn_sc": "201734 00726"},
    {"device_id": "HAMT01-03", "locationcode": "HAMT01", "city": "HAMBURG", "sn_pc": "038008281553", "sn_sc": "201737 01560"},
    {"device_id": "MUCT01-02", "locationcode": "MUCT01", "city": "MUENCHEN FLUGHAFEN", "sn_pc": "047517471453", "sn_sc": "201840 00025"},
    {"device_id": "CGNW04-01", "locationcode": "CGNW04", "city": "FRECHEN", "sn_pc": "000740370153", "sn_sc": "201823 00028"},
    {"device_id": "BREC01-01", "locationcode": "BREC01", "city": "BREMEN", "sn_pc": "062808470253", "sn_sc": "201840 00049"},
    {"device_id": "FLFC01-01", "locationcode": "FLFC01", "city": "FLENSBURG", "sn_pc": "041840471253", "sn_sc": "201738 00990"},
    {"device_id": "HAJL01-01", "locationcode": "HAJL01", "city": "HANNOVER", "sn_pc": "047935771453", "sn_sc": "201734 00747"},
    {"device_id": "LBCC01-01", "locationcode": "LBCC01", "city": "LUEBECK", "sn_pc": "047964571453", "sn_sc": "201734 00757"},
    {"device_id": "UWEC01-01", "locationcode": "UWEC01", "city": "WIESBADEN", "sn_pc": "000632370153", "sn_sc": "201737 01584"},
    {"device_id": "ZPYC02-01", "locationcode": "ZPYC02", "city": "SANKT AUGUSTIN", "sn_pc": "047501471453", "sn_sc": "201737 01569"},
    {"device_id": "EUMC04-01", "locationcode": "EUMC04", "city": "ITZEHOE", "sn_pc": "052159660253", "sn_sc": "201840 00043"},
    {"device_id": "FKBS02-01", "locationcode": "FKBS02", "city": "ETTLINGEN", "sn_pc": "055841581453", "sn_sc": "201840 00047"},
    {"device_id": "FMMS01-01", "locationcode": "FMMS01", "city": "KEMPTEN", "sn_pc": "000947170153", "sn_sc": "201743 00711"},
    {"device_id": "DUSW07-01", "locationcode": "DUSW07", "city": "NEUSS", "sn_pc": "047524671453", "sn_sc": "201734 00764"},
    {"device_id": "FRAE02-01", "locationcode": "FRAE02", "city": "FRANKFURT AM MAIN", "sn_pc": "000426255253", "sn_sc": "201737 01601"},
    {"device_id": "QFBS02-01", "locationcode": "QFBS02", "city": "LOERRACH", "sn_pc": "0047917771453", "sn_sc": "201743 00695"},
    {"device_id": "BERT01-02", "locationcode": "BERT01", "city": "BERLIN", "sn_pc": "020264780153", "sn_sc": "201737 01576"},
    {"device_id": "WUEC01-01", "locationcode": "WUEC01", "city": "Wuerzburg", "sn_pc": "047721771453", "sn_sc": "201840 00034"},
    {"device_id": "FRAT02-01", "locationcode": "FRAT02", "city": "FRANKFURT AM MAIN", "sn_pc": "000784270153", "sn_sc": "201820 00652"},
    {"device_id": "ZEUC01-01", "locationcode": "ZEUC01", "city": "GOETTINGEN", "sn_pc": "053531471353", "sn_sc": "201734 00741"},
    {"device_id": "QULE01-01", "locationcode": "QULE01", "city": "Schwäbisch-Gmünd", "sn_pc": "", "sn_sc": "201737 01566"},
    {"device_id": "ZPFC03-01", "locationcode": "ZPFC03", "city": "Passau", "sn_pc": "", "sn_sc": "201737 01602"},
    {"device_id": "STRN01-01", "locationcode": "STRN01", "city": "STUTTGART", "sn_pc": "049073505053", "sn_sc": "201737 01600"},
    {"device_id": "BPEC01-01", "locationcode": "BPEC01", "city": "BAD HONNEF", "sn_pc": "009063381553", "sn_sc": "201728 00607"},
    {"device_id": "BPZC01-01", "locationcode": "BPZC01", "city": "BAUTZEN", "sn_pc": "020253280153", "sn_sc": "201820 00665"},
    {"device_id": "EUMC03-01", "locationcode": "EUMC03", "city": "NEUMUENSTER", "sn_pc": "047891671453", "sn_sc": "201743 00744"},
    {"device_id": "FRAC03-01", "locationcode": "FRAC03", "city": "FRANKFURT AM MAIN", "sn_pc": "047473371453", "sn_sc": "201820 00658"},
    {"device_id": "KLTC01-01", "locationcode": "KLTC01", "city": "KAISERSLAUTERN", "sn_pc": "047940471453", "sn_sc": "201743 00703"},
    {"device_id": "MUCN25-01", "locationcode": "MUCN25", "city": "MUENCHEN", "sn_pc": "047806371453", "sn_sc": "201734 00766"},
    {"device_id": "MUCT01-04", "locationcode": "MUCT01", "city": "MUENCHEN FLUGHAFEN", "sn_pc": "014160272453", "sn_sc": "201728 00610"},
    {"device_id": "OBFW01-01", "locationcode": "OBFW01", "city": "MUENCHEN", "sn_pc": "011761572553", "sn_sc": "201737 01577"},
    {"device_id": "QBOS01-01", "locationcode": "QBOS01", "city": "HATTINGEN", "sn_pc": "039430272653", "sn_sc": "201728 00620"},
    {"device_id": "QFLN01-01", "locationcode": "QFLN01", "city": "BURGHAUSEN", "sn_pc": "000760170153", "sn_sc": "201743 00706"},
    {"device_id": "QKZC01-01", "locationcode": "QKZC01", "city": "KONSTANZ", "sn_pc": "038170281553", "sn_sc": "201737 01610"},
    {"device_id": "QKZN03-01", "locationcode": "QKZN03", "city": "SIGMARINGEN", "sn_pc": "039995771253", "sn_sc": "201737 01607"},
    {"device_id": "SGYC01-01", "locationcode": "SGYC01", "city": "SINGEN", "sn_pc": "000351570153", "sn_sc": "201743 00692"},
    {"device_id": "STRE02-01", "locationcode": "STRE02", "city": "WAIBLINGEN", "sn_pc": "047983471453", "sn_sc": "201820 00664"},
    {"device_id": "ZCCC01-01", "locationcode": "ZCCC01", "city": "BADEN-BADEN", "sn_pc": "003100354653", "sn_sc": "201743 00703"},
    {"device_id": "ZEBC02-01", "locationcode": "ZEBC02", "city": "ESSLINGEN", "sn_pc": "029895271353", "sn_sc": "201734 00731"},
    {"device_id": "FRAT01-01", "locationcode": "FRAT01", "city": "FRANKFURT AM MAIN", "sn_pc": "001053570153", "sn_sc": "201823 00018"},
    {"device_id": "FRAT01-03", "locationcode": "FRAT01", "city": "FRANKFURT AM MAIN", "sn_pc": "044414471353", "sn_sc": ""},
    {"device_id": "LEYC01-01", "locationcode": "LEYC01", "city": "LEER", "sn_pc": "", "sn_sc": ""},
    {"device_id": "ZNOC02-01", "locationcode": "ZNOC02", "city": "HILDESHEIM", "sn_pc": "", "sn_sc": ""},
]

async def add_new_devices():
    """Fügt neue Geräte hinzu, die noch nicht in der Datenbank sind"""
    
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL nicht gefunden!")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client['tsrid_db']
    
    try:
        # Hole alle vorhandenen device_ids
        existing_devices = await db.europcar_devices.find({}, {"device_id": 1}).to_list(length=None)
        existing_ids = {device['device_id'] for device in existing_devices}
        
        print(f"📊 Vorhandene Geräte: {len(existing_ids)}")
        print(f"📊 Zu prüfende Geräte: {len(NEW_DEVICES)}")
        
        # Filtere neue Geräte
        new_to_add = []
        skipped = []
        
        for device in NEW_DEVICES:
            device_id = device['device_id']
            
            if device_id in existing_ids:
                skipped.append(device_id)
            else:
                # Bereite Gerät für MongoDB vor
                device_doc = {
                    "device_id": device['device_id'],
                    "locationcode": device['locationcode'],
                    "city": device.get('city', ''),
                    "sn_pc": device.get('sn_pc', ''),
                    "sn_sc": device.get('sn_sc', ''),
                    "status": "offline",  # Default Status
                    "hardware_model": "Scanner",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                new_to_add.append(device_doc)
        
        print(f"\n✅ Übersprungen (bereits vorhanden): {len(skipped)}")
        if skipped:
            print(f"   Erste 10: {skipped[:10]}")
        
        print(f"\n🆕 Neu hinzuzufügen: {len(new_to_add)}")
        
        # Füge neue Geräte hinzu
        if new_to_add:
            result = await db.europcar_devices.insert_many(new_to_add)
            print(f"✅ Erfolgreich {len(result.inserted_ids)} Geräte hinzugefügt!")
            
            # Zeige einige Beispiele
            print("\nBeispiele der hinzugefügten Geräte:")
            for device in new_to_add[:5]:
                print(f"  - {device['device_id']}: {device['city']} ({device['locationcode']})")
        else:
            print("ℹ️  Keine neuen Geräte zum Hinzufügen gefunden.")
        
        # Finale Statistik
        total_after = await db.europcar_devices.count_documents({})
        print(f"\n📊 Gesamt Geräte in Datenbank: {total_after}")
        
    except Exception as e:
        print(f"❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    print("🔄 Starte Geräte-Import...")
    asyncio.run(add_new_devices())
    print("✅ Import abgeschlossen!")
