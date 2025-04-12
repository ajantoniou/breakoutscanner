#!/bin/bash

# Vercel deployment script for Breakout Scanner
echo "Starting Vercel deployment for Breakout Scanner..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Create .env file with Supabase credentials if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file with Supabase credentials..."
    echo "VITE_SUPABASE_URL=https://your-supabase-project.supabase.co" > .env
    echo "VITE_SUPABASE_ANON_KEY=your-supabase-anon-key" >> .env
    echo "Please update the .env file with your actual Supabase credentials before deploying."
    exit 1
fi

# Build the project
echo "Building project..."
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "Deployment completed! Your Breakout Scanner is now live on Vercel."
echo "Make sure to set up the following environment variables in your Vercel project settings:"
echo "- VITE_SUPABASE_URL"
echo "- VITE_SUPABASE_ANON_KEY"
