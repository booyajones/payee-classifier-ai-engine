/**
 * Financial-Themed Batch Job Name Generator
 * Generates creative, money/finance-themed names for batch jobs
 */

interface JobContext {
  payeeCount?: number;
  fileName?: string;
  uploadTime?: Date;
  hasTextInput?: boolean;
}

const FINANCIAL_THEMES = {
  // Money & Currency Terms
  money: [
    'Cash', 'Capital', 'Currency', 'Coin', 'Dollar', 'Penny', 'Profit', 
    'Revenue', 'Income', 'Wealth', 'Fortune', 'Treasure', 'Gold', 'Silver'
  ],
  
  // Financial Actions & Operations
  actions: [
    'Audit', 'Analysis', 'Review', 'Processing', 'Investigation', 'Discovery',
    'Exploration', 'Detection', 'Tracking', 'Monitoring', 'Assessment', 'Evaluation'
  ],
  
  // Banking & Finance Terms
  banking: [
    'Banking', 'Transaction', 'Payment', 'Transfer', 'Account', 'Ledger',
    'Statement', 'Invoice', 'Receipt', 'Credit', 'Debit', 'Balance'
  ],
  
  // Business Finance
  business: [
    'Payroll', 'Expense', 'Budget', 'Asset', 'Liability', 'Equity',
    'Investment', 'Portfolio', 'Fund', 'Bond', 'Stock', 'Dividend'
  ],
  
  // Action Words
  actionWords: [
    'Crusader', 'Detective', 'Explorer', 'Hunter', 'Tracker', 'Scanner',
    'Processor', 'Analyzer', 'Inspector', 'Manager', 'Monitor', 'Guardian'
  ],
  
  // Descriptive Words
  descriptors: [
    'Smart', 'Swift', 'Mega', 'Super', 'Ultra', 'Prime', 'Elite', 'Pro',
    'Advanced', 'Premium', 'Express', 'Rapid', 'Instant', 'Lightning'
  ]
};

const TIME_BASED_PREFIXES = {
  morning: ['Dawn', 'Morning', 'Sunrise', 'Early'],
  afternoon: ['Midday', 'Afternoon', 'Peak'],
  evening: ['Evening', 'Sunset', 'Twilight'],
  night: ['Night', 'Midnight', 'Late-Night'],
  weekend: ['Weekend', 'Saturday', 'Sunday']
};

const SIZE_BASED_NAMES = {
  small: ['Mini', 'Quick', 'Swift', 'Lite'],      // < 50 payees
  medium: ['Standard', 'Regular', 'Classic'],      // 50-200 payees  
  large: ['Mega', 'Super', 'Massive', 'Giant'],   // 200-500 payees
  huge: ['Ultra', 'Extreme', 'Colossal', 'Epic']  // 500+ payees
};

/**
 * Generate a creative financial-themed name for a batch job
 */
export function generateBatchJobName(context: JobContext = {}): string {
  const { payeeCount = 0, fileName, uploadTime = new Date(), hasTextInput = false } = context;
  
  // Determine size category
  const sizeCategory = getSizeCategory(payeeCount);
  const timeCategory = getTimeCategory(uploadTime);
  
  // Generate name components
  const prefix = getRandomPrefix(sizeCategory, timeCategory);
  const mainTerm = getRandomMainTerm();
  const actionWord = getRandomElement(FINANCIAL_THEMES.actionWords);
  
  // Create different name patterns
  const patterns = [
    `${prefix} ${mainTerm} ${actionWord}`,
    `${mainTerm} ${actionWord} ${getSuffix(payeeCount)}`,
    `${prefix} ${getRandomElement(FINANCIAL_THEMES.actions)} ${getRandomElement(FINANCIAL_THEMES.business)}`,
    `${getRandomElement(FINANCIAL_THEMES.descriptors)} ${mainTerm} ${getRandomElement(FINANCIAL_THEMES.actions)}`,
    `${getTimeBasedName(uploadTime)} ${mainTerm} ${actionWord}`
  ];
  
  // Add special patterns for text input
  if (hasTextInput) {
    patterns.push(
      `Custom ${mainTerm} ${actionWord}`,
      `Manual ${getRandomElement(FINANCIAL_THEMES.business)} ${getRandomElement(FINANCIAL_THEMES.actions)}`
    );
  }
  
  // Add filename-based patterns
  if (fileName) {
    const cleanedFileName = cleanFileName(fileName);
    patterns.push(
      `${cleanedFileName} ${mainTerm} ${getRandomElement(FINANCIAL_THEMES.actions)}`,
      `${prefix} ${cleanedFileName} ${actionWord}`
    );
  }
  
  return getRandomElement(patterns);
}

function getSizeCategory(count: number): keyof typeof SIZE_BASED_NAMES {
  if (count < 50) return 'small';
  if (count < 200) return 'medium'; 
  if (count < 500) return 'large';
  return 'huge';
}

function getTimeCategory(date: Date): string {
  const hour = date.getHours();
  const day = date.getDay();
  
  if (day === 0 || day === 6) return 'weekend';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function getRandomPrefix(sizeCategory: string, timeCategory: string): string {
  const sizeWords = SIZE_BASED_NAMES[sizeCategory as keyof typeof SIZE_BASED_NAMES] || ['Smart'];
  const timeWords = TIME_BASED_PREFIXES[timeCategory as keyof typeof TIME_BASED_PREFIXES] || ['Quick'];
  
  // Mix size and time prefixes
  const allPrefixes = [...sizeWords, ...timeWords, ...FINANCIAL_THEMES.descriptors];
  return getRandomElement(allPrefixes);
}

function getRandomMainTerm(): string {
  const allTerms = [
    ...FINANCIAL_THEMES.money,
    ...FINANCIAL_THEMES.banking,
    ...FINANCIAL_THEMES.business
  ];
  return getRandomElement(allTerms);
}

function getSuffix(count: number): string {
  if (count > 500) return 'Powerhouse';
  if (count > 200) return 'Machine';
  if (count > 100) return 'Engine';
  if (count > 50) return 'Hub';
  return 'Station';
}

function getTimeBasedName(date: Date): string {
  const timeCategory = getTimeCategory(date);
  const timeWords = TIME_BASED_PREFIXES[timeCategory as keyof typeof TIME_BASED_PREFIXES] || ['Quick'];
  return getRandomElement(timeWords);
}

function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .slice(0, 2) // Take first 2 words max
    .join(' ');
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a batch job name with explicit context
 */
export function generateContextualBatchJobName(
  payeeCount: number,
  source: 'file' | 'text' = 'file',
  fileName?: string
): string {
  return generateBatchJobName({
    payeeCount,
    fileName,
    uploadTime: new Date(),
    hasTextInput: source === 'text'
  });
}

/**
 * Predefined premium names for special occasions
 */
export const PREMIUM_BATCH_NAMES = [
  'Elite Capital Command Center',
  'Premium Profit Processing Suite', 
  'Executive Expense Explorer',
  'Platinum Payroll Processor',
  'Diamond Dollar Detective',
  'Gold Standard Gateway',
  'Silver Screen Scanner',
  'Prime Portfolio Processor',
  'Royal Revenue Radar',
  'Imperial Invoice Inspector'
];

export function getPremiumBatchJobName(): string {
  return getRandomElement(PREMIUM_BATCH_NAMES);
}