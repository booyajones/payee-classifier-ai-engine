import { ClassificationConfig } from '../types';

// Default classification configuration
export const DEFAULT_CLASSIFICATION_CONFIG: ClassificationConfig = {
  aiThreshold: 75, // Default threshold - use AI when confidence is below 75%
  bypassRuleNLP: true, // Always bypass rule-based and NLP classification for accuracy
  useEnhanced: false, // Default to NOT using enhanced classification
  offlineMode: false, // Default to online mode
  useFuzzyMatching: true, // Use fuzzy matching for better results
  useCacheForDuplicates: true, // Deduplicate similar names
  includeSicCodes: true // Enable SIC codes by default
};

// Increased concurrency limits for better parallel processing
export const MAX_CONCURRENCY = 20; // Doubled from 10

// Maximum batch size for AI classification
export const MAX_BATCH_SIZE = 15; // Increased from 5

// Extended name similarity threshold (Levenshtein distance %)
export const NAME_SIMILARITY_THRESHOLD = 85; // 85% similar names treated as same

// KEYWORD EXCLUSION CONFIGURATION - ALWAYS ENABLED
export const KEYWORD_EXCLUSION_CONFIG = {
  enabled: true, // ALWAYS enabled - never disable
  autoApply: true, // Automatically apply to all processing
  skipValidation: false, // Always validate exclusions
  logMatches: true // Log keyword matches for debugging
};

// Legal entity suffixes for business detection
export const LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "LTD", "LP", "LLP", "PC", "PLLC", "CO", "COMPANY",
  "CORPORATION", "INCORPORATED", "LIMITED", "TRUST", "GROUP", "ASSOCIATES",
  "PARTNERS", "FOUNDATION", "FUND", "ASSOCIATION", "SOCIETY", "INSTITUTE"
];

// Business keywords for identifying businesses
export const BUSINESS_KEYWORDS = [
  "SERVICES", "CONSULTING", "SOLUTIONS", "MANAGEMENT", "ENTERPRISES",
  "INTERNATIONAL", "SYSTEMS", "TECHNOLOGIES", "PROPERTIES", "INVESTMENTS",
  "GLOBAL", "INDUSTRIES", "COMMUNICATIONS", "RESOURCES", "DEVELOPMENT"
];

