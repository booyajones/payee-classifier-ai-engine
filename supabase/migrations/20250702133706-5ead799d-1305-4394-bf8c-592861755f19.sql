-- Add duplicate detection columns to payee_classifications table
ALTER TABLE public.payee_classifications 
ADD COLUMN IF NOT EXISTS is_potential_duplicate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of_payee_id text,
ADD COLUMN IF NOT EXISTS duplicate_confidence_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duplicate_detection_method text DEFAULT 'Not Analyzed',
ADD COLUMN IF NOT EXISTS duplicate_group_id text,
ADD COLUMN IF NOT EXISTS ai_duplicate_reasoning text;

-- Add index for duplicate group queries
CREATE INDEX IF NOT EXISTS idx_payee_classifications_duplicate_group 
ON public.payee_classifications(duplicate_group_id) 
WHERE duplicate_group_id IS NOT NULL;

-- Add index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_payee_classifications_duplicates 
ON public.payee_classifications(is_potential_duplicate, duplicate_of_payee_id) 
WHERE is_potential_duplicate = true;