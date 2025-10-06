# Deploy Box Proxy Cloud Function

## Via Google Cloud Console

1. Go to https://console.cloud.google.com/functions
2. Click on `box-proxy-708688597317` function
3. Click "EDIT" button at the top
4. Replace the code in `index.js` with the updated code from this directory
5. Make sure `package.json` matches this directory
6. Click "DEPLOY" button at the bottom
7. Wait for deployment to complete (green checkmark)

## Via gcloud CLI (if you have it installed)

```bash
cd /Users/raia/XCodeProjects/audio-analyzer/cloud-functions/box-proxy
gcloud functions deploy boxProxy \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=boxProxy \
  --trigger-http \
  --allow-unauthenticated
```
