-- Expand keyword database with comprehensive categories and keywords
-- Adding only new keywords to avoid duplicates

-- Insurance Companies and Terms
INSERT INTO exclusion_keywords (keyword, keyword_type, category) VALUES
('ALLSTATE', 'builtin', 'insurance'),
('GEICO', 'builtin', 'insurance'),
('STATE FARM', 'builtin', 'insurance'),
('PROGRESSIVE', 'builtin', 'insurance'),
('FARMERS', 'builtin', 'insurance'),
('USAA', 'builtin', 'insurance'),
('LIBERTY MUTUAL', 'builtin', 'insurance'),
('NATIONWIDE', 'builtin', 'insurance'),
('AMERICAN FAMILY', 'builtin', 'insurance'),
('TRAVELERS', 'builtin', 'insurance'),
('METLIFE', 'builtin', 'insurance'),
('PRUDENTIAL', 'builtin', 'insurance'),
('NEW YORK LIFE', 'builtin', 'insurance'),
('MUTUAL OF OMAHA', 'builtin', 'insurance'),
('POLICY', 'builtin', 'insurance'),
('PREMIUM', 'builtin', 'insurance'),
('CLAIM', 'builtin', 'insurance'),
('COVERAGE', 'builtin', 'insurance'),
('DEDUCTIBLE', 'builtin', 'insurance');

-- Educational Institutions
INSERT INTO exclusion_keywords (keyword, keyword_type, category) VALUES
('UNIVERSITY', 'builtin', 'education'),
('COLLEGE', 'builtin', 'education'),
('SCHOOL', 'builtin', 'education'),
('ACADEMY', 'builtin', 'education'),
('HARVARD', 'builtin', 'education'),
('STANFORD', 'builtin', 'education'),
('MIT', 'builtin', 'education'),
('UCLA', 'builtin', 'education'),
('USC', 'builtin', 'education'),
('BERKELEY', 'builtin', 'education'),
('YALE', 'builtin', 'education'),
('PRINCETON', 'builtin', 'education'),
('COLUMBIA', 'builtin', 'education'),
('NYU', 'builtin', 'education'),
('COMMUNITY COLLEGE', 'builtin', 'education'),
('STATE UNIVERSITY', 'builtin', 'education'),
('TECHNICAL COLLEGE', 'builtin', 'education'),
('TRAINING CENTER', 'builtin', 'education'),
('LEARNING CENTER', 'builtin', 'education');

-- Real Estate and Property Management
INSERT INTO exclusion_keywords (keyword, keyword_type, category) VALUES
('REAL ESTATE', 'builtin', 'real_estate'),
('PROPERTY MANAGEMENT', 'builtin', 'real_estate'),
('REALTY', 'builtin', 'real_estate'),
('REALTOR', 'builtin', 'real_estate'),
('APARTMENTS', 'builtin', 'real_estate'),
('CONDOS', 'builtin', 'real_estate'),
('HOUSING', 'builtin', 'real_estate'),
('RENTAL', 'builtin', 'real_estate'),
('LEASE', 'builtin', 'real_estate'),
('MORTGAGE', 'builtin', 'real_estate'),
('ESCROW', 'builtin', 'real_estate'),
('TITLE COMPANY', 'builtin', 'real_estate'),
('BROKER', 'builtin', 'real_estate'),
('AGENT', 'builtin', 'real_estate'),
('COLDWELL BANKER', 'builtin', 'real_estate'),
('CENTURY 21', 'builtin', 'real_estate'),
('RE/MAX', 'builtin', 'real_estate'),
('KELLER WILLIAMS', 'builtin', 'real_estate'),
('ZILLOW', 'builtin', 'real_estate'),
('TRULIA', 'builtin', 'real_estate');
