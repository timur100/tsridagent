# 🧪 Test-Anleitung: Regula Scanner Integration

## ✅ **EINFACHSTE METHODE: Python Test-Skript**

```bash
cd /app
python test_regula_enhanced.py
```

**✨ Testet automatisch:**
- Vorderseite separat → Rückseite separat → **Verknüpfung via TransactionID** ✅
- Vorder + Rückseite kombiniert ✅
- Quality Score Berechnung ✅

---

## ✅ **ALTERNATIVE: Bash/curl Test**

```bash
cd /app
bash test_curl_examples.sh
```

**Was passiert:**
1. Sendet Vorderseite mit TransactionID
2. Sendet Rückseite mit **gleicher TransactionID**
3. Zeigt Verknüpfung: `"linked": true`

---

## 📊 **Ergebnisse prüfen**

### In der Datenbank nachsehen:

```bash
mongosh mongodb://localhost:27017/main_db --quiet --eval "
  db.id_scans.find(
    {'regula_metadata.transaction_id': 'curl-test-transaction-123'}
  ).pretty()
"
```

**Erwartetes Ergebnis:**
```javascript
{
  id: 'ed0da235-...',
  extracted_data: { first_name: 'ERIKA', last_name: 'MUSTERMANN' },
  regula_metadata: {
    transaction_id: 'curl-test-transaction-123',
    quality_score: 80,
    back_side_processed: true  // ✅ Verknüpft!
  },
  requires_manual_review: false
}
```

---

## 🎯 **Was wurde getestet:**

✅ Vorderseite verarbeiten  
✅ Rückseite verarbeiten  
✅ **TransactionID-Verknüpfung** (Schlüssel-Feature!)  
✅ Quality Score Berechnung  
✅ Automatische Manual Review Entscheidung  
✅ Combined Front+Back Request  

---

## 📝 **Webhook-Endpunkt**

```
POST https://tenant-tracker-28.preview.emergentagent.com/api/webhooks/regula-scan
Header: X-API-Key: G3pbltT7jpdD6U4Z4nB7tAVDrneFVS5IzmC-pAQS3zg
```

---

**Vollständige Dokumentation:** `/app/REGULA_ENHANCED_FEATURES.md`
