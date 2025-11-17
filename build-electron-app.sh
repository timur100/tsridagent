#!/bin/bash
# Electron App Build Script
# Version 1.0

set -e  # Exit on error

echo "🔨 Electron App Build Process"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if in correct directory
echo "📍 Step 1/5: Checking directory..."
if [ ! -d "/app/electron-app" ]; then
    echo -e "${RED}❌ Error: /app/electron-app directory not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Directory found${NC}"
echo ""

# Step 2: Build Frontend (React)
echo "📦 Step 2/5: Building React Frontend..."
cd /app/frontend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Frontend package.json not found!${NC}"
    exit 1
fi

echo "   Running: yarn build..."
yarn build --silent

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 3: Copy Frontend to Electron
echo "📋 Step 3/5: Copying Frontend to Electron..."
cd /app

# Remove old renderer content (except zip files)
find /app/electron-app/renderer -type f ! -name "*.zip" -delete 2>/dev/null || true

# Copy new build
cp -r /app/frontend/build/* /app/electron-app/renderer/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to copy frontend files!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend copied to Electron${NC}"
echo ""

# Step 4: Install Electron Dependencies
echo "📥 Step 4/5: Checking Electron Dependencies..."
cd /app/electron-app

if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    yarn install --silent
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Step 5: Build Windows .exe
echo "🏗️ Step 5/5: Building Windows .exe..."
echo "   This may take 1-2 minutes..."
yarn build-portable

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESSFUL!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "📂 Output location:"
    echo "   /app/electron-app/dist/"
    echo ""
    echo "📊 Built files:"
    ls -lh /app/electron-app/dist/*.exe 2>/dev/null || echo "   (Checking...)"
    echo ""
    
    # Check if .exe exists
    if [ -f "/app/electron-app/dist/DocumentVerificationScanner-Portable.exe" ]; then
        SIZE=$(du -h /app/electron-app/dist/DocumentVerificationScanner-Portable.exe | cut -f1)
        echo -e "${GREEN}✓ DocumentVerificationScanner-Portable.exe${NC}"
        echo "   Size: $SIZE"
    fi
    
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Download the .exe from /app/electron-app/dist/"
    echo "   2. Copy to Windows PC"
    echo "   3. Run on Windows (Regula SDK required)"
    echo "   4. Test PIN feature (Default: 1234)"
    echo ""
    echo "📚 Documentation:"
    echo "   - /app/WINDOWS_QUICKSTART.md"
    echo "   - /app/REGULA_INTEGRATION_GUIDE.md"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ BUILD FAILED!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Check the error messages above."
    echo "Common issues:"
    echo "   - Missing dependencies: Run 'yarn install' in /app/electron-app"
    echo "   - Disk space: Check available space"
    echo "   - Permissions: Ensure write access to dist/ folder"
    echo ""
    exit 1
fi
