/**
 * Deploy Supabase Edge Functions using Management API
 * Usage: node deploy-functions-api.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if required environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Get project ID from config.toml
let projectId;
try {
  const configToml = fs.readFileSync(path.join(__dirname, 'supabase', 'config.toml'), 'utf8');
  const match = configToml.match(/project_id\s*=\s*"([^"]+)"/);
  if (match) {
    projectId = match[1];
  } else {
    throw new Error('Could not find project_id in config.toml');
  }
} catch (err) {
  console.error('Error reading project ID:', err.message);
  process.exit(1);
}

async function deployFunction(functionName) {
  console.log(`Deploying function: ${functionName}`);
  
  // Read function source code
  const functionDir = path.join(__dirname, 'supabase', 'functions', functionName);
  const indexPath = path.join(functionDir, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`Error: Function file not found at ${indexPath}`);
    return false;
  }
  
  const functionCode = fs.readFileSync(indexPath, 'utf8');
  
  // Check for import files
  const importMatches = Array.from(functionCode.matchAll(/import.*from\s+['"](.+)['"]/g));
  let imports = {};
  
  for (const match of importMatches) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      // Local import
      const localPath = path.join(path.dirname(indexPath), importPath);
      const resolvedPath = localPath.endsWith('.ts') ? localPath : `${localPath}.ts`;
      
      if (fs.existsSync(resolvedPath)) {
        const relativePath = path.relative(functionDir, resolvedPath);
        imports[relativePath] = fs.readFileSync(resolvedPath, 'utf8');
      }
    }
  }
  
  // Prepare payload for API
  const payload = {
    slug: functionName,
    verify_jwt: false,
    body: functionCode,
    imports: imports
  };
  
  try {
    // Call Supabase Management API to deploy function
    const response = await fetch(`https://api.supabase.io/v1/projects/${projectId}/functions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Error deploying function: ${error}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`Function ${functionName} deployed successfully!`);
    return true;
  } catch (err) {
    console.error('Error deploying function:', err.message);
    return false;
  }
}

async function main() {
  console.log(`Deploying functions for project: ${projectId}`);
  
  // Deploy seed-patterns function
  const success = await deployFunction('seed-patterns');
  
  if (success) {
    console.log('All functions deployed successfully!');
  } else {
    console.error('There were errors deploying functions');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 