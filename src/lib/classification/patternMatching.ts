
/**
 * Check if a keyword matches as a whole word in the text
 */
export function isWholeWordMatch(text: string, keyword: string): boolean {
  // Create a regex pattern with word boundaries
  // \b ensures the keyword is matched as a complete word, not part of another word
  const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const matches = pattern.test(text);
  
  console.log(`[WHOLE WORD MATCH DEBUG] Testing "${keyword}" in "${text}"`);
  console.log(`[WHOLE WORD MATCH DEBUG] Pattern: ${pattern.toString()}`);
  console.log(`[WHOLE WORD MATCH DEBUG] Result: ${matches}`);
  
  return matches;
}

/**
 * Test the regex pattern construction with common cases
 */
export function testRegexPatterns() {
  console.log(`[REGEX TEST] Testing regex pattern construction...`);
  
  const testCases = [
    { text: "BANK OF AMERICA", keyword: "BANK", expected: true },
    { text: "BANKRUPT CORP", keyword: "BANK", expected: false },
    { text: "CITIBANK", keyword: "BANK", expected: true },
    { text: "AMERICAN EXPRESS", keyword: "AMERICAN", expected: true },
    { text: "AMERICAN", keyword: "AMERICAN", expected: true }
  ];
  
  testCases.forEach(({ text, keyword, expected }) => {
    const result = isWholeWordMatch(text, keyword);
    const status = result === expected ? "✅ PASS" : "❌ FAIL";
    console.log(`[REGEX TEST] ${status} "${keyword}" in "${text}" - Expected: ${expected}, Got: ${result}`);
  });
}

/**
 * Test the normalization process
 */
export function testNormalization() {
  console.log(`[NORMALIZATION TEST] Testing text normalization...`);
  
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
    const { normalized, tokens } = advancedNormalization(testCase);
    console.log(`[NORMALIZATION TEST] "${testCase}" -> "${normalized}"`);
    console.log(`[NORMALIZATION TEST] Tokens: [${tokens.join(', ')}]`);
  });
}
