# Breakout Scanner Deployment Documentation

## Overview

This document provides comprehensive instructions for deploying the Breakout Scanner application to a public website with password protection. The Breakout Scanner is a sophisticated tool for detecting and predicting stock market breakouts with high confidence.

## Prerequisites

Before deploying the application, ensure you have the following:

1. **API Keys**:
   - Polygon.io API key (for market data)
   - Supabase project URL and anonymous key (for database and authentication)

2. **Development Environment**:
   - Node.js (v16 or higher)
   - npm (v7 or higher)
   - Git

3. **Deployment Platform** (one of the following):
   - Vercel account (recommended)
   - Netlify account
   - Custom server with Node.js installed

## Deployment Options

### Option 1: Vercel Deployment (Recommended)

Vercel provides the easiest deployment experience with automatic CI/CD and preview deployments.

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy using the script**:
   ```bash
   ./deploy-production.sh
   ```

4. **Set Environment Variables in Vercel Dashboard**:
   - VITE_POLYGON_API_KEY: Your Polygon.io API key
   - VITE_SUPABASE_URL: Your Supabase project URL
   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key

### Option 2: Manual Deployment

If you prefer to deploy manually or to a different platform:

1. **Build the application**:
   ```bash
   npm install
   npm run build
   ```

2. **Deploy the `dist` directory** to your hosting provider of choice.

3. **Set Environment Variables** on your hosting platform:
   - VITE_POLYGON_API_KEY: Your Polygon.io API key
   - VITE_SUPABASE_URL: Your Supabase project URL
   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key

## Supabase Configuration

The application uses Supabase for database storage and authentication. Follow these steps to configure Supabase:

1. **Create a Supabase Project** at [supabase.com](https://supabase.com)

2. **Enable Authentication**:
   - Go to Authentication → Settings
   - Enable Email/Password sign-in method
   - Configure email templates for confirmation emails

3. **Database Setup**:
   - The application will automatically create the necessary tables on first run
   - Alternatively, you can run the SQL scripts in the `database` directory

4. **Security Rules**:
   - Configure Row Level Security (RLS) policies for the `patterns` and `backtest_results` tables
   - Ensure only authenticated users can access the data

## Password Protection

The application includes built-in password protection using Supabase Authentication:

1. **User Registration**:
   - Users can register through the `/register` route
   - Email verification is required by default

2. **Admin Access**:
   - To grant admin access to a user, update their `role` in Supabase:
     ```sql
     UPDATE auth.users
     SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
     WHERE email = 'admin@example.com';
     ```

3. **Protected Routes**:
   - All routes except `/login` and `/register` are protected
   - Admin-only routes require the user to have the admin role

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Ensure your Polygon.io API key is valid and has the necessary permissions
   - Check that the environment variables are correctly set

2. **Database Connection Issues**:
   - Verify your Supabase URL and anonymous key
   - Check the Supabase dashboard for any service disruptions

3. **Deployment Failures**:
   - Check the build logs for any errors
   - Ensure all dependencies are correctly installed

### Support

If you encounter any issues not covered in this documentation, please:

1. Check the console logs in your browser's developer tools
2. Review the server logs in your deployment platform
3. Contact support at support@breakoutscanner.com

## Updating the Application

To update the application to a new version:

1. Pull the latest changes from the repository
2. Run the deployment script again:
   ```bash
   ./deploy-production.sh
   ```

## Security Considerations

1. **API Keys**: Never expose your API keys in client-side code
2. **Authentication**: Regularly review user accounts and access patterns
3. **Data Protection**: Implement proper backups of your Supabase database

## Performance Optimization

The application is configured for optimal performance with:

1. **Code Splitting**: Reduces initial load time
2. **Asset Optimization**: Minimizes CSS and JavaScript
3. **Caching**: Implements proper caching strategies for API responses

By following this documentation, you should be able to successfully deploy the Breakout Scanner application to a public website with password protection.
