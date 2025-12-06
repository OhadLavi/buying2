# GitHub Pages Deployment Setup

Your server is now live at: **https://buying2.onrender.com**

## Steps to Deploy Frontend to GitHub Pages:

### 1. Enable GitHub Pages in Repository Settings

1. Go to your GitHub repository: `https://github.com/OhadLavi/buying2`
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - **Source**: `GitHub Actions`
4. Click **Save**

### 2. Push the Changes

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) is already created. Just push your changes:

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin master
```

### 3. Monitor the Deployment

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You should see "Deploy to GitHub Pages" workflow running
4. Wait for it to complete (usually 2-3 minutes)

### 4. Access Your Site

Once deployed, your site will be available at:
**https://ohadlavi.github.io/buying2**

## Configuration Details:

- **API Server**: `https://buying2.onrender.com`
- **Frontend**: `https://ohadlavi.github.io/buying2`
- The React app is configured to automatically use the Render API URL

## Troubleshooting:

### If the workflow fails:
- Check the **Actions** tab** for error messages
- Make sure GitHub Pages is enabled in repository settings
- Verify the workflow file is in `.github/workflows/deploy-pages.yml`

### If the API doesn't work:
- Check that your Render service is running: https://buying2.onrender.com
- Test the API endpoint: https://buying2.onrender.com/scrape
- The React app uses `REACT_APP_API_URL` environment variable (set in the workflow)

## Manual Build (Optional):

If you want to test the build locally:

```bash
cd client/buying
REACT_APP_API_URL=https://buying2.onrender.com npm run build
```

The built files will be in `client/buying/build/`

