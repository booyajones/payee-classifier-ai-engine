-- Add columns for keyword management enhancement
ALTER TABLE public.exclusion_keywords 
ADD COLUMN keyword_type text NOT NULL DEFAULT 'custom',
ADD COLUMN category text DEFAULT 'custom';

-- Create index for better performance
CREATE INDEX idx_exclusion_keywords_type_category ON public.exclusion_keywords(keyword_type, category);

-- Insert all built-in keywords from the codebase
INSERT INTO public.exclusion_keywords (keyword, keyword_type, category) VALUES
-- Business Keywords
('LLC', 'builtin', 'business'),
('INC', 'builtin', 'business'),
('CORP', 'builtin', 'business'),
('LTD', 'builtin', 'business'),
('COMPANY', 'builtin', 'business'),
('CORPORATION', 'builtin', 'business'),
('LIMITED', 'builtin', 'business'),
('BUSINESS', 'builtin', 'business'),
('ENTERPRISE', 'builtin', 'business'),
('ENTERPRISES', 'builtin', 'business'),
('GROUP', 'builtin', 'business'),
('HOLDINGS', 'builtin', 'business'),
('INCORPORATED', 'builtin', 'business'),

-- Financial Keywords
('BANK', 'builtin', 'financial'),
('CREDIT UNION', 'builtin', 'financial'),
('FEDERAL CREDIT UNION', 'builtin', 'financial'),
('SAVINGS', 'builtin', 'financial'),
('LOAN', 'builtin', 'financial'),
('MORTGAGE', 'builtin', 'financial'),
('FINANCE', 'builtin', 'financial'),
('FINANCIAL', 'builtin', 'financial'),
('INVESTMENT', 'builtin', 'financial'),
('SECURITIES', 'builtin', 'financial'),
('INSURANCE', 'builtin', 'financial'),
('TRUST', 'builtin', 'financial'),

-- Government Keywords
('DEPARTMENT', 'builtin', 'government'),
('DEPT', 'builtin', 'government'),
('GOVERNMENT', 'builtin', 'government'),
('FEDERAL', 'builtin', 'government'),
('STATE', 'builtin', 'government'),
('COUNTY', 'builtin', 'government'),
('CITY', 'builtin', 'government'),
('MUNICIPAL', 'builtin', 'government'),
('AGENCY', 'builtin', 'government'),
('AUTHORITY', 'builtin', 'government'),
('COMMISSION', 'builtin', 'government'),
('BOARD', 'builtin', 'government'),

-- Utility Keywords  
('ELECTRIC', 'builtin', 'utility'),
('POWER', 'builtin', 'utility'),
('GAS', 'builtin', 'utility'),
('WATER', 'builtin', 'utility'),
('SEWER', 'builtin', 'utility'),
('UTILITY', 'builtin', 'utility'),
('UTILITIES', 'builtin', 'utility'),
('ENERGY', 'builtin', 'utility'),

-- Technology/Telecom Keywords
('INTERNET', 'builtin', 'technology'),
('CABLE', 'builtin', 'technology'),
('PHONE', 'builtin', 'technology'),
('WIRELESS', 'builtin', 'technology'),
('TELECOM', 'builtin', 'technology'),
('TELECOMMUNICATIONS', 'builtin', 'technology'),
('BROADBAND', 'builtin', 'technology'),

-- Healthcare Keywords
('HOSPITAL', 'builtin', 'healthcare'),
('MEDICAL', 'builtin', 'healthcare'),
('HEALTH', 'builtin', 'healthcare'),
('CLINIC', 'builtin', 'healthcare'),
('PHARMACY', 'builtin', 'healthcare'),

-- Payroll Service Keywords
('PAYROLL', 'builtin', 'payroll'),
('ADP', 'builtin', 'payroll'),
('PAYCHEX', 'builtin', 'payroll'),

-- Automotive Keywords
('AUTO', 'builtin', 'automotive'),
('AUTOMOTIVE', 'builtin', 'automotive'),
('CAR', 'builtin', 'automotive'),
('VEHICLE', 'builtin', 'automotive')

ON CONFLICT (keyword) DO UPDATE SET
  keyword_type = EXCLUDED.keyword_type,
  category = EXCLUDED.category;