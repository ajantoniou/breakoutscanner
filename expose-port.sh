#!/bin/bash

# Expose port script for Breakout Scanner
# This script exposes the application on a public URL for testing

echo "🌐 Exposing Breakout Scanner on a public URL..."

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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env file with necessary environment variables if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔑 Setting up environment variables..."
    cat > .env << EOL
VITE_POLYGON_API_KEY=${POLYGON_API_KEY:-"onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI"}
VITE_SUPABASE_URL=${SUPABASE_URL:-"https://ttmeplqmrjhysyqzuaoh.supabase.co"}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bWVwbHFtcmpoeXN5cXp1YW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyMTU0NzAsImV4cCI6MjA1ODc5MTQ3MH0.38s2h7dvsOPYk_CmC8dS2h3VSCDClezIlQ4VgBFn2Ek"}
VITE_APP_VERSION="1.0.0"
VITE_APP_NAME="Breakout Scanner"
EOL
fi

# Start development server
echo "🚀 Starting development server..."
npm run dev -- --host 0.0.0.0 --port 3000 &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Expose port using deploy_expose_port tool
echo "🔗 Exposing port 3000 to public URL..."
PUBLIC_URL=$(deploy_expose_port 3000)

if [ -z "$PUBLIC_URL" ]; then
    echo "❌ Failed to expose port. Using local URL instead."
    PUBLIC_URL="http://localhost:3000"
else
    echo "✅ Port exposed successfully!"
fi

echo "🌐 Breakout Scanner is now available at: $PUBLIC_URL"
echo "📝 Use the following credentials to log in:"
echo "   Email: demo@breakoutscanner.com"
echo "   Password: Demo123!"
echo ""
echo "⚠️ Press Ctrl+C to stop the server and close the public URL"

# Wait for user to press Ctrl+C
trap "kill $SERVER_PID; echo '🛑 Server stopped.'; exit 0" INT
wait $SERVER_PID
