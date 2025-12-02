-- Create social_post table for prepared social media posts
CREATE TABLE IF NOT EXISTS public.social_post (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    article_id integer NOT NULL REFERENCES public.post(id) ON DELETE CASCADE,
    slug text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    fb_text text NOT NULL,
    ig_text text NOT NULL,
    threads_text text NOT NULL,
    hashtags text NOT NULL,
    image_url text,
    fb_posted boolean DEFAULT false,
    ig_posted boolean DEFAULT false,
    threads_posted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(article_id)
);

-- Create index on article_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_post_article_id ON public.social_post(article_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_social_post_created_at ON public.social_post(created_at DESC);

-- Create index on posted status for filtering
CREATE INDEX IF NOT EXISTS idx_social_post_unposted ON public.social_post(fb_posted, ig_posted, threads_posted);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_social_post_updated_at_trigger
    BEFORE UPDATE ON public.social_post
    FOR EACH ROW
    EXECUTE FUNCTION update_social_post_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.social_post ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for admin panel with token)
CREATE POLICY "Allow public read access" ON public.social_post
    FOR SELECT
    USING (true);

-- Allow public insert/update (will be protected by API token)
CREATE POLICY "Allow public insert" ON public.social_post
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.social_post
    FOR UPDATE
    USING (true);

