import { ClassificationResult } from '../types';
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';

interface AIClassificationResponse {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  matchingRules?: string[];
  sicCode?: string;
  sicDescription?: string;
}

interface CacheEntry {
  result: AIClassificationResponse;
  timestamp: number;
}

// Time to live for cached classifications (24 hours in milliseconds)
const CACHE_TTL = 24 * 60 * 60 * 1000;

// In-memory cache for faster access during session
const inMemoryCache = new Map<string, CacheEntry>();

// Normalize payee name for consistent caching
function normalizeCacheKey(payeeName: string): string {
  // Normalize by: trimming whitespace, converting to lowercase,
  // removing punctuation, and extra spaces
  return payeeName
    .trim()
    .toLowerCase()
    .replace(/[.,&\/#!$%\^*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Save classification result to persistent storage
 */
function saveToCache(payeeName: string, result: AIClassificationResponse): void {
  try {
    const normalizedName = normalizeCacheKey(payeeName);
    const cacheEntry = {
      result,
      timestamp: Date.now()
    };
    
    // Save to in-memory cache
    inMemoryCache.set(normalizedName, cacheEntry);
    
    // Save to localStorage (with capacity management)
    const cachedClassifications = JSON.parse(localStorage.getItem('payeeClassifications') || '{}');
    
    // Remove oldest entries if we have too many (keep under 1000 entries)
    const keys = Object.keys(cachedClassifications);
    if (keys.length > 1000) {
      // Sort by timestamp and remove the oldest ones
      const oldestKeys = Object.entries(cachedClassifications)
        .sort((a, b) => (a[1] as CacheEntry).timestamp - (b[1] as CacheEntry).timestamp)
        .slice(0, keys.length - 900) // Remove oldest to keep around 900
        .map(entry => entry[0]);
        
      // Remove oldest entries
      oldestKeys.forEach(key => {
        delete cachedClassifications[key];
      });
    }
    
    // Add new entry
    cachedClassifications[normalizedName] = cacheEntry;
    localStorage.setItem('payeeClassifications', JSON.stringify(cachedClassifications));
  } catch (error) {
    console.warn('Failed to save classification to cache:', error);
  }
}

/**
 * Get classification result from cache
 */
function getFromCache(payeeName: string): AIClassificationResponse | null {
  try {
    const normalizedName = normalizeCacheKey(payeeName);
    
    // Try in-memory cache first (fastest)
    const memoryResult = inMemoryCache.get(normalizedName);
    if (memoryResult && Date.now() - memoryResult.timestamp < CACHE_TTL) {
      return memoryResult.result;
    }
    
    // Try localStorage if not in memory
    const cachedClassifications = JSON.parse(localStorage.getItem('payeeClassifications') || '{}');
    const entry = cachedClassifications[normalizedName] as CacheEntry | undefined;
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      // Update in-memory cache for faster access next time
      inMemoryCache.set(normalizedName, entry);
      return entry.result;
    }
  } catch (error) {
    console.warn('Failed to retrieve classification from cache:', error);
  }
  
  return null;
}

/**
 * Load cache from localStorage on initialization
 */
function loadCacheFromStorage(): void {
  try {
    const cachedClassifications = JSON.parse(localStorage.getItem('payeeClassifications') || '{}');
    
    // Filter out expired entries while loading
    const now = Date.now();
    Object.entries(cachedClassifications).forEach(([key, entry]) => {
      const typedEntry = entry as CacheEntry;
      if (now - typedEntry.timestamp < CACHE_TTL) {
        inMemoryCache.set(key, typedEntry);
      }
    });
    
    console.log(`Loaded ${inMemoryCache.size} cached classifications from storage`);
  } catch (error) {
    console.warn('Failed to load classifications from storage:', error);
  }
}

// Load cache when module initializes
loadCacheFromStorage();

/**
 * Enhanced AI classification using chain-of-thought reasoning and specific payee classification rules with SIC code determination
 * @param payeeName Name to classify
 * @returns Classification result with confidence, reasoning, and SIC code
 */
export async function enhancedClassifyPayeeWithAI(payeeName: string): Promise<AIClassificationResponse> {
  // Check cache first
  const cachedResult = getFromCache(payeeName);
  if (cachedResult) {
    console.log(`Using cached classification for "${payeeName}"`);
    return cachedResult;
  }
  
  const openai = getOpenAIClient();
  
  if (!openai) {
    throw new Error("OpenAI client is not initialized");
  }
  
  try {
    const prompt = `
You are a payee name classifier that determines if a name belongs to a business (organization) or an individual (person), and assigns SIC codes to businesses.

ANALYZE THE FOLLOWING NAME: "${payeeName}"

Classification Rules:
1. Legal entity suffixes like LLC, Inc, Ltd, GmbH, S.A., etc. indicate businesses
2. Words like Company, Corporation, Group, Partners, etc. indicate businesses
3. Government entities (City of, Department of, etc.) are businesses
4. First name + last name patterns typically indicate individuals
5. Professional titles (Dr, Mr, Mrs, etc.) indicate individuals
6. Name suffixes (Jr, Sr, III, etc.) indicate individuals
7. Consider cultural patterns for names across different languages/regions

SIC Code Rules for Businesses:
- Assign appropriate 4-digit SIC code based on apparent industry/business type
- Use SIC 7389 (Business Services, NEC) for unclear business types
- Government entities use SIC 9199 (General Government, NEC)
- Healthcare: 8011 (Offices of Physicians), 8021 (Offices of Dentists), etc.
- Retail: 5311 (Department Stores), 5411 (Grocery Stores), etc.
- Construction: 1521 (General Building Contractors), etc.
- Professional Services: 8111 (Legal Services), 8721 (Accounting Services), etc.

For Individuals: Do not assign SIC codes (leave null).

Step-by-step analysis:
`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system", 
          content: "You are an expert in payee name classification and SIC code assignment. You determine if a name belongs to a business entity or an individual person, and assign appropriate SIC codes to businesses based on their apparent industry."
        },
        { role: "user", content: prompt }
      ],
      functions: [
        {
          name: "classifyPayeeName",
          description: "Classify a payee name as either a business or individual and assign SIC code if business",
          parameters: {
            type: "object",
            properties: {
              classification: {
                type: "string",
                description: "The classification result",
                enum: ["Business", "Individual"]
              },
              confidence: {
                type: "number",
                description: "Confidence score (0-100) for the classification"
              },
              reasoning: {
                type: "string",
                description: "Brief reasoning for the classification decision, 25 words or less"
              },
              matchingRules: {
                type: "array",
                description: "List of rules that matched during classification",
                items: { type: "string" }
              },
              sicCode: {
                type: "string",
                description: "4-digit SIC code for businesses only, null for individuals"
              },
              sicDescription: {
                type: "string",
                description: "SIC code description for businesses only, null for individuals"
              }
            },
            required: ["classification", "confidence", "reasoning"]
          }
        }
      ],
      function_call: { name: "classifyPayeeName" }
    });
    
    const result = response.choices[0]?.message?.function_call?.arguments;
    
    if (!result) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    try {
      const parsedResult = JSON.parse(result) as AIClassificationResponse;
      
      // Validate SIC code format if provided
      if (parsedResult.sicCode && !/^\d{4}$/.test(parsedResult.sicCode)) {
        console.warn(`Invalid SIC code format "${parsedResult.sicCode}" for "${payeeName}", setting to null`);
        parsedResult.sicCode = undefined;
        parsedResult.sicDescription = undefined;
      }
      
      // Cache the result for future use
      saveToCache(payeeName, parsedResult);
      
      return {
        classification: parsedResult.classification,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning,
        matchingRules: parsedResult.matchingRules || [],
        sicCode: parsedResult.sicCode,
        sicDescription: parsedResult.sicDescription
      };
    } catch (error) {
      throw new Error("Failed to parse OpenAI API response");
    }
  } catch (error) {
    console.error("Error in AI classification:", error);
    throw error;
  }
}

