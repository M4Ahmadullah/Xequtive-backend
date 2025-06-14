# Deployment Guide for Xequtive Backend to Google Cloud Run

This guide outlines the steps to build and deploy your Node.js application to Google Cloud Run. Ensure you have the Google Cloud SDK installed and are authenticated (run `gcloud auth login` if needed).

## Prerequisites
- Install the Google Cloud SDK: [Download here](https://cloud.google.com/sdk/docs/install).
- Set your project: `gcloud config set project your-project-id` (replace `your-project-id` with your actual Google Cloud project ID).
- Make sure environment variables are set securely using Google Cloud Secrets or as part of the deploy command.

## Build and Deploy Steps
1. **Build the container image**:
   - Run the following command to build and push the image to Google Container Registry:
     ```bash
gcloud builds submit --tag gcr.io/your-project-id/xequtive-backend
```
   - This command uses Cloud Build to create the image from your codebase.

2. **Deploy to Cloud Run**:
   - Deploy the image to Cloud Run with the following command:
     ```bash
gcloud run deploy xequtive-backend-service --image gcr.io/your-project-id/xequtive-backend --platform managed --region europe-west2 --allow-unauthenticated
```
   - Replace `xequtive-backend-service` with your desired service name if different.
   - Use `--set-env-vars` to add environment variables, e.g., `--set-env-vars FIREBASE_API_KEY=your-key` (for security, use Secrets Manager instead).

3. **After Deployment**:
   - Access your service at the provided URL (e.g., https://xequtive-backend-service-your-region.a.run.app).
   - Test the health endpoint: GET /api/ping.

## Tips
- For production, manage sensitive data like API keys using Google Secret Manager.
- To update, simply rebuild and redeploy with the above commands.
- Monitor deployments via the Google Cloud Console. 