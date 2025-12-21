-- Backfill author_id for all existing posts to Daniel Bejkovski
-- This migration is idempotent and safe to run multiple times

UPDATE public.post
SET author_id = (
  SELECT id FROM public.author WHERE slug = 'daniel-bejkovski' LIMIT 1
)
WHERE author_id IS NULL
  AND EXISTS (SELECT 1 FROM public.author WHERE slug = 'daniel-bejkovski');

