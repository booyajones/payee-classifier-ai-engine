-- Add normalized_keyword column to exclusion_keywords table
ALTER TABLE exclusion_keywords 
ADD COLUMN IF NOT EXISTS normalized_keyword TEXT;

-- Create a function to normalize keywords using the same logic as the frontend
CREATE OR REPLACE FUNCTION normalize_keyword(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN '';
  END IF;
  
  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  UPPER(TRIM(input_text)),
                  '\s*&\s*', ' AND ', 'g'
                ),
                '\s*\+\s*', ' PLUS ', 'g'
              ),
              '\s*@\s*', ' AT ', 'g'
            ),
            '\s*#\s*', ' NUMBER ', 'g'
          ),
          '\s*\*\s*', ' STAR ', 'g'
        ),
        '[^\w\s]', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate normalized_keyword for existing records
UPDATE exclusion_keywords 
SET normalized_keyword = normalize_keyword(keyword)
WHERE normalized_keyword IS NULL;

-- Remove duplicates, keeping only the first occurrence based on created_at
DELETE FROM exclusion_keywords 
WHERE id NOT IN (
  SELECT DISTINCT ON (normalized_keyword) id
  FROM exclusion_keywords
  WHERE normalized_keyword IS NOT NULL AND normalized_keyword != ''
  ORDER BY normalized_keyword, created_at ASC
);

-- Add unique constraint on normalized_keyword
ALTER TABLE exclusion_keywords 
ADD CONSTRAINT exclusion_keywords_normalized_keyword_unique 
UNIQUE (normalized_keyword);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_exclusion_keywords_normalized 
ON exclusion_keywords (normalized_keyword);

-- Create trigger function to automatically normalize keywords on insert/update
CREATE OR REPLACE FUNCTION set_normalized_keyword()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_keyword = normalize_keyword(NEW.keyword);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set normalized_keyword
DROP TRIGGER IF EXISTS set_normalized_keyword_trigger ON exclusion_keywords;
CREATE TRIGGER set_normalized_keyword_trigger
  BEFORE INSERT OR UPDATE ON exclusion_keywords
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_keyword();