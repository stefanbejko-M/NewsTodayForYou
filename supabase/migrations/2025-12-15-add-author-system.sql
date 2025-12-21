-- Add author system: update author table structure and add author_id to post
-- This migration is idempotent and safe to run multiple times

-- Ensure author table has all required fields (update existing structure)
DO $$ 
BEGIN
  -- Add slug if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'slug') THEN
    ALTER TABLE public.author ADD COLUMN slug text;
    CREATE UNIQUE INDEX IF NOT EXISTS author_slug_idx ON public.author(slug) WHERE slug IS NOT NULL;
  END IF;

  -- Add avatar_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.author ADD COLUMN avatar_url text;
  END IF;

  -- Add role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'role') THEN
    ALTER TABLE public.author ADD COLUMN role text;
  END IF;

  -- Add twitter_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'twitter_url') THEN
    ALTER TABLE public.author ADD COLUMN twitter_url text;
  END IF;

  -- Add linkedin_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'linkedin_url') THEN
    ALTER TABLE public.author ADD COLUMN linkedin_url text;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'author' AND column_name = 'updated_at') THEN
    ALTER TABLE public.author ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Ensure author_id exists in post table and references author
DO $$
BEGIN
  -- Check if author_id column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'post' AND column_name = 'author_id') THEN
    ALTER TABLE public.post ADD COLUMN author_id int REFERENCES public.author(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed Daniel Bejkovski as primary author
INSERT INTO public.author (slug, name, bio, role, avatar_url, is_system)
VALUES (
  'daniel-bejkovski',
  'Daniel Bejkovski',
  'Daniel Bejkovski is the Editor-in-Chief at NewsTodayForYou, overseeing editorial operations and ensuring high-quality news coverage across multiple categories. With a focus on accuracy and clarity, he leads the team in delivering timely and relevant news to readers.',
  'Editor-in-Chief',
  NULL,
  false
)
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  bio = EXCLUDED.bio,
  role = EXCLUDED.role,
  updated_at = now();

-- Create trigger for updated_at on author table
CREATE OR REPLACE FUNCTION public.update_author_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS author_updated_at_trigger ON public.author;
CREATE TRIGGER author_updated_at_trigger
  BEFORE UPDATE ON public.author
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_updated_at();

