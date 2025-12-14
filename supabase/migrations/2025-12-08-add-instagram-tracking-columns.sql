-- Add Instagram tracking columns to social_posts table
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS instagram_post_id text NULL,
  ADD COLUMN IF NOT EXISTS instagram_permalink text NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_error text NULL;

-- Update existing rows: set status to 'pending' if it's null or invalid
UPDATE public.social_posts
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'published', 'failed');

-- Ensure status column has proper default and constraint
ALTER TABLE public.social_posts
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.social_posts.instagram_post_id IS 'Instagram API post ID after successful publish';
COMMENT ON COLUMN public.social_posts.instagram_permalink IS 'Instagram post permalink URL if available';
COMMENT ON COLUMN public.social_posts.published_at IS 'Timestamp when post was successfully published to Instagram';
COMMENT ON COLUMN public.social_posts.last_error IS 'Last error message if publish failed';

