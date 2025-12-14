-- Add a views counter to the post table (safe if already exists)
ALTER TABLE IF EXISTS public.post
    ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;



