-- Add Finance category to the category table
-- This is idempotent and safe to run multiple times

INSERT INTO public.category (slug, name) 
VALUES ('finance', 'Finance')
ON CONFLICT (slug) DO NOTHING;

