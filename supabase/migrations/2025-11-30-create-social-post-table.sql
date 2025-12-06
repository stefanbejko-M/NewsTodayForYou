-- Create table for prepared social posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  image_url text,
  platform text NOT NULL, -- facebook / instagram / threads
  status text NOT NULL DEFAULT 'pending', -- pending | prepared | posted
  suggested_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index on platform and status for faster queries
CREATE INDEX IF NOT EXISTS idx_social_posts_platform_status ON public.social_posts(platform, status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_social_posts_updated_at_trigger
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_posts_updated_at();

-- Enable row level security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read (optional)
CREATE POLICY "Allow read for public"
  ON public.social_posts
  FOR SELECT
  USING (true);

-- Allow authenticated insert/update
CREATE POLICY "Allow authenticated insert"
  ON public.social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
  ON public.social_posts
  FOR UPDATE
  TO authenticated
  USING (true);
