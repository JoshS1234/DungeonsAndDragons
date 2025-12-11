# GitHub Pages Deployment Setup

This guide will help you deploy your Dungeons and Dragons application to GitHub Pages.

## Prerequisites

1. Your repository is on GitHub
2. You have push access to the repository
3. GitHub Pages is enabled in your repository settings

## Setup Steps

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub
2. Click on **Settings**
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Save the settings

### 2. Add GitHub Secrets for Firebase Configuration

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets (values from your `.env` file):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 3. Update Firebase Authorized Domains

1. Go to your Firebase Console
2. Navigate to **Authentication** → **Settings** → **Authorized domains**
3. Add your GitHub Pages domain: `your-username.github.io`
4. If using a custom domain, add that as well

### 4. Deploy

1. Push your code to the `main` branch (or your default branch)
2. The GitHub Actions workflow will automatically:
   - Build your application
   - Deploy it to GitHub Pages
3. Your site will be available at: `https://your-username.github.io/repository-name/`

## Important Notes

### HashRouter

The application now uses `HashRouter` instead of `BrowserRouter` for better GitHub Pages compatibility. This means URLs will look like:

- `https://your-site.com/#/campaigns`
- `https://your-site.com/#/characters`

This is necessary because GitHub Pages doesn't support server-side routing configuration.

### Environment Variables

All Firebase environment variables must be added as GitHub Secrets. The workflow will use these during the build process.

### Custom Domain (Optional)

If you're using a custom domain:

1. Add the domain in your GitHub Pages settings
2. Update the `base` in `vite.config.ts` if needed
3. Make sure your Firebase authorized domains include your custom domain

## Manual Deployment

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# The dist folder will contain the built files
# You can then manually upload these to GitHub Pages
```

## Troubleshooting

### Build Fails

- Check that all GitHub Secrets are set correctly
- Verify your `.github/workflows/deploy.yml` file is correct
- Check the Actions tab in GitHub for error messages

### Authentication Not Working

- Verify Firebase authorized domains include your GitHub Pages URL
- Check that environment variables are correctly set as GitHub Secrets

### Routing Issues

- The app uses HashRouter which should work without issues on GitHub Pages
- If you experience routing problems, check that `base: "./"` is set in `vite.config.ts`
