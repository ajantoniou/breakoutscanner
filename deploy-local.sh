#!/bin/bash

# Breakout Scanner Local Deployment Script
# This script builds and runs the application locally

echo "🚀 Starting Breakout Scanner local deployment..."

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

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Start the application
echo "🌐 Starting the application..."
npm run preview -- --port 3000

echo "✅ Breakout Scanner is now running locally at http://localhost:3000"
