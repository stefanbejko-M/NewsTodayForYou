-- Add image_url column to post table if it does not exist
ALTER TABLE IF EXISTS public.post
    ADD COLUMN IF NOT EXISTS image_url text;



