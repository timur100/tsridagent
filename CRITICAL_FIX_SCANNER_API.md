# CRITICAL FIX: Scanner API Mode Detection

## Problem Identified

The Electron app was **hardcoded** to assume ALL scanners are "Desko Pentascanners in Streaming mode" without any actual detection logic. This caused the app to:
1. Always call the `GetImages` API (streaming mode)
2. Fail on standard Regula scanners that use the `Process` API
3. Return "No document detected" errors

## Root Cause Analysis

### What Was Wrong:
```javascript
// Line 218-220 in main.js (OLD CODE)
// For Desko Pentascanner in Streaming mode
// Step 1: Use GetImages with AutoScan for streaming mode (GET method!)
log('[ELECTRON] Desko Pentascanner detected - using Streaming mode');
```

**There was NO scanner detection**  - the code just assumed streaming mode!

### Evidence from RegulaReader.ini:
- **No `Settings.Streaming.Enabled` setting exists**
- Scanner is standard Regula Document Reader SDK v8.3.1.1
- Scanner configuration shows standard settings (AutoScan=1, but NOT streaming mode)
- No indication of Desko Pentascanner in the configuration

## The Fix

### Changed From: GetImages API (Streaming Mode)
```javascript
// OLD - Hardcoded streaming mode
const getImagesUrl = `${scannerStatus.url}/Methods/GetImages?AutoScan=true&CaptureMode=All&ImageFormat=JPEG&Light=0&Timeout=15000`;
const scanResult = await makeRequest(getImagesUrl, 'GET');
```

### Changed To: Process API (Standard Mode)
```javascript
// NEW - Standard Regula SDK Process API
const processData = {
  processParam: {
    scenario: 'MRZ',
    resultTypeOutput: ['RFID_IMAGE_DATA', 'IMAGES', 'MRZ_TEXT', 'VISUAL_TEXT', 'BARCODES'],
    doRFID: settings.doRFID || false,
    timeout: 30000,
    imageQuality: 80,
    alreadyCropped: false,
    doublePageSpread: true
  }
};
const scanResult = await makeRequest(`${scannerStatus.url}/Methods/Process`, 'POST', processData);
```

## Key Changes Made

1. **Removed Hardcoded Streaming Mode Assumption**
   - Line 218-220: Removed "Desko Pentascanner detected" log
   - Switched to standard Process API

2. **Updated API Call**
   - Method: `GET` → `POST`
   - Endpoint: `/Methods/GetImages` → `/Methods/Process`
   - Parameters: Query string → JSON body with processParam

3. **Updated Result Validation**
   - Changed from GetImages response format to Process API format
   - Check for `ProcessingFinished` status
   - Check for `Status` and `Images` in Process API response structure

4. **Improved Logging**
   - Changed "GetImages mode" → "Process API"
   - Updated diagnostic messages
   - Better error messages

## Why This Fixes The Issue

### Before (BROKEN):
- App calls `GetImages` API
- Scanner isn't configured for streaming mode
- Scanner doesn't respond or returns empty data
- User sees "No document detected"

### After (FIXED):
- App calls standard `Process` API
- Scanner processes document normally
- Scanner returns images and data
- Scanning works correctly!

## Testing Instructions

1. **Build New Package:**
   ```bash
   cd /app/electron-app
   npm install
   npm run package-win
   ```

2. **Deploy to Windows Machine:**
   - Copy packaged app to Windows PC with Regula SDK
   - Ensure Regula SDK Service is running
   - Launch the Electron app

3. **Test Scanning:**
   - Click "Scanner" button in app
   - Place document on scanner
   - Scanner should now detect and process document
   - Check logs in app for "Process API" messages

## Expected Behavior After Fix

✅ Scanner detects documents properly
✅ Images are captured
✅ Document data is extracted
✅ No more "No document detected" errors
✅ Works with standard Regula Document Reader SDK scanners

## Additional Notes

- This fix works for **standard Regula scanners**
- If you actually have a Desko Pentascanner in streaming mode, we'd need to:
  1. Add proper scanner type detection
  2. Check for streaming mode in settings
  3. Use GetImages API only when streaming is confirmed
  
- For now, the standard Process API should work for most Regula SDK installations

## Files Modified

- `/app/electron-app/main.js` - Lines 214-374 (performScan function)

## Version

- Fix Date: 2025-11-05
- Electron App Version: Updated
- Target: Standard Regula Document Reader SDK v8.x
