
-- Add SIC code columns to the payee_classifications table
ALTER TABLE public.payee_classifications 
ADD COLUMN sic_code TEXT,
ADD COLUMN sic_description TEXT;

-- Add index for SIC code queries
CREATE INDEX idx_payee_classifications_sic_code ON public.payee_classifications(sic_code);
