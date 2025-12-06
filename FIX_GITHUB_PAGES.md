# Fix: GitHub Pages Showing README Instead of React App

## The Problem:
GitHub Pages is currently serving your README.md file instead of the built React app.

## Solution:

### Step 1: Configure GitHub Pages to Use GitHub Actions

1. Go to your repository: `https://github.com/OhadLavi/buying2`
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under **Source**, you'll see options:
   - If it says "Deploy from a branch" → **Change it to "GitHub Actions"**
   - If it already says "GitHub Actions" → Make sure it's selected
5. Click **Save**

### Step 2: Trigger the Deployment

The workflow will automatically run when you push to `master`, but you can also trigger it manually:

1. Go to the **Actions** tab in your repository
2. Click **Deploy to GitHub Pages** workflow (on the left)
3. Click **Run workflow** button (top right)
4. Select branch: `master`
5. Click **Run workflow**

### Step 3: Wait for Deployment

1. Watch the workflow run in the **Actions** tab
2. Wait for both jobs to complete:
   - ✅ **build** job (builds React app)
   - ✅ **deploy** job (deploys to GitHub Pages)
3. Once complete, you'll see a green checkmark

### Step 4: Access Your Site

After deployment completes (usually 2-3 minutes), your site will be at:
**https://ohadlavi.github.io/buying2**

## Important Notes:

- **Don't use "Deploy from a branch"** - This serves files from your repo root/docs, which is why you see README.md
- **Use "GitHub Actions"** - This serves the built React app from the workflow
- The `.nojekyll` file prevents Jekyll from processing your files (already included in the workflow)

## If It Still Shows README:

1. Clear your browser cache (Ctrl+Shift+Delete)
2. Try incognito/private browsing mode
3. Check the Actions tab to ensure the workflow completed successfully
4. Wait a few minutes - GitHub Pages can take time to update

## Verify the Deployment:

Once deployed, you should see:
- Your React app interface (not README text)
- The deals aggregator with filters and cards
- API calls going to `https://buying2.onrender.com`

