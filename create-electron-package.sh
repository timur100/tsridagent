#!/bin/bash

echo "📦 Creating Electron Download Package..."
echo ""

# Get version number from user
read -p "Enter version number (e.g., 4): " VERSION
if [ -z "$VERSION" ]; then
  echo "❌ Version number required!"
  exit 1
fi

PACKAGE_NAME="electron-scanner-package-v${VERSION}.zip"

echo "Creating: $PACKAGE_NAME"
echo ""

# Step 1: Build React app
echo "🔨 [1/4] Building React app..."
cd /app/electron-app
bash build.sh > /dev/null 2>&1

# Step 2: Create package directory
echo "📁 [2/4] Creating package structure..."
cd /app
rm -rf electron-package
mkdir -p electron-package

# Step 3: Copy files
echo "📋 [3/4] Copying files..."
cp electron-app/package.json electron-package/
cp electron-app/main.js electron-package/
cp electron-app/preload.js electron-package/
cp electron-app/build-on-windows-npm.bat electron-package/
cp electron-app/debug-scanner.js electron-package/
cp electron-app/README.md electron-package/
cp electron-app/DOWNLOAD-ANLEITUNG.md electron-package/
cp electron-app/SCANNER-DEBUG.md electron-package/
cp -r electron-app/renderer electron-package/

# Step 4: Create ZIP
echo "🗜️  [4/4] Creating ZIP package..."
cd electron-package
zip -q -r ../$PACKAGE_NAME .

# Step 5: Copy to public folder
echo "📤 Uploading to public folder..."
cd /app
cp $PACKAGE_NAME /app/frontend/public/

# Get file size
SIZE=$(ls -lh $PACKAGE_NAME | awk '{print $5}')

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 File: $PACKAGE_NAME"
echo "📊 Size: $SIZE"
echo "📍 Location: /app/frontend/public/$PACKAGE_NAME"
echo ""
echo "🌐 Download-URL:"
echo "https://job-portal-harmony.emergentagent.com/$PACKAGE_NAME"
echo ""
echo "📝 Don't forget to update:"
echo "  - README.md with new download link"
echo "  - CHANGELOG.md with changes"
echo "  - Version in package.json"
echo ""
