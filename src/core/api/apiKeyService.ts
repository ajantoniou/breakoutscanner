/**
 * API Key service for handling API keys across the application
 */

import { toast } from "sonner";

// Default API key from environment variables
const DEFAULT_API_KEY = import.meta.env.VITE_POLYGON_API_KEY || '';

// API key configuration type
export interface ApiKeyConfig {
  key: string;
  provider: string;
  isPremium: boolean;
}

// Initial API key config
export const initialApiKeyConfig: ApiKeyConfig = {
  key: DEFAULT_API_KEY,
  provider: 'polygon',
  isPremium: false
};

/**
 * Load the API key configuration from local storage
 */
export function loadApiKeyConfig(): ApiKeyConfig {
  try {
    const storedConfig = localStorage.getItem('apiKeyConfig');
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }
  } catch (e) {
    console.error('Error loading API key config:', e);
  }
  
  return initialApiKeyConfig;
}

/**
 * Update the API key configuration
 */
export function updateApiKey(key: string, isPremium: boolean = false): ApiKeyConfig {
  const newConfig = {
    key,
    provider: 'polygon',
    isPremium
  };
  
  try {
    localStorage.setItem('apiKeyConfig', JSON.stringify(newConfig));
    toast.success('API key updated successfully');
  } catch (e) {
    console.error('Error saving API key config:', e);
    toast.error('Failed to update API key');
  }
  
  return newConfig;
}

/**
 * Check if the API key configuration is valid
 */
export function isApiKeyConfigValid(config: ApiKeyConfig): boolean {
  return !!config.key && config.key.length > 0;
}

// Export the DEFAULT_API_KEY for direct use
export { DEFAULT_API_KEY }; 