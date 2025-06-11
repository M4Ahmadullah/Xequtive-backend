# Google Cloud Run Deployment Guide

## Your Existing App is Ready! 🎉

Your Node.js backend app is already configured for Google Cloud Run deployment. I've added the necessary files:

- ✅ **Dockerfile** - Multi-stage build for production
- ✅ **cloudbuild.yaml** - Automated CI/CD with Cloud Build
- ✅ **.dockerignore** - Optimized Docker context
- ✅ **Root endpoint** - Added `/` route for health checks

## Quick Deployment Steps

### 1. Prerequisites
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### 2. Deploy Your Current App

**Option A: Using Cloud Build (Recommended)**
```bash
# This will build and deploy automatically
gcloud builds submit --config cloudbuild.yaml .
```

**Option B: Manual Docker Build**
```bash
# Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/xequtive-backend .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/xequtive-backend

# Deploy to Cloud Run
gcloud run deploy xequtive-backend \
  --image gcr.io/YOUR_PROJECT_ID/xequtive-backend \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### 3. Set Environment Variables

```bash
# Set your environment variables
gcloud run services update xequtive-backend \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="FIREBASE_PROJECT_ID=your-project-id" \
  --set-env-vars="FIREBASE_PRIVATE_KEY=your-private-key" \
  --set-env-vars="FIREBASE_CLIENT_EMAIL=your-client-email" \
  --set-env-vars="FIREBASE_API_KEY=your-api-key" \
  --set-env-vars="JWT_SECRET=your-jwt-secret" \
  --set-env-vars="ALLOWED_ORIGINS=https://your-frontend.com" \
  --set-env-vars="MAPBOX_TOKEN=your-mapbox-token" \
  --set-env-vars="FRONTEND_URL=https://your-frontend.com" \
  --set-env-vars="LOGO_URL=https://your-logo.com/logo.png" \
  --region europe-west1
```

### 4. Test Your Deployment

```bash
# Get the service URL
gcloud run services describe xequtive-backend --region europe-west1 --format="value(status.url)"

# Test the root endpoint
curl https://your-service-url.run.app/

# Test the API health check
curl https://your-service-url.run.app/api/ping
```

## What's Been Updated

### 1. Your Main App (`src/index.ts`)
- ✅ Added root endpoint `/` that returns "Hello from Cloud Run!"
- ✅ Already listens on `process.env.PORT || 8080`
- ✅ Binds to `0.0.0.0` for container compatibility
- ✅ Has health check at `/api/ping`

### 2. Dockerfile Features
- Multi-stage build for smaller image size
- Non-root user for security
- Proper signal handling with dumb-init
- Optimized for production

### 3. Cloud Build Configuration
- Automated build and deployment
- Configurable region and resources
- Container Registry integration

## Minimal Example App

I've also created a minimal example in `examples/minimal-cloud-run-app/`:

```javascript
// examples/minimal-cloud-run-app/app.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Cloud Run!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

To deploy the minimal example:
```bash
cd examples/minimal-cloud-run-app
npm install
docker build -t minimal-app .
# ... deploy as above
```

## Environment Variables

Create a `.env` file for local development:
```env
PORT=8080
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000
MAPBOX_TOKEN=your-mapbox-token
FRONTEND_URL=http://localhost:3000
LOGO_URL=https://your-logo.com/logo.png
```

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read xequtive-backend --region europe-west1

# Monitor metrics
gcloud run services describe xequtive-backend --region europe-west1
```

## Cost Optimization

Cloud Run pricing is based on:
- CPU and memory allocation
- Request duration
- Number of requests

Your current configuration:
- 512Mi memory, 1 CPU
- Max 10 instances
- 300s timeout

This should handle most workloads efficiently while keeping costs low.

## Next Steps

1. Update your environment variables in Cloud Run
2. Test all endpoints after deployment
3. Set up domain mapping if needed
4. Configure CI/CD with Cloud Build triggers
5. Monitor performance and adjust resources

Your app is now ready for production on Google Cloud Run! 🚀 