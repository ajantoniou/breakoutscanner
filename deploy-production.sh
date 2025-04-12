#!/bin/bash

# Deployment script for Breakout Scanner
# This script deploys the application to a public website with password protection

echo "🚀 Starting deployment process for Breakout Scanner..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file with necessary environment variables
echo "🔑 Setting up environment variables..."
cat > .env << EOL
VITE_POLYGON_API_KEY=${POLYGON_API_KEY:-"onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI"}
VITE_SUPABASE_URL=${SUPABASE_URL:-"https://ttmeplqmrjhysyqzuaoh.supabase.co"}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek"}
VITE_APP_VERSION="1.0.0"
VITE_APP_NAME="Breakout Scanner"
EOL

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed. Please check the logs for errors."
    exit 1
fi

# Deploy to Vercel (if Vercel CLI is installed)
if command -v vercel &> /dev/null; then
    echo "🌐 Deploying to Vercel..."
    vercel --prod
    
    # Check if deployment was successful
    if [ $? -eq 0 ]; then
        echo "✅ Deployment to Vercel successful!"
    else
        echo "❌ Deployment to Vercel failed. Please check the logs for errors."
        echo "⚠️ Falling back to local deployment..."
    fi
else
    echo "⚠️ Vercel CLI not found. Skipping Vercel deployment."
    echo "⚠️ Falling back to local deployment..."
fi

# Start local server for testing
echo "🌐 Starting local server for testing..."
npm run preview -- --host 0.0.0.0 --port 3000

echo "✅ Deployment process completed."
echo "📝 Please check the deployment documentation for more information."
