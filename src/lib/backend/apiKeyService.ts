
import { v4 as uuidv4 } from 'uuid';
import { productionLogger } from '@/lib/logging';

interface StoredApiKey {
  id: string;
  token: string;
  apiKey: string;
  created: number;
  lastUsed: number;
}

// Secure localStorage prefix
const STORAGE_PREFIX = 'secure_api_key_';

/**
 * Securely store an API key and return a token for retrieving it
 * @param apiKey The API key to store
 * @returns A token that can be used to retrieve the key
 */
export function storeApiKey(apiKey: string): string {
  try {
    const id = uuidv4();
    const token = uuidv4();
    
    const entry: StoredApiKey = {
      id,
      token,
      apiKey,
      created: Date.now(),
      lastUsed: Date.now()
    };
    
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));
    
    // Store token reference for quick lookup
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    tokenMap[token] = id;
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));
    
    return token;
  } catch (error) {
    productionLogger.error('Failed to store API key', { error: error.message }, 'API_KEY_SERVICE');
    throw new Error('Failed to securely store API key');
  }
}

/**
 * Retrieve an API key using a token
 * @param token The token used to retrieve the key
 * @returns The API key or null if not found
 */
export function getApiKey(token: string): string | null {
  try {
    // Look up the ID from the token map
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      productionLogger.warn('Token not found in token map', null, 'API_KEY_SERVICE');
      return null;
    }
    
    // Get the stored key entry
    const storedEntry = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!storedEntry) {
      productionLogger.warn('Stored API key entry not found', null, 'API_KEY_SERVICE');
      return null;
    }
    
    const entry: StoredApiKey = JSON.parse(storedEntry);
    
    // Verify the token matches
    if (entry.token !== token) {
      productionLogger.warn('Token mismatch in stored entry', null, 'API_KEY_SERVICE');
      return null;
    }
    
    // Update last used time
    entry.lastUsed = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));
    
    return entry.apiKey;
  } catch (error) {
    productionLogger.error('Failed to retrieve API key', { error: error.message }, 'API_KEY_SERVICE');
    return null;
  }
}

/**
 * Check if a saved API key token exists
 */
export function hasSavedApiKey(): boolean {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    return Object.keys(tokenMap).length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a stored API key
 */
export function deleteApiKey(token: string): boolean {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      return false;
    }
    
    // Remove the stored key
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    
    // Remove from token map
    delete tokenMap[token];
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));
    
    return true;
  } catch (error) {
    productionLogger.error('Failed to delete API key', { error: error.message }, 'API_KEY_SERVICE');
    return false;
  }
}

/**
 * Get all stored API key metadata (without exposing the keys themselves)
 */
export function getStoredApiKeyMetadata(): Array<{id: string, created: number, lastUsed: number}> {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    
    return Object.values(tokenMap).map(id => {
      const entry: StoredApiKey = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${id}`) || '{}');
      return {
        id: entry.id,
        created: entry.created,
        lastUsed: entry.lastUsed
      };
    });
  } catch (error) {
    productionLogger.error('Failed to get API key metadata', { error: error.message }, 'API_KEY_SERVICE');
    return [];
  }
}
