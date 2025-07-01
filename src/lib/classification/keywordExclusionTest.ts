import { checkEnhancedKeywordExclusion as checkKeywordExclusion } from './enhancedExclusionLogic';
import { quickSimilarityTest } from './stringMatching';

/**
 * Quick test function for debugging
 */
export function quickTest(payeeName: string): void {
  console.log(`\n[QUICK TEST] Running quick test for: "${payeeName}"\n`);
  const result = checkKeywordExclusion(payeeName);
  console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
  console.log(`Confidence: ${result.confidence}%`);
  console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
  console.log(`Reasoning: ${result.reasoning}`);
  console.log('\n[QUICK TEST] Quick test complete!\n');
}

/**
 * Test function to validate keyword exclusion logic
 */
export function testKeywordExclusion(): void {
  console.log('[KEYWORD EXCLUSION TEST] Running comprehensive test suite...\n');

  const testCases = [
    { name: 'Bank of America', expected: true },
    { name: 'PNC Bank', expected: true },
    { name: 'First National Bank', expected: true },
    { name: 'Chase Bank', expected: true },
    { name: 'Wells Fargo', expected: true },
    { name: 'Citibank', expected: true },
    { name: 'USAA', expected: true },
    { name: 'SunTrust Bank', expected: true },
    { name: 'TD Bank', expected: true },
    { name: 'Capital One', expected: true },
    { name: 'Fifth Third Bank', expected: true },
    { name: 'Regions Bank', expected: true },
    { name: 'M&T Bank', expected: true },
    { name: 'KeyBank', expected: true },
    { name: 'Silicon Valley Bank', expected: true },
    { name: 'Charles Schwab', expected: true },
    { name: 'Fidelity Investments', expected: true },
    { name: 'Edward Jones', expected: true },
    { name: 'Morgan Stanley', expected: true },
    { name: 'Merrill Lynch', expected: true },
    { name: 'Goldman Sachs', expected: true },
    { name: 'JP Morgan', expected: true },
    { name: 'UBS', expected: true },
    { name: 'Credit Suisse', expected: true },
    { name: 'Deutsche Bank', expected: true },
    { name: 'Barclays', expected: true },
    { name: 'HSBC', expected: true },
    { name: 'BNP Paribas', expected: true },
    { name: 'Societe Generale', expected: true },
    { name: 'Credit Agricole', expected: true },
    { name: 'ING Group', expected: true },
    { name: 'Lloyds Banking Group', expected: true },
    { name: 'Royal Bank of Scotland', expected: true },
    { name: 'Santander', expected: true },
    { name: 'Intesa Sanpaolo', expected: true },
    { name: 'Unicredit', expected: true },
    { name: 'Banco Bilbao Vizcaya Argentaria', expected: true },
    { name: 'Sumitomo Mitsui Financial Group', expected: true },
    { name: 'Mitsubishi UFJ Financial Group', expected: true },
    { name: 'Mizuho Financial Group', expected: true },
    { name: 'China Construction Bank', expected: true },
    { name: 'Agricultural Bank of China', expected: true },
    { name: 'Industrial and Commercial Bank of China', expected: true },
    { name: 'Bank of China', expected: true },
    { name: 'HSBC Holdings', expected: true },
    { name: 'Toronto-Dominion Bank', expected: true },
    { name: 'Royal Bank of Canada', expected: true },
    { name: 'Bank of Nova Scotia', expected: true },
    { name: 'Bank of Montreal', expected: true },
    { name: 'Canadian Imperial Bank of Commerce', expected: true },
    { name: 'National Bank of Canada', expected: true },
    { name: 'Desjardins Group', expected: true },
    { name: 'Laurentian Bank of Canada', expected: true },
    { name: 'Manulife Financial Corporation', expected: true },
    { name: 'Sun Life Financial', expected: true },
    { name: 'Great-West Lifeco', expected: true },
    { name: 'Power Corporation of Canada', expected: true },
    { name: 'Fairfax Financial Holdings', expected: true },
    { name: 'Brookfield Asset Management', expected: true },
    { name: 'George Smith', expected: false },
    { name: 'Acme Corp', expected: true },
    { name: 'John Doe', expected: false },
    { name: 'Jane Smith', expected: false },
    { name: 'Robert Jones', expected: false },
    { name: 'Emily White', expected: false },
    { name: 'Michael Brown', expected: false },
    { name: 'Linda Davis', expected: false },
    { name: 'David Wilson', expected: false },
    { name: 'Barbara Garcia', expected: false },
    { name: 'Richard Rodriguez', expected: false },
    { name: 'Susan Williams', expected: false },
    { name: 'Joseph Martinez', expected: false },
    { name: 'Thomas Anderson', expected: false },
    { name: 'Charles Taylor', expected: false },
    { name: 'Christopher Moore', expected: false },
    { name: 'Daniel Jackson', expected: false },
    { name: 'Matthew White', expected: false },
    { name: 'Anthony Harris', expected: false },
    { name: 'Donald Martin', expected: false },
    { name: 'Paul Thompson', expected: false },
    { name: 'Andrew Garcia', expected: false },
    { name: 'Kenneth Martinez', expected: false },
    { name: 'Joshua Anderson', expected: false },
    { name: 'Kevin Taylor', expected: false },
    { name: 'Brian Moore', expected: false },
    { name: 'Timothy Jackson', expected: false },
    { name: 'Ronald White', expected: false },
    { name: 'Stephen Harris', expected: false },
    { name: 'Edward Martin', expected: false },
    { name: 'Jason Thompson', expected: false },
    { name: 'Jeffrey Garcia', expected: false },
    { name: 'Ryan Martinez', expected: false },
    { name: 'Gary Anderson', expected: false },
    { name: 'Nicholas Taylor', expected: false },
    { name: 'Eric Moore', expected: false },
    { name: 'Dennis Jackson', expected: false },
    { name: 'Walter White', expected: false },
    { name: 'Brandon Harris', expected: false },
    { name: 'Philip Martin', expected: false },
    { name: 'Adam Thompson', expected: false },
    { name: 'Ikea', expected: true },
    { name: 'Target', expected: true },
    { name: 'Walmart', expected: true },
    { name: 'Costco', expected: true },
    { name: 'Kroger', expected: true },
    { name: 'Walgreens', expected: true },
    { name: 'CVS', expected: true },
    { name: 'Home Depot', expected: true },
    { name: 'Lowes', expected: true },
    { name: 'Best Buy', expected: true },
    { name: 'Macys', expected: true },
    { name: 'Nordstrom', expected: true },
    { name: 'Sears', expected: true },
    { name: 'JCPenney', expected: true },
    { name: 'Kohls', expected: true },
    { name: 'Gap', expected: true },
    { name: 'Old Navy', expected: true },
    { name: 'Banana Republic', expected: true },
    { name: 'Zara', expected: true },
    { name: 'H&M', expected: true },
    { name: 'Forever 21', expected: true },
    { name: 'Urban Outfitters', expected: true },
    { name: 'American Eagle', expected: true },
    { name: 'Abercrombie & Fitch', expected: true },
    { name: 'Victoria\'s Secret', expected: true },
    { name: 'Bath & Body Works', expected: true },
    { name: 'Bed Bath & Beyond', expected: true },
    { name: 'Williams Sonoma', expected: true },
    { name: 'Pottery Barn', expected: true },
    { name: 'Crate & Barrel', expected: true },
    { name: 'Sur La Table', expected: true },
    { name: 'REI', expected: true },
    { name: 'Dick\'s Sporting Goods', expected: true },
    { name: 'Foot Locker', expected: true },
    { name: 'Nike', expected: true },
    { name: 'Adidas', expected: true },
    { name: 'Under Armour', expected: true },
    { name: 'Lululemon', expected: true },
    { name: 'Starbucks', expected: true },
    { name: 'McDonald\'s', expected: true },
    { name: 'Burger King', expected: true },
    { name: 'Subway', expected: true },
    { name: 'Pizza Hut', expected: true },
    { name: 'Dominos', expected: true },
    { name: 'Taco Bell', expected: true },
    { name: 'KFC', expected: true },
    { name: 'Wendy\'s', expected: true },
    { name: 'Dunkin\' Donuts', expected: true },
    { name: 'Chipotle', expected: true },
    { name: 'Panera Bread', expected: true },
    { name: 'Olive Garden', expected: true },
    { name: 'Red Lobster', expected: true },
    { name: 'Applebees', expected: true },
    { name: 'Chilis', expected: true },
    { name: 'Outback Steakhouse', expected: true },
    { name: 'Cracker Barrel', expected: true },
    { name: 'Denny\'s', expected: true },
    { name: 'IHOP', expected: true },
    { name: 'Bob Evans', expected: true },
    { name: 'Waffle House', expected: true },
    { name: 'Perkins Restaurant', expected: true },
    { name: 'Golden Corral', expected: true },
    { name: 'Sizzler', expected: true },
    { name: 'Ponderosa Steakhouse', expected: true },
    { name: 'Ryan\'s Steakhouse', expected: true },
    { name: 'Old Country Buffet', expected: true },
    { name: 'Sweet Tomatoes', expected: true },
    { name: 'Souplantation', expected: true },
    { name: 'Boston Market', expected: true },
    { name: 'Popeyes', expected: true },
    { name: 'Arbys', expected: true },
    { name: 'Hardee\'s', expected: true },
    { name: 'Carl\'s Jr', expected: true },
    { name: 'Jack in the Box', expected: true },
    { name: 'Sonic Drive-In', expected: true },
    { name: 'Dairy Queen', expected: true },
    { name: 'Baskin-Robbins', expected: true },
    { name: 'Ben & Jerry\'s', expected: true },
    { name: 'Cold Stone Creamery', expected: true },
    { name: 'Haagen-Dazs', expected: true },
    { name: 'TCBY', expected: true },
    { name: 'Yogurtland', expected: true },
    { name: 'Pinkberry', expected: true },
    { name: 'Menchie\'s', expected: true },
    { name: 'Red Mango', expected: true },
    { name: 'Sweet Frog', expected: true },
    { name: 'Orange Leaf', expected: true },
    { name: '16 Handles', expected: true },
    { name: 'The Cheesecake Factory', expected: true },
    { name: 'PF Changs', expected: true },
    { name: 'BJ\'s Restaurant', expected: true },
    { name: 'Yard House', expected: true },
    { name: 'Buffalo Wild Wings', expected: true },
    { name: 'Dave & Buster\'s', expected: true },
    { name: 'Topgolf', expected: true },
    { name: 'Main Event', expected: true },
    { name: 'Chuck E Cheese', expected: true },
    { name: 'Sky Zone', expected: true },
    { name: 'Urban Air', expected: true },
    { name: 'Altitude Trampoline Park', expected: true },
    { name: 'Defy', expected: true },
    { name: 'iFLY', expected: true },
    { name: 'Andretti Indoor Karting', expected: true },
    { name: 'K1 Speed', expected: true },
    { name: 'Autobahn Indoor Speedway', expected: true },
    { name: 'Pole Position Raceway', expected: true },
    { name: 'MB2 Raceway', expected: true },
    { name: 'Speed Factory Indoor Karting', expected: true },
    { name: 'Supercharged Entertainment', expected: true },
    { name: 'RPM Raceway', expected: true },
    { name: 'Full Throttle Adrenaline Park', expected: true },
    { name: 'The Track Family Fun Parks', expected: true },
    { name: 'WonderWorks', expected: true },
    { name: 'Ripley\'s Believe It or Not', expected: true },
    { name: 'Madame Tussauds', expected: true },
    { name: 'SeaWorld', expected: true },
    { name: 'Universal Studios', expected: true },
    { name: 'Disneyland', expected: true },
    { name: 'Walt Disney World', expected: true },
    { name: 'Six Flags', expected: true },
    { name: 'Cedar Point', expected: true },
    { name: 'Carowinds', expected: true },
    { name: 'Kings Dominion', expected: true },
    { name: 'Kings Island', expected: true },
    { name: 'Knott\'s Berry Farm', expected: true },
    { name: 'Dollywood', expected: true },
    { name: 'Silver Dollar City', expected: true },
    { name: 'Holiday World', expected: true },
    { name: 'Legoland', expected: true },
    { name: 'Hersheypark', expected: true },
    { name: 'Six Flags Magic Mountain', expected: true },
    { name: 'Six Flags Great Adventure', expected: true },
    { name: 'Six Flags Over Texas', expected: true },
    { name: 'Six Flags Over Georgia', expected: true },
    { name: 'Six Flags Great America', expected: true },
    { name: 'Six Flags Fiesta Texas', expected: true },
    { name: 'Six Flags Discovery Kingdom', expected: true },
    { name: 'Six Flags St Louis', expected: true },
    { name: 'Six Flags America', expected: true },
    { name: 'Six Flags Hurricane Harbor', expected: true },
    { name: 'Six Flags White Water', expected: true },
    { name: 'Six Flags Darien Lake', expected: true },
    { name: 'Six Flags Mexico', expected: true },
    { name: 'Six Flags La Ronde', expected: true },
    { name: 'Six Flags New England', expected: true },
    { name: 'Six Flags The Great Escape', expected: true },
    { name: 'Six Flags Frontier City', expected: true },
    { name: 'Six Flags Kentucky Kingdom', expected: true },
    { name: 'Six Flags Splashtown', expected: true },
    { name: 'Six Flags Wet n Wild', expected: true },
    { name: 'Six Flags Waterworld', expected: true },
    { name: 'Six Flags Hurricane Harbor Concord', expected: true },
    { name: 'Six Flags Hurricane Harbor Phoenix', expected: true },
    { name: 'Six Flags Hurricane Harbor Oaxtepec', expected: true },
    { name: 'Six Flags Hurricane Harbor Rockford', expected: true },
    { name: 'Six Flags Hurricane Harbor Arlington', expected: true },
    { name: 'Six Flags Hurricane Harbor Splashtown', expected: true },
    { name: 'Six Flags Hurricane Harbor Glendale', expected: true },
    { name: 'Six Flags Hurricane Harbor Los Angeles', expected: true },
    { name: 'Six Flags Hurricane Harbor New Jersey', expected: true },
    { name: 'Six Flags Hurricane Harbor Oklahoma City', expected: true },
    { name: 'Six Flags Hurricane Harbor Phoenix', expected: true },
    { name: 'Six Flags Hurricane Harbor Sacramento', expected: true },
    { name: 'Six Flags Hurricane Harbor San Antonio', expected: true },
    { name: 'Six Flags Hurricane Harbor St Louis', expected: true },
    { name: 'Six Flags Hurricane Harbor The Woodlands', expected: true },
    { name: 'Six Flags Hurricane Harbor Concord', expected: true },
    { name: 'Six Flags Hurricane Harbor Glendale', expected: true },
    { name: 'Six Flags Hurricane Harbor Los Angeles', expected: true },
    { name: 'Six Flags Hurricane Harbor New Jersey', expected: true },
    { name: 'Six Flags Hurricane Harbor Oklahoma City', expected: true },
    { name: 'Six Flags Hurricane Harbor Phoenix', expected: true },
    { name: 'Six Flags Hurricane Harbor Sacramento', expected: true },
    { name: 'Six Flags Hurricane Harbor San Antonio', expected: true },
    { name: 'Six Flags Hurricane Harbor St Louis', expected: true },
    { name: 'Six Flags Hurricane Harbor The Woodlands', expected: true },
    { name: 'Six Flags Hurricane Harbor Concord', expected: true },
    { name: 'Six Flags Hurricane Harbor Glendale', expected: true },
    { name: 'Six Flags Hurricane Harbor Los Angeles', expected: true },
    { name: 'Six Flags Hurricane Harbor New Jersey', expected: true },
    { name: 'Six Flags Hurricane Harbor Oklahoma City', expected: true },
    { name: 'Six Flags Hurricane Harbor Phoenix', expected: true },
    { name: 'Six Flags Hurricane Harbor Sacramento', expected: true },
    { name: 'Six Flags Hurricane Harbor San Antonio', expected: true },
    { name: 'Six Flags Hurricane Harbor St Louis', expected: true },
    { name: 'Six Flags Hurricane Harbor The Woodlands', expected: true },
    { name: 'Six Flags Hurricane Harbor Concord', expected: true },
    { name: 'Six Flags Hurricane Harbor Glendale', expected: true },
    { name: 'Six Flags Hurricane Harbor Los Angeles', expected: true },
    { name: 'Six Flags Hurricane Harbor New Jersey', expected: true },
    { name: 'Six Flags Hurricane Harbor Oklahoma City', expected: true },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: "${testCase.name}" ---`);
    const result = checkKeywordExclusion(testCase.name);
    console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    console.log(`Reasoning: ${result.reasoning}`);

    if (result.isExcluded !== testCase.expected) {
      console.error(`❌ FAILED: "${testCase.name}" - Expected ${testCase.expected ? 'EXCLUDED' : 'NOT EXCLUDED'}`);
    } else {
      console.log(`✅ SUCCESS: "${testCase.name}" - Properly classified`);
    }
  });

  console.log('\n[KEYWORD EXCLUSION TEST] All tests complete! Check console output for detailed results.');
}

/**
 * Specific test for AT&T exclusion variants
 */
export function testATTExclusion(): void {
  console.log('\n[AT&T EXCLUSION TEST] Testing AT&T variant exclusions...\n');
  
  const attVariants = [
    'AT&T',
    'AT & T', 
    'AT AND T',
    'ATT',
    'AT T',
    'AT&T INC',
    'AT&T CORP',
    'AT&T WIRELESS',
    'AT&T MOBILITY',
    'AT&T SERVICES',
    'AMERICAN TELEPHONE AND TELEGRAPH',
    'American Telephone & Telegraph Co',
    'att.com',
    'AT&T Communications',
    'at&t billing',
    'AT&T UNIVERSAL CARD'
  ];

  console.log('Testing AT&T variants for exclusion:');
  attVariants.forEach((variant, index) => {
    console.log(`\n--- Test ${index + 1}: "${variant}" ---`);
    const result = checkKeywordExclusion(variant);
    
    console.log(`Result: ${result.isExcluded ? '✅ EXCLUDED' : '❌ NOT EXCLUDED'}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Matched Keywords: ${result.matchedKeywords.join(', ') || 'None'}`);
    console.log(`Reasoning: ${result.reasoning}`);
    
    if (!result.isExcluded) {
      console.error(`❌ FAILED: "${variant}" should have been excluded!`);
    } else {
      console.log(`✅ SUCCESS: "${variant}" properly excluded`);
    }
  });

  // Test edge cases that should NOT be excluded
  const nonAttNames = [
    'MATTHEW SMITH',
    'PATRICIA JONES', 
    'BATMAN ENTERPRISES',
    'BATTLE CREEK HOSPITAL',
    'ATTORNEY GENERAL OFFICE'
  ];

  console.log('\n\nTesting names that should NOT be excluded (false positive check):');
  nonAttNames.forEach((name, index) => {
    console.log(`\n--- False Positive Test ${index + 1}: "${name}" ---`);
    const result = checkKeywordExclusion(name);
    
    console.log(`Result: ${result.isExcluded ? '❌ EXCLUDED (should not be)' : '✅ NOT EXCLUDED'}`);
    if (result.isExcluded) {
      console.error(`❌ FALSE POSITIVE: "${name}" was incorrectly excluded!`);
      console.log(`Matched Keywords: ${result.matchedKeywords.join(', ')}`);
    } else {
      console.log(`✅ CORRECT: "${name}" properly allowed through`);
    }
  });

  console.log('\n[AT&T EXCLUSION TEST] Test complete - check results above\n');
}

// Update the main test function to include AT&T tests
export function testKeywordExclusion(): void {
  console.log('[KEYWORD EXCLUSION TEST] Running comprehensive test suite...\n');
  
  testKeywordExclusion();
  
  // Add AT&T specific tests
  testATTExclusion();
  
  console.log('\n[KEYWORD EXCLUSION TEST] All tests complete! Check console output for detailed results.');
}

/**
 * Test similarity calculation
 */
export function testSimilarity(): void {
  console.log('\n[SIMILARITY TEST] Running similarity tests...\n');

  const testCases = [
    { str1: 'Acme Corp', str2: 'Acme Corp', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'ACME CORP', expectedCombined: 100 },
    { str1: 'Acme Corp', str2: 'Acme Corporation', expectedCombined: 90 },
    { str1: 'Acme Corp', str2: 'Acme Inc', expectedCombined: 80 },
    { str1: 'Acme Corp', str2: 'Acme LLC', expectedCombined: 80 },
    { str1: 'Acme Corp', str2: 'Acme Limited', expectedCombined: 75 },
    { str1: 'Acme Corp', str2: 'Acme Company', expectedCombined: 75 },
    { str1: 'Acme Corp', str2: 'Acme Group', expectedCombined: 70 },
    { str1: 'Acme Corp', str2: 'Acme Associates', expectedCombined: 70 },
    { str1: 'Acme Corp', str2: 'Acme Partners', expectedCombined: 70 },
    { str1: 'Acme Corp', str2: 'Acme Foundation', expectedCombined: 65 },
    { str1: 'Acme Corp', str2: 'Acme Fund', expectedCombined: 65 },
    { str1: 'Acme Corp', str2: 'Acme Association', expectedCombined: 60 },
    { str1: 'Acme Corp', str2: 'Acme Society', expectedCombined: 60 },
    { str1: 'Acme Corp', str2: 'Acme Institute', expectedCombined: 60 },
    { str1: 'Acme Corp', str2: 'Acme', expectedCombined: 50 },
    { str1: 'Acme Corp', str2: 'Acme International', expectedCombined: 50 },
    { str1: 'Acme Corp', str2: 'Acme Systems', expectedCombined: 50 },
    { str1: 'Acme Corp', str2: 'Acme Technologies', expectedCombined: 50 },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Similarity Test ${index + 1}: "${testCase.str1}" vs "${testCase.str2}" ---`);
    const similarity = quickSimilarityTest(testCase.str1, testCase.str2);
    console.log(`Combined Similarity: ${similarity.combined.toFixed(2)}%`);

    if (similarity.combined < testCase.expectedCombined) {
      console.error(`❌ FAILED: "${testCase.str1}" vs "${testCase.str2}" - Expected at least ${testCase.expectedCombined}%`);
    } else {
      console.log(`✅ SUCCESS: "${testCase.str1}" vs "${testCase.str2}" - Passed`);
    }
  });

  console.log('\n[SIMILARITY TEST] All similarity tests complete!\n');
}
