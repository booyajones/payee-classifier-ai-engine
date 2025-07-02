/**
 * Financial and time-based themes for batch job name generation
 */

export const FINANCIAL_THEMES = {
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

export const TIME_BASED_PREFIXES = {
  morning: ['Dawn', 'Morning', 'Sunrise', 'Early'],
  afternoon: ['Midday', 'Afternoon', 'Peak'],
  evening: ['Evening', 'Sunset', 'Twilight'],
  night: ['Night', 'Midnight', 'Late-Night'],
  weekend: ['Weekend', 'Saturday', 'Sunday']
};

export const SIZE_BASED_NAMES = {
  small: ['Mini', 'Quick', 'Swift', 'Lite'],      // < 50 payees
  medium: ['Standard', 'Regular', 'Classic'],      // 50-200 payees  
  large: ['Mega', 'Super', 'Massive', 'Giant'],   // 200-500 payees
  huge: ['Ultra', 'Extreme', 'Colossal', 'Epic']  // 500+ payees
};

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