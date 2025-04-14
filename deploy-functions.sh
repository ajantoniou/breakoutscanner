#!/bin/bash

# Deploy Supabase Edge Functions
# Usage: ./deploy-functions.sh

set -e

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI is not installed."
  echo "Please install it with: npm install -g supabase"
  exit 1
fi

# Load environment variables if .env file exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
  exit 1
fi

# Deploy all Edge Functions
echo "Deploying Supabase Edge Functions..."
cd supabase
supabase functions deploy seed-patterns --project-ref $(grep project_id config.toml | cut -d '"' -f2) --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "Edge Functions deployed successfully."
else
  echo "Error deploying Edge Functions."
  exit 1
fi 