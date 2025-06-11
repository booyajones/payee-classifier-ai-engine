
-- Create the payee_classifications table to store all classification results
CREATE TABLE public.payee_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payee_name TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('Business', 'Individual')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT NOT NULL,
  processing_tier TEXT NOT NULL CHECK (processing_tier IN ('Rule-Based', 'NLP-Based', 'AI-Assisted', 'AI-Powered', 'Excluded', 'Failed')),
  processing_method TEXT,
  matching_rules TEXT[], -- Array of matching rules
  similarity_scores JSONB, -- Store similarity scores as JSON
  keyword_exclusion JSONB, -- Store keyword exclusion data as JSON
  original_data JSONB, -- Store original file data as JSON
  row_index INTEGER, -- Row index from original file
  batch_id TEXT, -- Batch identifier for grouping results
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying and deduplication
CREATE INDEX idx_payee_classifications_payee_name ON public.payee_classifications(payee_name);
CREATE INDEX idx_payee_classifications_batch_id ON public.payee_classifications(batch_id);
CREATE INDEX idx_payee_classifications_created_at ON public.payee_classifications(created_at DESC);
CREATE INDEX idx_payee_classifications_row_index ON public.payee_classifications(row_index);

-- Create unique constraint to prevent exact duplicates
CREATE UNIQUE INDEX idx_payee_classifications_unique ON public.payee_classifications(payee_name, COALESCE(row_index, -1), COALESCE(batch_id, ''));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payee_classifications_updated_at 
    BEFORE UPDATE ON public.payee_classifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for future user-specific access
ALTER TABLE public.payee_classifications ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for now (can be restricted later when auth is added)
CREATE POLICY "Allow all operations for now" 
  ON public.payee_classifications 
  FOR ALL 
  USING (true);
