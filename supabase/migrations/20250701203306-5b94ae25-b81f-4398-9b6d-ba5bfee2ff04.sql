
-- Create table for storing custom exclusion keywords in the cloud
CREATE TABLE public.exclusion_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_exclusion_keywords_keyword ON public.exclusion_keywords(keyword);
CREATE INDEX idx_exclusion_keywords_active ON public.exclusion_keywords(is_active);
CREATE INDEX idx_exclusion_keywords_created_at ON public.exclusion_keywords(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_exclusion_keywords_updated_at
  BEFORE UPDATE ON public.exclusion_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) for future user-specific access
ALTER TABLE public.exclusion_keywords ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for now (can be restricted later when auth is added)
CREATE POLICY "Allow all operations on exclusion_keywords" 
  ON public.exclusion_keywords 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
