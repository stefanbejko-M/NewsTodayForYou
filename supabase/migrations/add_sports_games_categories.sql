-- Add Sports and Games categories to the category table
-- This is idempotent and safe to run multiple times

INSERT INTO category (slug, name) 
VALUES
  ('sports', 'Sports'),
  ('games', 'Games')
ON CONFLICT (slug) DO NOTHING;