// Industry specific identifiers - expanded with more terms
export const INDUSTRY_IDENTIFIERS = {
  healthcare: [
    "HOSPITAL", "CLINIC", "MEDICAL CENTER", "HEALTH", "CARE", "PHARMACY",
    "MEDICAL", "HEALTHCARE", "DENTAL", "PHYSICIANS", "LABORATORIES", "DIAGNOSTIC",
    "WELLNESS", "THERAPY", "REHABILITATION", "NURSING", "HOSPICE"
  ],
  retail: [
    "STORE", "SHOP", "MARKET", "RETAIL", "OUTLET", "MART", "BOUTIQUE",
    "EMPORIUM", "SUPERMARKET", "HYPERMARKET", "MALL", "PLAZA", "GALLERY",
    "WHOLESALE", "DISCOUNT", "WAREHOUSE", "BAZAAR", "SHOPPES", "OUTLET"
  ],
  hospitality: [
    "HOTEL", "RESTAURANT", "CAFÉ", "CATERING", "RESORT", "DINER", 
    "BAKERY", "BISTRO", "PIZZERIA", "GRILL", "TAVERN", "PUB", "BAR",
    "LODGE", "INN", "MOTEL", "SUITES", "SPA", "HOSTEL", "ACCOMMODATION",
    "VACATION", "LOUNGE", "BRASSERIE", "EATERY", "MARRIOTT"
  ],
  finance: [
    "BANK", "FINANCIAL", "INSURANCE", "CAPITAL", "WEALTH", "ADVISORS",
    "INVESTMENT", "FINANCE", "MORTGAGE", "ASSET", "CREDIT", "TRUST",
    "SAVINGS", "LOAN", "SECURITIES", "BROKERAGE", "FUND", "ADVISORY",
    "EXCHANGE", "RETIREMENT", "BANKING", "ACCOUNTING", "TAX", "AUDIT",
    "FISCAL", "HOLDINGS", "EQUITY", "VENTURE", "MUTUAL", "PINNACLE", "GAS"
  ],
  education: [
    "SCHOOL", "UNIVERSITY", "COLLEGE", "ACADEMY", "INSTITUTE", "EDUCATION",
    "CAMPUS", "ELEMENTARY", "MIDDLE", "HIGH SCHOOL", "KINDERGARTEN",
    "PRESCHOOL", "NURSERY", "SEMINARY", "TUTORING", "LEARNING CENTER", 
    "TRAINING", "POLYTECHNIC", "MONTESSORI", "EDUCATIONAL"
  ],
  technology: [
    "TECH", "SOFTWARE", "HARDWARE", "COMPUTING", "DATA", "DIGITAL",
    "IT", "INFORMATION TECHNOLOGY", "WEB", "MOBILE", "CYBER", "NETWORK",
    "ELECTRONICS", "TELECOM", "SEMICONDUCTOR", "CLOUD", "AI", "ROBOTICS",
    "INNOVATIONS", "TECHNOLOGIES", "SYSTEMS", "GRAPHICS", "ADVANCED", "RESOURCING"
  ],
  services: [
    "MAINTENANCE", "CLEANING", "REPAIR", "INSTALLATION", "PLUMBING", "ELECTRICAL",
    "LANDSCAPING", "GARDENING", "CONSULTING", "ADVISORY", "PROFESSIONAL", 
    "LEGAL", "ACCOUNTING", "MARKETING", "ADVERTISING", "DESIGN", "CREATIVE",
    "ARCHITECTURE", "ENGINEERING", "CONSTRUCTION", "REMODELING", "RENOVATION",
    "HVAC", "ROOFING", "POOLS", "AIR", "AMERICAN", "ADMIRAL", "EXPERT", "SURFACE",
    "GRAY", "MATTER", "MECHANICAL", "EVENTS", "PLANNERS", "CRUISE", "TRAVEL", 
    "DISTRIBUTORS", "CURATED", "CLEAN", "DESIGNS", "AESOP", "ALLIANT", "BRUVION",
    "CHEMSEARCH", "CLARK", "DELTA", "ENTERTAINMENT", "FAIRFIELD", "FLORAL", "FUJI",
    "GABRIELLA", "GOOD", "CITIZEN", "HOMEBOY"
  ]
};

// Government entity patterns
export const GOVERNMENT_PATTERNS = [
  "CITY OF", "COUNTY OF", "STATE OF", "UNITED STATES", "U.S.", "US", "FEDERAL", 
  "DEPARTMENT OF", "OFFICE OF", "BUREAU OF", "AGENCY", "COMMISSION", "AUTHORITY", 
  "DISTRICT", "BOARD OF", "ADMINISTRATION", "DIVISION OF", "COMMITTEE", "COUNCIL OF",
  "MINISTRY OF", "NATIONAL", "ROYAL", "COMMONWEALTH", "REPUBLIC OF", "GOVERNMENT OF",
  "PROVINCIAL", "MUNICIPAL", "PARLIAMENT", "ASSEMBLY", "SENATE", "EMBASSY OF",
  "CONSULATE", "PUBLIC WORKS", "COURT OF", "JUDICIARY", "REVENUE", "POLICE"
];

// Professional titles
export const PROFESSIONAL_TITLES = [
  "DR", "DOCTOR", "PROF", "PROFESSOR", "MR", "MRS", "MS", "MISS",
  "MD", "JD", "CPA", "ESQ", "PHD", "DDS", "DVM", "RN", "DO", "DC",
  "LPN", "PA", "NP", "LCSW", "CRNA", "PTA", "OT", "PT",
  "CAPT", "CPT", "COL", "GEN", "MAJ", "LT", "SGT", "ADM", "CMDR",
  "REV", "FR", "PASTOR", "RABBI", "IMAM", "BISHOP", "ELDER", "DEACON",
  "HON", "SIR", "DAME", "LORD", "LADY", "HRH", "SHEIKH", "EMINENCE"
];
