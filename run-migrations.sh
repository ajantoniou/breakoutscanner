#!/bin/bash

# Run Supabase migrations
# Usage: ./run-migrations.sh

set -e

# Load environment variables if .env file exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
  exit 1
fi

echo "Running Supabase migrations..."

# Check if npx is installed
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install it with 'npm install -g npx'"
  exit 1
fi

# Install supabase-js if not already installed
if ! npm list @supabase/supabase-js &> /dev/null; then
  echo "Installing @supabase/supabase-js..."
  npm install @supabase/supabase-js
fi

echo "Running migrations..."

# Loop through migration files in order
for migration_file in $(ls -v supabase/migrations/*.sql); do
  echo "Running migration: $migration_file"
  
  # Use npx to run the migration
  npx supabase-js sql "$SUPABASE_URL" "$SUPABASE_SERVICE_ROLE_KEY" < "$migration_file"
  
  if [ $? -ne 0 ]; then
    echo "Error running migration: $migration_file"
    exit 1
  fi
  
  echo "Migration completed: $migration_file"
done

echo "All migrations completed successfully!" 