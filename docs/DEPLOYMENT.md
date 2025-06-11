# Google Cloud Run Deployment Guide

## Prerequisites

1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Authenticate with Google Cloud: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`
4. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

## Environment Variables

Set the following environment variables in Google Cloud Run:

### Required Variables
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase private key (base64 encoded recommended)
- `FIREBASE_CLIENT_EMAIL` - Firebase client email
- `FIREBASE_API_KEY` - Firebase API key
- `JWT_SECRET` - Secret for JWT tokens
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MAPBOX_TOKEN` - Mapbox API token
- `BACKEND_GOOGLE_CALLBACK_URL` - Google OAuth callback URL
- `FRONTEND_URL` - Frontend application URL
- `LOGO_URL` - Company logo URL

### Optional Variables
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `RESEND_API_KEY` - Resend email service API key
- `EMAIL_SENDER_ADDRESS` - Email sender address

## Deployment Options

### Option 1: Manual Deployment

1. Build and deploy using gcloud:
   ```bash
   # Build the image
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/xequtive-backend

   # Deploy to Cloud Run
   gcloud run deploy xequtive-backend \
     --image gcr.io/YOUR_PROJECT_ID/xequtive-backend \
     --region europe-west2 \
     --platform managed \
     --allow-unauthenticated \
     --memory 512Mi \
     --cpu 1 \
     --concurrency 80 \
     --max-instances 10 \
     --min-instances 0 \
     --port 8080 \
     --timeout 300
   ```

### Option 2: Automated Deployment with Cloud Build

1. Connect your repository to Cloud Build
2. The `cloudbuild.yaml` file will automatically handle the build and deployment

### Option 3: Local Docker Testing

1. Build the image locally:
   ```bash
   npm run docker:build
   ```

2. Run the container locally:
   ```bash
   npm run docker:run
   ```

## Cost Optimization

- **Auto-scaling**: Configured to scale to 0 when idle (min-instances: 0)
- **Memory**: Optimized to 512Mi
- **CPU**: Set to 1 vCPU
- **Concurrency**: Set to 80 concurrent requests per instance

## Monitoring

- View logs: `gcloud logs read --service=xequtive-backend --limit=50`
- Monitor metrics in Google Cloud Console under Cloud Run

## Security Features

- Runs as non-root user
- Multi-stage Docker build for smaller image size
- Health checks enabled
- HTTPS enforced by default in Cloud Run

## Troubleshooting

1. **Port Issues**: Ensure your app listens on the PORT environment variable (default: 8080)
2. **Environment Variables**: Use Google Cloud Console to set environment variables
3. **Memory Issues**: Increase memory allocation if needed
4. **Cold Starts**: Consider setting min-instances to 1 for better performance

## URLs

After deployment, your service will be available at:
`https://xequtive-backend-[hash]-[region].a.run.app` 