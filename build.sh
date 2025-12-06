#!/bin/bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright browsers ==="
playwright install chromium
playwright install-deps chromium

echo "=== Installing Node.js dependencies ==="
npm install

echo "=== Build complete ==="
