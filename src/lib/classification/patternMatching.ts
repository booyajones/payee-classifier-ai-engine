
/**
 * Check if a keyword matches as a whole word in the text
 */
export function isWholeWordMatch(text: string, keyword: string): boolean {
  // Escape special regex characters in the keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create a regex pattern with word boundaries
  // \b ensures the keyword is matched as a complete word, not part of another word
  const pattern = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
  const matches = pattern.test(text);
  
  productionLogger.debug(`[WHOLE WORD MATCH DEBUG] Testing "${keyword}" in "${text}"`);
  productionLogger.debug(`[WHOLE WORD MATCH DEBUG] Escaped: "${escapedKeyword}"`);
  productionLogger.debug(`[WHOLE WORD MATCH DEBUG] Pattern: ${pattern.toString()}`);
  productionLogger.debug(`[WHOLE WORD MATCH DEBUG] Result: ${matches}`);
  
  return matches;
}

/**
 * Test the regex pattern construction with common cases
 */
export function testRegexPatterns() {
  productionLogger.debug(`[REGEX TEST] Testing regex pattern construction...`);
  
  const testCases = [
    { text: "BANK OF AMERICA", keyword: "BANK", expected: true },
    { text: "BANK OF AMERICA", keyword: "BANK OF AMERICA", expected: true },
    { text: "BANKRUPT CORP", keyword: "BANK", expected: false },
    { text: "CITIBANK", keyword: "BANK", expected: true },
    { text: "AMERICAN EXPRESS", keyword: "AMERICAN", expected: true },
    { text: "AMERICAN", keyword: "AMERICAN", expected: true }
  ];
  
  testCases.forEach(({ text, keyword, expected }) => {
    const result = isWholeWordMatch(text, keyword);
    const status = result === expected ? "✅ PASS" : "❌ FAIL";
    productionLogger.debug(`[REGEX TEST] ${status} "${keyword}" in "${text}" - Expected: ${expected}, Got: ${result}`);
  });
}

/**
 * Test the normalization process
 */
export function testNormalization() {
  productionLogger.debug(`[NORMALIZATION TEST] Testing text normalization...`);
  
  const testCases = [
    "Bank of America",
    "BANK OF AMERICA", 
    "bank of america",
    "American Express",
    "Chase Bank",
    "Wells Fargo & Co."
  ];
  
  testCases.forEach(testCase => {
    const { advancedNormalization } = require('./stringMatching');
    const result = advancedNormalization(testCase);
    productionLogger.debug(`[NORMALIZATION TEST] "${testCase}" -> "${result.normalized}"`);
    productionLogger.debug(`[NORMALIZATION TEST] Tokens: [${result.tokens.join(', ')}]`);
  });
}
