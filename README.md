# Deals Aggregator (FastAPI + CRA)

A single-repo fullstack app that scrapes deals from Deal4Real, Zuzu Deals, and BuyWithUs via a FastAPI backend (Playwright + BeautifulSoup) and renders them in a React (Create React App) frontend.

## 🌐 Live Demo

**Frontend**: [https://ohadlavi.github.io/buying2/](https://ohadlavi.github.io/buying2/)  
**Backend API**: [https://buying2.onrender.com](https://buying2.onrender.com)

## 📸 Screenshot

![Deals Aggregator Screenshot](screenshots/deals-aggregator.png)

*The app features a modern dark/light theme toggle, bilingual support (Hebrew/English), advanced filtering options, grid/list view modes, and a modal popup for viewing deals.*

> **Note**: To add the screenshot, navigate to [https://ohadlavi.github.io/buying2/](https://ohadlavi.github.io/buying2/), take a screenshot, and save it as `screenshots/deals-aggregator.png`.

## Project Structure

- `server/`: FastAPI app
  - `app.py`: Single-file FastAPI server with Playwright scraping
  - `requirements.txt`: Python dependencies
  - `tests/`: HTML fixtures and tests for extraction
- `client/`: CRA frontend
  - `src/`: React app components (`App.jsx`, `components/Card.jsx`)
- `package.json`: root scripts to run both apps

## Backend

Dependencies (see `server/requirements.txt`):
- fastapi, uvicorn[standard]
- playwright (Chromium)
- beautifulsoup4, lxml
- cachetools
- requests (optional)
- python-multipart (optional)
- pytest (tests)

Playwright launch (Chromium, headless) with args:
- `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`
- Desktop Chrome user-agent

Endpoints:
- `GET /` → `{ ok: true }`
- `GET /scrape?sources=deal4real,zuzu,buywithus` → `{ source: [ { title, link, price } ] }`

Scraping:
- Sources (server-side map; client cannot override):
  - deal4real: `https://deal4real.co.il/`, selector `.product-card`
  - zuzu: `https://zuzu.deals/`, selector `.col_item`
  - buywithus: `https://buywithus.org/`, selector `.col_item`
- Whitelist hosts: `deal4real.co.il`, `www.deal4real.co.il`, `zuzu.deals`, `www.zuzu.deals`, `buywithus.org`, `www.buywithus.org`
- Parse per element:
  - title: first `h1,h2,h3` text (trimmed)
  - link: first `a[href]` resolved to absolute, host whitelisted
  - price: from `.price` or any class containing "price" (case-insensitive); regex first match of `(?:₪|$|€)?\s?\d[\d,\.]*`
- Dedupe per source by canonical link or normalized title
- Drop items where all fields are null
- In-memory cache TTL ~3 minutes (per source). On per-source errors, return `[]`.
- Concurrency: run sources in parallel; shared Playwright browser/context; timeouts 60s `goto`, 5s `wait_for_selector`.

CORS:
- Dev: `*`
- Prod: set `CORS_ORIGINS` env (comma-separated origins)

Port: 3001

Logging: basic request logs with source names. Avoid stack traces in production.

### One-time setup

1. Install Python dependencies:
```bash
python -m pip install -r server/requirements.txt
```

2. Install Playwright Chromium browser:
```bash
python -m playwright install chromium
```

3. Install Node dependencies:
```bash
npm install
cd client && npm install
```

### Run backend

```bash
cd server
python app.py
```

Or from root:
```bash
npm run server
```

## Frontend

- **Location**: `client/` (React app - new design)
- CRA app on port 3000
- Env var `REACT_APP_API_URL` to point to API; fallback to `http://localhost:3001`
- Modern UI features:
  - 🌙 Dark/Light theme toggle with persistent preference
  - 🌍 Bilingual support (Hebrew/English) with RTL/LTR layout
  - 🔍 Advanced filtering: search by title, filter by source, price range
  - 📊 Grid/List view modes with persistent preference
  - 🎯 Quick source filter buttons (All, Deal4Real, Zuzu Deals, BuyWithUs)
  - 🖼️ Modal popup for viewing deals in an iframe
  - ⏰ Last updated timestamp with manual refresh
  - 🎨 Responsive design with modern card-based layout
- `App.jsx` fetches `/scrape?sources=deal4real,zuzu,buywithus`, combines all deals, applies filters, and displays them in a unified grid/list view
- `Card.jsx` renders product image, title, source tag, price, and a "View Deal" button that opens in a modal

### Run frontend

```bash
cd client
npm install
npm start
```

Or from root:
```bash
npm run client
```

## Root scripts

From repository root:

```bash
npm install
npm run dev
```

This starts both backend (Uvicorn) and frontend (CRA) concurrently.

## Ethical scraping & notes

- Respect robots.txt and site terms. Rate-limit if adapting for frequent scraping.
- Cache responses to reduce load on target sites.
- SSRF-protected: only whitelisted domains are fetched/resolved.
- This is for educational/demo purposes.

