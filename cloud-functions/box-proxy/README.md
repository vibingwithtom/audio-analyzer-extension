# Box Proxy Cloud Function

A Google Cloud Function that proxies Box shared link downloads to bypass CORS restrictions.

## Deploy to Google Cloud

1. **Install Google Cloud CLI** (if not already installed):
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Login to Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project** (create one at https://console.cloud.google.com if needed):
   ```bash
   gcloud config set project YOUR-PROJECT-ID
   ```

4. **Deploy the function**:
   ```bash
   cd cloud-functions/box-proxy

   gcloud functions deploy box-proxy \
     --runtime nodejs20 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point boxProxy \
     --region us-central1
   ```

5. **Get the function URL**:
   After deployment, the URL will be displayed. It will look like:
   ```
   https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/box-proxy
   ```

## Usage

The function accepts a Box URL as a query parameter:

```
GET https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/box-proxy?url=ENCODED_BOX_URL
```

Or as a POST body:
```json
POST https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/box-proxy
{
  "url": "https://voices.app.box.com/s/..."
}
```

## Local Testing

```bash
npm install
npm start
```

Then test locally:
```bash
curl "http://localhost:8080?url=YOUR_BOX_URL"
```

## Cost

Google Cloud Functions free tier includes:
- 2 million invocations per month
- 400,000 GB-seconds of compute time
- 200,000 GHz-seconds of compute time
- 5 GB network egress per month

This should be more than enough for typical usage.
