# Billing cut-off

A small Cloud Run function that **disables billing on the project when the
monthly budget is exceeded**. The Firebase project then drops back to the
free Spark plan:

- Sign-in, Firestore and the website keep working within the free limits.
- Portraits stop working (Storage needs Blaze) until you turn billing back on.

Google's billing data lags by a few hours, so a small overage (pennies on a
£1 budget) is possible before the cut-off fires. Based on Google's guide
[Disable billing usage with notifications](https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications).

The function itself runs within the free tier.

## Setup (one-off, about 10 minutes)

Everything runs in **Cloud Shell**: open the
[Google Cloud console](https://console.cloud.google.com/?project=dungeonsanddragons-e39d4)
and click the `>_` icon at the top right. Paste each block in turn.

**1. Turn on the APIs it needs** (takes a minute):

```bash
gcloud config set project dungeonsanddragons-e39d4
gcloud services enable cloudbilling.googleapis.com cloudfunctions.googleapis.com \
  run.googleapis.com cloudbuild.googleapis.com eventarc.googleapis.com \
  pubsub.googleapis.com artifactregistry.googleapis.com
```

**2. Create the topic the budget will publish to:**

```bash
gcloud pubsub topics create billing-cutoff
```

**3. Deploy the function:**

```bash
git clone https://github.com/JoshS1234/DungeonsAndDragons.git
cd DungeonsAndDragons/billing-cutoff
gcloud functions deploy stop-billing --gen2 --runtime=nodejs22 \
  --region=us-central1 --source=. --entry-point=stopBilling \
  --trigger-topic=billing-cutoff \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=dungeonsanddragons-e39d4
```

If it asks to enable more APIs or create a repository, answer **y**.

**4. Allow the function to switch billing off.** It needs the Billing
Account Administrator role **on the billing account** (not the project):

```bash
FUNCTION_ACCOUNT=$(gcloud functions describe stop-billing --region=us-central1 \
  --format='value(serviceConfig.serviceAccountEmail)')
BILLING_ACCOUNT=$(gcloud billing projects describe dungeonsanddragons-e39d4 \
  --format='value(billingAccountName)' | sed 's|billingAccounts/||')
gcloud billing accounts add-iam-policy-binding "$BILLING_ACCOUNT" \
  --member="serviceAccount:$FUNCTION_ACCOUNT" --role=roles/billing.admin
```

**5. Create the budget** in the console: **Billing → Budgets & alerts →
Create budget**.

- **Scope:** this project only. Untick **"Include credits in cost"** so the
  cut-off reacts to real usage even while free credits would cover it.
- **Amount:** e.g. £1.
- **Actions:** email alerts at 50%, 90% and 100%, and under **Manage
  notifications** tick **Connect a Pub/Sub topic to this budget** and choose
  `billing-cutoff`.

**6. Check it's connected**, with a pretend under-budget message (safe:
it won't disable anything):

```bash
gcloud pubsub topics publish billing-cutoff \
  --message='{"costAmount":0.10,"budgetAmount":1,"currencyCode":"GBP"}'
sleep 20
gcloud functions logs read stop-billing --region=us-central1 --limit=5
```

You should see `Within budget: 0.1 of 1 GBP`. Budget notifications then
arrive automatically several times a day.

## If it ever fires

You'll get the budget emails, and the function log says `Billing disabled`.
To turn portraits back on, re-link billing: Firebase console → **Usage and
billing → Details & settings → Modify plan → Blaze** (or Google Cloud
console → **Billing → Account management**). Worth finding out what used the
budget first. The usage guard in the app should make a loop bug unlikely to
be the cause.

## Code

- `budget.js`: reading the budget message and deciding whether to act (unit
  tested: `npm test` in the repo root).
- `index.js`: the function, using `@google-cloud/billing`.
