# Render Deployment Instructions

## Important: Configure Render Dashboard

Render is currently detecting this as a Node.js project. You need to configure it as a **Python** project in the Render dashboard:

### Steps:

1. Go to your Render dashboard
2. Select your service
3. Go to **Settings**
4. Set the following:

   **Environment**: `Python 3`
   
   **Build Command**: 
   ```bash
   pip install -r requirements.txt && playwright install chromium && npm install
   ```
   
   **Start Command**: 
   ```bash
   python server/app.py
   ```
   
   **Python Version**: `3.13` (or specify in `runtime.txt`)

### Alternative: Use render.yaml

If Render supports `render.yaml` (Blueprints), the configuration should be automatic. Make sure:
- The service is created from the `render.yaml` file
- Or manually configure the settings above

### Required Environment Variables:

- `PORT` - Automatically set by Render (don't set manually)
- `CORS_ORIGINS` - Optional, comma-separated origins for CORS (defaults to `*`)

### Notes:

- The `requirements.txt` file must be at the root of the repository
- Playwright browsers will be installed during build
- The server will run on the PORT provided by Render

