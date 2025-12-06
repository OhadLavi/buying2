#!/bin/bash
set -e

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Installing Playwright browsers ==="
playwright install chromium
playwright install-deps chromium

echo "=== Verifying Playwright installation ==="
python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); print('Playwright browsers:', p.chromium.executable_path); p.stop()"

echo "=== Setup complete ==="

