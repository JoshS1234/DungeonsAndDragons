# Setting up GitHub Secrets for Firebase Configuration

This project uses environment variables to store Firebase credentials securely. Follow these steps to set up GitHub Secrets for CI/CD workflows.

## Local Development Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials in the `.env` file. The `.env` file is already in `.gitignore` and will not be committed.

## GitHub Secrets Setup

If you're using GitHub Actions for CI/CD, you'll need to add these as repository secrets:

### Steps to Add GitHub Secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

| Secret Name                         | Description                             |
| ----------------------------------- | --------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Your Firebase API Key                   |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Your Firebase Auth Domain               |
| `VITE_FIREBASE_PROJECT_ID`          | Your Firebase Project ID                |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Your Firebase Storage Bucket            |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID       |
| `VITE_FIREBASE_APP_ID`              | Your Firebase App ID                    |
| `VITE_FIREBASE_MEASUREMENT_ID`      | Your Firebase Measurement ID (optional) |

### Example GitHub Actions Workflow

If you're using GitHub Actions, create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Create .env file
        run: |
          echo "VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}" >> .env
          echo "VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}" >> .env
          echo "VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID }}" >> .env
          echo "VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}" >> .env
          echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}" >> .env
          echo "VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }}" >> .env
          echo "VITE_FIREBASE_MEASUREMENT_ID=${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}" >> .env

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        run: # your deployment command here
```

## Security Notes

- ✅ The `.env` file is in `.gitignore` and will not be committed
- ✅ `.env.example` serves as a template without sensitive data
- ✅ GitHub Secrets are encrypted and only accessible in GitHub Actions
- ⚠️ Never commit your `.env` file
- ⚠️ Never share your Firebase credentials publicly

## Removing Credentials from Git History

If you've already committed sensitive data, you'll need to remove it from Git history:

```bash
# Remove the file from history (BE CAREFUL - this rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch firebaseSetup.ts" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This will rewrite remote history)
git push origin --force --all
```

Alternatively, use `git-filter-repo` (recommended):

```bash
git filter-repo --path firebaseSetup.ts --invert-paths
```

**Note:** If you've already pushed commits with sensitive data, consider rotating your Firebase API keys as they may have been exposed.
