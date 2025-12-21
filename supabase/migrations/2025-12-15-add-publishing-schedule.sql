-- Add publishing schedule fields to post table
-- This migration is idempotent and safe to run multiple times

-- Add scheduled_for column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'post' AND column_name = 'scheduled_for') THEN
    ALTER TABLE public.post ADD COLUMN scheduled_for timestamptz;
  END IF;
END $$;

-- Add published_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'post' AND column_name = 'published_at') THEN
    ALTER TABLE public.post ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Backfill published_at for existing published posts
UPDATE public.post
SET published_at = created_at
WHERE is_published = true AND published_at IS NULL;

-- Create index on scheduled_for for efficient querying
CREATE INDEX IF NOT EXISTS post_scheduled_for_idx ON public.post(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND is_published = false;

-- Create index on published_at for efficient querying
CREATE INDEX IF NOT EXISTS post_published_at_idx ON public.post(published_at) 
WHERE published_at IS NOT NULL;

