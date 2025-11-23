# Frontend Fix Plan

## Gefundene Probleme:

1. **Dokumenttyp nicht sichtbar**
   - FIXED ✅: IDChecksPage.jsx Zeile 470 - liest jetzt aus `extracted_data.document_type`

2. **Bilder werden nicht angezeigt**
   - Problem: Frontend sucht nach `front_original`, `back_original` etc.
   - Aber Backend speichert: `front_front`, `front_portrait`, `back_portrait`, `back_signature`
   - FIX: Image-Mapping aktualisieren

3. **Quality Score nicht sichtbar**
   - Problem: Wird in Detail-Seite nicht prominent angezeigt
   - FIX: Quality Score Badge hinzufügen

## Quick Fix Approach:

Da die Dateien sehr groß sind, mache ich gezielte Updates:

1. Backend: Konsistentere Image-Type Names verwenden
2. Frontend IDCheckDetailPage: Zeige vorhandene Bilder dynamisch an
3. Frontend IDCheckDetailPage: Quality Score prominent anzeigen
