# Supabase Environment Variables Guide

This guide explains how to set up the required environment variables for the Breakout Scanner application on Vercel.

## Required Environment Variables

The Breakout Scanner requires the following environment variables to connect to Supabase:

1. `VITE_SUPABASE_URL` - Your Supabase project URL
2. `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Setting Up Environment Variables on Vercel

1. After deploying your project to Vercel, go to your project dashboard
2. Click on the "Settings" tab
3. In the left sidebar, click on "Environment Variables"
4. Add the following environment variables:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://your-supabase-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` |

5. Click "Save" to apply the changes
6. Redeploy your application for the changes to take effect

## Finding Your Supabase Credentials

1. Log in to your Supabase dashboard at https://app.supabase.io
2. Select your project
3. Go to Project Settings > API
4. Under "Project API keys", you'll find:
   - Project URL: This is your `VITE_SUPABASE_URL`
   - anon public: This is your `VITE_SUPABASE_ANON_KEY`

## Testing Authentication

After setting up the environment variables and redeploying:

1. Visit your deployed application
2. Try to log in with the demo credentials:
   - Email: demo@breakoutscanner.com
   - Password: Demo123!

If authentication works correctly, you should be able to access the protected routes in the application.

## Troubleshooting

If you encounter authentication issues:

1. Check that the environment variables are correctly set in Vercel
2. Ensure that the Supabase project is active and the API is accessible
3. Verify that the authentication service in your Supabase project is enabled
4. Check the browser console for any error messages related to Supabase authentication
