-- Remove duplicate keywords, keeping only the first occurrence based on created_at
DELETE FROM exclusion_keywords 
WHERE id NOT IN (
  SELECT DISTINCT ON (keyword) id
  FROM exclusion_keywords
  ORDER BY keyword, created_at ASC
);