# Breakout Scanner Deployment Guide

This guide provides step-by-step instructions for deploying your Breakout Scanner application to Vercel.

## Prerequisites

Before deploying, ensure you have:

1. A Vercel account (sign up at [vercel.com](https://vercel.com) if needed)
2. Your Supabase project credentials (URL and anon key)
3. A working Polygon.io API key

## Deployment Steps

### Option 1: Using the Vercel Web Interface

1. **Log in to Vercel**
   - Go to [vercel.com](https://vercel.com) and log in to your account

2. **Create a New Project**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository" or use the "Vite + React Starter" template

3. **Configure Project**
   - If importing from Git, select your repository
   - If using a template, connect it to your local project
   - Configure the following settings:
     - Framework Preset: Vite
     - Root Directory: ./
     - Build Command: `npm run build`
     - Output Directory: dist

4. **Set Environment Variables**
   - Add the following environment variables:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
     - `VITE_POLYGON_API_KEY`: Your Polygon.io API key

5. **Deploy**
   - Click "Deploy" and wait for the build to complete

### Option 2: Using the Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to Your Project Directory**
   ```bash
   cd /path/to/BreakoutScanner
   ```

3. **Run the Deployment Script**
   ```bash
   ./deploy-vercel.sh
   ```
   
   This script will:
   - Check if Vercel CLI is installed
   - Build your project
   - Deploy to Vercel

4. **Follow the CLI Prompts**
   - Log in to Vercel if prompted
   - Select "Create new project" when asked
   - Confirm the project settings

5. **Set Environment Variables**
   - After deployment, go to your project on the Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add the required environment variables as described in `SUPABASE_ENV_SETUP.md`

### Option 3: Using the Automated Script with Environment Variables

1. **Create a `.env` file in your project root**
   ```
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_POLYGON_API_KEY=your-polygon-api-key
   ```

2. **Run the Deployment Script**
   ```bash
   ./deploy-vercel.sh
   ```

## Post-Deployment Steps

1. **Verify Deployment**
   - Use the `DEPLOYMENT_VERIFICATION.md` checklist to verify your deployment
   - Ensure all features are working correctly

2. **Set Up Custom Domain (Optional)**
   - In your Vercel project settings, go to Domains
   - Add your custom domain and follow the verification steps

3. **Configure Automatic Deployments (Optional)**
   - Connect your Git repository to Vercel for automatic deployments
   - Set up branch deployments for staging environments

## Troubleshooting

### Build Failures

If your build fails:
1. Check the build logs for specific errors
2. Ensure all dependencies are correctly specified in package.json
3. Verify that your environment variables are correctly set
4. Try running the build locally with `npm run build` to identify issues

### Authentication Issues

If authentication doesn't work:
1. Verify your Supabase environment variables are correctly set
2. Check that your Supabase project is active
3. Ensure the authentication service in Supabase is enabled
4. Check browser console for specific error messages

### Data Accuracy Issues

If you encounter data accuracy problems:
1. Verify your Polygon API key is valid and correctly set
2. Check that your subscription allows access to the required endpoints
3. Ensure the WebSocket connection is established for real-time updates
4. Verify the timestamp validation system is working correctly

## Maintenance

### Updating Your Deployment

To update your deployed application:

1. Make changes to your local codebase
2. Test locally to ensure everything works
3. Commit and push changes to your repository (if using Git integration)
4. Run `vercel --prod` to deploy the updates

### Monitoring

Vercel provides built-in monitoring tools:
1. Go to your project dashboard
2. Check the "Analytics" tab for performance metrics
3. Set up alerts for build failures or performance issues

## Support

If you encounter any issues with your deployment, refer to:
- Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- Polygon.io documentation: [polygon.io/docs](https://polygon.io/docs)

For specific issues with the Breakout Scanner, check the troubleshooting section in `DOCUMENTATION.md`.
