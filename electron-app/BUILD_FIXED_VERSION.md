# Build Instructions for Fixed Scanner Version

## What Was Fixed

The scanner integration was using the **wrong API method**:
- ❌ Was using: `GetImages` API (for streaming mode scanners)
- ✅ Now using: `Process` API (standard Regula SDK method)

This should fix the "No document detected" error!

## Build Commands

### On Windows PC:

1. **Navigate to electron-app folder:**
   ```cmd
   cd C:\path\to\electron-app
   ```

2. **Install dependencies (if needed):**
   ```cmd
   npm install
   ```

3. **Build the package:**
   ```cmd
   npm run package-win
   ```

4. **Find the built app:**
   - Look in: `electron-app/out/make/squirrel.windows/x64/`
   - File: `{AppName} Setup.exe`

## Quick Test

After building:

1. **Install the app** on Windows PC with Regula Scanner
2. **Start Regula SDK Service** (if not running)
3. **Launch the app**
4. **Click "Scanner" button**
5. **Place document on scanner**
6. **Check if scanning works!**

## What to Look For

### ✅ Success Indicators:
- Scanner button is active (not grayed out)
- LED turns yellow during scan
- Document is detected
- Images appear in the app
- LED turns green on success

### ❌ If Still Not Working:
1. Open DevTools (F12 in the app)
2. Look at console logs
3. Look for messages containing "Process API"
4. Share those logs for further debugging

## Check Logs

The app writes logs to a file. To view them:

1. Click "Show Logs" button in the app (if available)
2. Or find the log file at:
   ```
   %APPDATA%\{YourAppName}\electron-scanner.log
   ```

Look for these key messages:
- ✅ `[ELECTRON] Using standard Regula SDK Process API`
- ✅ `[ELECTRON] Calling Process API with settings`
- ✅ `[ELECTRON] ✓ Document detected! Processing...`

## Key Difference

### Before (BROKEN):
```
[ELECTRON] Desko Pentascanner detected - using Streaming mode
[ELECTRON] API URL: .../GetImages?AutoScan=true...
[ELECTRON] ⚠️ Scanner returned empty result
```

### After (FIXED):
```
[ELECTRON] Using standard Regula SDK Process API
[ELECTRON] API URL: .../Process
[ELECTRON] ✓ Document detected! Processing...
```

## Need Help?

If the scanner still doesn't work after this fix:

1. **Verify Regula SDK Service is running:**
   - Open browser
   - Go to: `https://localhost/Regula.SDK.Api.Documentation/index`
   - Should see documentation page

2. **Check scanner type:**
   - Is it a standard Regula scanner?
   - Or is it actually a Desko Pentascanner?
   - What does `RegulaReader.ini` say about streaming mode?

3. **Collect logs:**
   - App console logs (F12 → Console tab)
   - Electron log file
   - Any error messages

## Alternative: Use Pre-Built Package

If you can't build locally, request a pre-built package with this fix already applied.
