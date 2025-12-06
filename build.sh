#!/bin/bash
# Build script for Render deployment

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing Playwright browsers..."
playwright install chromium

echo "Installing Node.js dependencies..."
npm install

echo "Building React app..."
cd client/buying
npm install
npm run build
cd ../..

echo "Build complete!"

