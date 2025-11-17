#!/bin/bash

echo "🔨 Building Electron App with Scanner Integration..."

# Create directories
mkdir -p renderer
mkdir -p assets

# Step 1: Build React frontend
echo "📦 Building React frontend..."
cd ../frontend
yarn build

# Step 2: Copy build to electron renderer
echo "📋 Copying React build to Electron app..."
cd ../electron-app
rm -rf renderer/*
cp -r ../frontend/build/* renderer/

# Step 3: Update index.html for Electron
echo "🔧 Updating paths for Electron..."
sed -i 's|/static/|static/|g' renderer/index.html
sed -i 's|href="/|href="./|g' renderer/index.html
sed -i 's|src="/|src="./|g' renderer/index.html

# Step 4: Create a simple icon (placeholder)
echo "🎨 Creating app icon..."
# You can replace this with actual icon later
echo "Icon placeholder created"

# Step 5: Install electron dependencies
echo "📦 Installing Electron dependencies..."
yarn install

echo ""
echo "✅ Build preparation complete!"
echo ""
echo "To build Windows executable:"
echo "  cd electron-app"
echo "  yarn build          # Creates installer"
echo "  yarn build-portable # Creates portable .exe"
echo ""
echo "To test locally:"
echo "  cd electron-app"
echo "  yarn start"
echo ""
