import { v4 as uuidv4 } from 'uuid';

const STORAGE_PREFIX = 'secure_api_key_';

export function storeApiKey(apiKey) {
  try {
    const id = uuidv4();
    const token = uuidv4();
    
    const entry = {
      id,
      token,
      apiKey,
      created: Date.now(),
      lastUsed: Date.now()
    };
    
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));
    
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    tokenMap[token] = id;
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));
    
    return token;
  } catch (error) {
    productionLogger.error('Failed to store API key', { error: error?.message || error }, 'API_KEY_SERVICE');
    throw new Error('Failed to securely store API key');
  }
}

export function retrieveApiKey(token) {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      throw new Error('Invalid or expired token');
    }

    const entryData = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!entryData) {
      throw new Error('API key entry not found');
    }

    const entry = JSON.parse(entryData);
    
    if (entry.token !== token) {
      throw new Error('Token mismatch');
    }

    entry.lastUsed = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));

    return entry.apiKey;
  } catch (error) {
    productionLogger.error('Failed to retrieve API key', { error: error?.message || error }, 'API_KEY_SERVICE');
    throw new Error('Failed to retrieve API key');
  }
}

export function deleteApiKey(token) {
  try {
    if (!token) {
      return false;
    }

    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      return false;
    }

    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    
    delete tokenMap[token];
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));

    return true;
  } catch (error) {
    productionLogger.error('Failed to delete API key', { error: error?.message || error }, 'API_KEY_SERVICE');
    return false;
  }
}

export function hasStoredApiKey() {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const tokens = Object.keys(tokenMap);
    
    for (const token of tokens) {
      const id = tokenMap[token];
      const entryData = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      
      if (entryData) {
        const entry = JSON.parse(entryData);
        if (entry.apiKey && entry.token === token) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    productionLogger.error('Failed to check stored API key', { error: error?.message || error }, 'API_KEY_SERVICE');
    return false;
  }
}

export function getAllStoredTokens() {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    return Object.keys(tokenMap);
  } catch (error) {
    productionLogger.error('Failed to get stored tokens', { error: error?.message || error }, 'API_KEY_SERVICE');
    return [];
  }
}

export function cleanupExpiredKeys(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const now = Date.now();
    let cleanedCount = 0;

    Object.entries(tokenMap).forEach(([token, id]) => {
      const entryData = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (entryData) {
        const entry = JSON.parse(entryData);
        if (now - entry.lastUsed > maxAgeMs) {
          localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
          delete tokenMap[token];
          cleanedCount++;
        }
      } else {
        delete tokenMap[token];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));
      productionLogger.debug(`Cleaned up ${cleanedCount} expired API key entries`);
    }

    return cleanedCount;
  } catch (error) {
    productionLogger.error('Failed to cleanup expired keys', { error: error?.message || error }, 'API_KEY_SERVICE');
    return 0;
  }
}