#!/bin/bash

# Seed the database with initial data using Supabase Edge Functions
# Usage: ./seed-db.sh [count]

set -e

count=${1:-20}

# Load environment variables if .env file exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
  exit 1
fi

echo "Seeding database with $count patterns..."

# Call the seed-patterns function
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"count\": $count}" \
  "$SUPABASE_URL/functions/v1/seed-patterns"

echo -e "\nDatabase seeding completed." 