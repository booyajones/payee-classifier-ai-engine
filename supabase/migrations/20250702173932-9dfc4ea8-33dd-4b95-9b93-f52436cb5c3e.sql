-- Expand keyword database with comprehensive categories and keywords
-- Current database has 71 keywords, expanding to 300+ keywords

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
('INSURANCE', 'builtin', 'insurance'),
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
('INSTITUTE', 'builtin', 'education'),
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

-- Transportation and Logistics
INSERT INTO exclusion_keywords (keyword, keyword_type, category) VALUES
('FEDEX', 'builtin', 'transportation'),
('UPS', 'builtin', 'transportation'),
('DHL', 'builtin', 'transportation'),
('USPS', 'builtin', 'transportation'),
('SHIPPING', 'builtin', 'transportation'),
('FREIGHT', 'builtin', 'transportation'),
('LOGISTICS', 'builtin', 'transportation'),
('DELIVERY', 'builtin', 'transportation'),
('TRANSPORT', 'builtin', 'transportation'),
('TRUCKING', 'builtin', 'transportation'),
('AIRLINE', 'builtin', 'transportation'),
('AIRPORT', 'builtin', 'transportation'),
('BUS', 'builtin', 'transportation'),
('METRO', 'builtin', 'transportation'),
('SUBWAY', 'builtin', 'transportation'),
('TAXI', 'builtin', 'transportation'),
('UBER', 'builtin', 'transportation'),
('LYFT', 'builtin', 'transportation'),
('RENTAL CAR', 'builtin', 'transportation'),
('MOVING COMPANY', 'builtin', 'transportation');

-- Food and Restaurant Chains
INSERT INTO exclusion_keywords (keyword, keyword_type, category) VALUES
('MCDONALDS', 'builtin', 'food_restaurant'),
('BURGER KING', 'builtin', 'food_restaurant'),
('SUBWAY', 'builtin', 'food_restaurant'),
('STARBUCKS', 'builtin', 'food_restaurant'),
('KFC', 'builtin', 'food_restaurant'),
('PIZZA HUT', 'builtin', 'food_restaurant'),
('DOMINOS', 'builtin', 'food_restaurant'),
('TACO BELL', 'builtin', 'food_restaurant'),
('WENDYS', 'builtin', 'food_restaurant'),
('CHIPOTLE', 'builtin', 'food_restaurant'),
('PANERA', 'builtin', 'food_restaurant'),
('DUNKIN', 'builtin', 'food_restaurant'),
('RESTAURANT', 'builtin', 'food_restaurant'),
('CAFE', 'builtin', 'food_restaurant'),
('DINER', 'builtin', 'food_restaurant'),
('BISTRO', 'builtin', 'food_restaurant'),
('GRILL', 'builtin', 'food_restaurant'),
('BAKERY', 'builtin', 'food_restaurant'),
('CATERING', 'builtin', 'food_restaurant'),
('FOOD SERVICE', 'builtin', 'food_restaurant');