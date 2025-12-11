# GitHub Pages Deployment Checklist

## Quick Checklist

- [ ] GitHub Pages is enabled in Settings → Pages → Source: **GitHub Actions**
- [ ] All Firebase secrets are added in Settings → Secrets and variables → Actions
- [ ] Workflow file exists at `.github/workflows/deploy.yml`
- [ ] Code has been pushed to `main` branch
- [ ] Check Actions tab - workflow should be running or have run

## Step-by-Step Verification

### 1. Check if Workflow Ran

1. Go to your repository on GitHub
2. Click the **Actions** tab (at the top)
3. Look for "Deploy to GitHub Pages" workflow
4. Click on it to see the status
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (click to see errors)
   - ⏳ Yellow circle = Running

### 2. Enable GitHub Pages (if not done)

1. Repository → **Settings**
2. Scroll to **Pages** in left sidebar
3. Under **Source**, select **GitHub Actions** (NOT "Deploy from a branch")
4. Click **Save**

### 3. Verify Secrets Are Set

1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. Verify these secrets exist:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 4. Check Workflow Permissions

1. Repository → **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 5. Manual Trigger (if needed)

1. Go to **Actions** tab
2. Click "Deploy to GitHub Pages" in the left sidebar
3. Click **Run workflow** button (top right)
4. Select branch: `main`
5. Click **Run workflow**

## Common Error Messages

### "Workflow run failed"

- Check the error in the Actions tab
- Common causes:
  - Missing secrets (build will fail)
  - Build errors (TypeScript/compile errors)
  - Missing dependencies

### "No workflow run found"

- The workflow file might not be committed
- Check that `.github/workflows/deploy.yml` exists in your repository
- Make sure you pushed to `main` branch

### Build succeeds but no deployment

- Check that GitHub Pages is set to "GitHub Actions" source
- Verify the "Deploy to GitHub Pages" step ran successfully
- Check the deployment URL in the workflow output

## After Successful Deployment

Your site will be available at:

- `https://[your-username].github.io/[repository-name]/`

Example: `https://johndoe.github.io/DungeonsAndDragons/`

**Note**: It may take 1-2 minutes for the site to be accessible after deployment completes.
