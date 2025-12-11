# Troubleshooting GitHub Pages Deployment

If your deployment didn't work, check the following:

## 1. Check if the Workflow Ran

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. Check if there's a workflow run for "Deploy to GitHub Pages"
4. Click on the workflow run to see if it succeeded or failed

## 2. Common Issues

### Workflow Didn't Run

- **Check branch name**: Make sure you pushed to `main` or `master` (the workflow triggers on both)
- **Check workflow file location**: Ensure `.github/workflows/deploy.yml` exists in your repository
- **Check workflow syntax**: The YAML file must be valid

### Build Failed

- **Check Actions tab**: Look at the error messages in the workflow run
- **Missing secrets**: Ensure all Firebase environment variables are set as GitHub Secrets
- **Build errors**: Check if there are TypeScript or build errors

### Deploy Failed

- **GitHub Pages not enabled**: Go to Settings → Pages → Source should be set to "GitHub Actions"
- **Permissions**: The workflow needs `pages: write` and `id-token: write` permissions
- **Check environment**: Make sure the `github-pages` environment exists (it's created automatically)

## 3. Manual Steps to Fix

### Enable GitHub Pages (if not already done)

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions** (not a branch)
3. Save

### Check Workflow Permissions

The workflow should automatically have the correct permissions, but you can verify:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select **Read and write permissions**
3. Check **Allow GitHub Actions to create and approve pull requests**

### Re-run the Workflow

1. Go to **Actions** tab
2. Click on the latest workflow run
3. Click **Re-run all jobs**

### Manual Trigger

The workflow now supports manual triggering:

1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click **Run workflow** button

## 4. Verify Secrets Are Set

Make sure all these secrets exist in **Settings** → **Secrets and variables** → **Actions**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## 5. Check Build Output

If the build succeeds but deployment fails:

1. Check the "Upload artifact" step - make sure the `dist` folder exists
2. Verify `vite.config.ts` has `base: "./"` set
3. Check that `npm run build` completes without errors

## 6. Verify Deployment

After successful deployment:

- Your site should be available at: `https://your-username.github.io/repository-name/`
- Check the "Deploy to GitHub Pages" step in Actions - it should show the URL
- It may take a few minutes for the site to be available after deployment

## 7. Still Not Working?

If none of the above helps:

1. Check the workflow logs in the Actions tab for specific error messages
2. Verify your repository settings allow GitHub Actions
3. Make sure you have push access to the repository
4. Try creating a new workflow run by making a small change and pushing again