/**
 * Consensus classification that runs multiple AI classifications and combines results with SIC codes
 */
export async function consensusClassification(
  payeeName: string,
  runs: number = 2
): Promise<AIClassificationResponse> {
  // Check cache first for quick return
  const cachedResult = getFromCache(payeeName);
  if (cachedResult) {
    console.log(`Using cached consensus classification for "${payeeName}"`);
    return cachedResult;
  }
  
  const classifications: AIClassificationResponse[] = [];
  
  // Run multiple classifications in parallel for better performance
  const promises = Array(runs).fill(0).map(() => 
    enhancedClassifyPayeeWithAI(payeeName).catch(error => {
      console.error(`Error in classification run:`, error);
      return null;
    })
  );
  
  // Await all classifications in parallel
  const results = await Promise.all(promises);
  
  // Filter out any failed runs
  for (const result of results) {
    if (result) {
      classifications.push(result);
    }
  }
  
  // If we couldn't get any successful classifications, throw an error
  if (classifications.length === 0) {
    throw new Error("All classification attempts failed");
  }
  
  // Count classifications for each category
  const businessCount = classifications.filter(c => c.classification === 'Business').length;
  const individualCount = classifications.filter(c => c.classification === 'Individual').length;
  
  // Calculate entropy to measure disagreement
  const totalRuns = businessCount + individualCount;
  const businessProb = businessCount / totalRuns;
  const individualProb = individualCount / totalRuns;
  
  // Get the majority classification
  const majorityClassification = businessCount > individualCount ? 'Business' : 'Individual';
  
  // Get median confidence for the majority classification
  const confidences = classifications
    .filter(c => c.classification === majorityClassification)
    .map(c => c.confidence)
    .sort((a, b) => a - b);
  
  const medianConfidence = confidences.length > 0 
    ? confidences[Math.floor(confidences.length / 2)]
    : 50;
  
  // Adjust confidence based on consensus level
  const consensusRatio = Math.max(businessCount, individualCount) / totalRuns;
  const adjustedConfidence = Math.round(medianConfidence * consensusRatio);
  
  // Get the most detailed reasoning or combine them
  const majorityReasoning = classifications.find(c => c.classification === majorityClassification)?.reasoning || "";
  
  // Collect all matching rules
  const allMatchingRules = new Set<string>();
  classifications.forEach(c => {
    c.matchingRules?.forEach(rule => allMatchingRules.add(rule));
  });
  
  // Get SIC code consensus for businesses
  let consensusSicCode: string | undefined;
  let consensusSicDescription: string | undefined;
  
  if (majorityClassification === 'Business') {
    const businessClassifications = classifications.filter(c => c.classification === 'Business');
    const sicCodes = businessClassifications
      .map(c => c.sicCode)
      .filter(code => code && /^\d{4}$/.test(code));
    
    if (sicCodes.length > 0) {
      // Use most common SIC code, or first one if tied
      const sicCodeCounts = sicCodes.reduce((acc, code) => {
        acc[code!] = (acc[code!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonSicCode = Object.entries(sicCodeCounts)
        .sort(([, a], [, b]) => b - a)[0][0];
      
      consensusSicCode = mostCommonSicCode;
      consensusSicDescription = businessClassifications
        .find(c => c.sicCode === mostCommonSicCode)?.sicDescription;
    }
  }
  
  const result: AIClassificationResponse = {
    classification: majorityClassification,
    confidence: adjustedConfidence,
    reasoning: `Consensus classification (${Math.round(consensusRatio * 100)}% agreement): ${majorityReasoning}`,
    matchingRules: Array.from(allMatchingRules),
    sicCode: consensusSicCode,
    sicDescription: consensusSicDescription
  };
  
  // Cache the consensus result
  saveToCache(payeeName, result);
  
  return result;
}

/**
 * Calculate Shannon entropy to measure classification disagreement
 */
function calculateEntropy(businessProb: number, individualProb: number): number {
  const calculateComponent = (p: number) => (p === 0) ? 0 : -p * Math.log2(p);
  return calculateComponent(businessProb) + calculateComponent(individualProb);
}
