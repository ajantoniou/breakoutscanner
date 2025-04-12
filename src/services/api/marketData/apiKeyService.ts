import { toast } from 'sonner';

// API Key Management

export interface ApiKeyConfig {
  key: string;
  provider: string;
  isPremium: boolean;
}

// Default API key - will be used as a fallback if no key is provided
// **NOT RECOMMENDED FOR PRODUCTION** Use VITE_POLYGON_API_KEY instead.
export const DEFAULT_API_KEY = 'onEimwzRMEYR2FhgLVBZnAmyz9EC8KfI';

// Get API key config, prioritizing environment variables, then local storage, then fallback.
export const getApiKey = (): ApiKeyConfig | null => {
  const envApiKey = import.meta.env.VITE_POLYGON_API_KEY;
  
  if (envApiKey) {
    console.log("[getApiKey] Using API key from environment variable.");
    return { key: envApiKey, provider: 'Polygon.io', isPremium: true }; // Assume premium if env var is set
  }
  
  try {
    const storedKeyData = localStorage.getItem('market_api_key');
    if (storedKeyData) {
      console.log("[getApiKey] Using API key from local storage.");
      // Ensure parsing works and provides a valid structure
      const parsedConfig = JSON.parse(storedKeyData);
      if (parsedConfig && typeof parsedConfig.key === 'string') {
        return parsedConfig; 
      }
      localStorage.removeItem('market_api_key'); // Remove invalid data
    }
  } catch (error) {
    console.error('[getApiKey] Error parsing API key from localStorage:', error);
    localStorage.removeItem('market_api_key'); // Remove invalid data on parse error
  }
  
  // Display toast warning in production about missing API key
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    toast.warning(
      "No API key configured", 
      { 
        description: "Please set a Polygon.io API key to fetch market data. Click the key icon in the header.",
        duration: 8000
      }
    );
  }
  
  // Only use fallback if nothing else is available
  console.warn("[getApiKey] Using fallback API key. This will NOT work in production. Set VITE_POLYGON_API_KEY environment variable.");
  return { key: DEFAULT_API_KEY, provider: 'Polygon.io', isPremium: false }; // Mark fallback as non-premium
};

// Store API key config in local storage
export const storeApiKey = (config: ApiKeyConfig): void => {
  try {
    const envApiKey = import.meta.env.VITE_POLYGON_API_KEY;
    if (envApiKey && config.key === envApiKey) {
        // If the key matches the env var, don't store it, rely on env var.
        localStorage.removeItem('market_api_key'); 
        toast.success("Using Environment API Key", { description: "API key is set via environment variable." });
        return;
    }
    localStorage.setItem('market_api_key', JSON.stringify(config));
    
    toast.success("API key saved", {
      description: config.isPremium ? "Premium API key configured successfully" : "API key saved (free tier)"
    });
  } catch (error) {
    console.error('Error storing API key in localStorage:', error);
    toast.error("Failed to save API key", {
      description: "Check browser storage permissions"
    });
  }
};

// Track last API key validation to prevent excessive calls
let lastValidationTime = 0;
const VALIDATION_COOLDOWN = 60000; // 1 minute cooldown between validations

// Get stored API key string, prioritizing environment variable
export const getStoredApiKey = (): string => {
  const apiKeyConfig = getApiKey(); // Use the prioritized getter
  return apiKeyConfig ? apiKeyConfig.key : ''; // Return empty string if no key found
};

// Validate API key against the API with rate limiting
export const validateApiKey = async (apiKey: string): Promise<{ usage: string; isValid: boolean } | false> => {
  if (!apiKey) {
      console.error("[validateApiKey] Cannot validate empty API key.");
      return false;
  }

  const now = Date.now();
  // Skip validation if we've validated recently
  if (now - lastValidationTime < VALIDATION_COOLDOWN) {
    console.log('[validateApiKey] Skipping API key validation (cooldown active)');
    // Assume key is valid to avoid unnecessary API calls, but usage unknown
    return { isValid: true, usage: 'Unknown (Cooldown)' }; 
  }

  console.log(`[validateApiKey] Attempting validation for key ending in ...${apiKey.slice(-4)}`);
  lastValidationTime = now; // Update timestamp before API call
  
  try {
    const response = await checkApiKeyStatus(apiKey);
    console.log(`[validateApiKey] Validation check returned: ${JSON.stringify(response)}`);
    return response.isValid 
      ? { isValid: true, usage: response.isPremium ? 'Unlimited' : 'Free' } 
      : false;
  } catch (error) {
    console.error('[validateApiKey] Error during validation check:', error);
    return false; // Ensure false is returned on error
  }
};

// Check API key status with a timeout
export const checkApiKeyStatus = async (apiKey: string): Promise<{ isValid: boolean; isPremium: boolean }> => {
  if (!apiKey) {
    console.error("[checkApiKeyStatus] Cannot check status of empty API key.");
    return { isValid: false, isPremium: false };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
      console.warn('[checkApiKeyStatus] Request timed out after 5 seconds.');
      controller.abort();
  }, 5000); // 5 second timeout

  try {
    const url = `https://api.polygon.io/v3/reference/tickers/AAPL?apiKey=${apiKey}`;
    console.log(`[checkApiKeyStatus] Fetching URL: ${url.replace(apiKey, '***')}`); // Log URL without key
    
    const response = await fetch(url, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    console.log(`[checkApiKeyStatus] Received response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[checkApiKeyStatus] API key validation failed with status: ${response.status}`);
      if (response.status === 401) {
        toast.error("Invalid Polygon.io API Key", {
          description: "You need a valid API key to use Pattern Scanner. Visit polygon.io to register for a free key.",
          duration: 10000
        });
      }
      // Add a generic toast for other non-OK errors
      else {
          toast.error("API Key Check Failed", {
            description: `Received status ${response.status} while validating key.`
          });
      }
      return { isValid: false, isPremium: false }; // Explicitly return invalid on non-OK status
    }
    
    // If the request was successful, the key is valid.
    toast.success("API key validated", { 
      description: "Polygon API key is valid and ready to use"
    });
    console.log('[checkApiKeyStatus] API key is valid.');
    return { 
      isValid: true, 
      isPremium: true // Assume premium as discussed
    };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // Timeout occurred
      toast.error("API Key Validation Timeout", {
        description: "Could not validate the API key within 5 seconds. Check network or try again."
      });
      return { isValid: false, isPremium: false }; // Return invalid on timeout
    } else {
      // Network or other fetch error
      console.error('[checkApiKeyStatus] Network or fetch error during validation:', error);
      toast.error("API Key Validation Error", {
        description: "An error occurred while trying to validate the key. Check network connection."
      });
      return { isValid: false, isPremium: false }; // Return invalid on other fetch errors
    }
  }
};
