# Database Migration Guide

## Overview

This project uses custom SQL migration files located in `supabase/migrations/`. These migrations need to be applied manually via the Supabase Dashboard SQL Editor.

## Required Migrations

The following migrations must be applied in order:

1. **2025-12-15-add-author-system.sql**
   - Creates/updates author table with all required fields (slug, bio, role, avatar_url, social links)
   - Adds author_id column to post table
   - Seeds Daniel Bejkovski as Editor-in-Chief
   - Creates updated_at trigger

2. **2025-12-15-add-finance-category.sql**
   - Adds 'finance' category to the category table

3. **2025-12-15-add-publishing-schedule.sql**
   - Adds `scheduled_for` column to post table
   - Adds `published_at` column to post table
   - Backfills `published_at` for existing published posts
   - Creates indexes for efficient querying

4. **2025-12-15-backfill-author-id.sql**
   - Backfills author_id for all existing posts to Daniel Bejkovski

## How to Apply Migrations

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Apply Each Migration

For each migration file:

1. Open the file from `supabase/migrations/`
2. Copy the entire SQL content
3. Paste into Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Verify success message

### Step 3: Verify Migrations

After applying all migrations, run the verification script:

```bash
npm run migrate:verify
```

This will check:
- ✓ Author table exists with all required columns
- ✓ Daniel Bejkovski author exists
- ✓ Post table has author_id, scheduled_for, published_at columns
- ✓ Finance category exists

## Verification Checklist

After applying migrations, verify:

- [ ] Author table has columns: id, slug, name, bio, role, avatar_url, twitter_url, linkedin_url, created_at, updated_at
- [ ] Daniel Bejkovski author exists with slug 'daniel-bejkovski'
- [ ] Post table has columns: author_id, scheduled_for, published_at, is_published
- [ ] Finance category exists in category table (slug: 'finance', name: 'Finance')
- [ ] Existing posts have author_id set (backfilled to Daniel Bejkovski)

## Troubleshooting

### Migration Already Applied

All migrations are idempotent - they can be run multiple times safely. They check for existing columns/tables before creating them.

### Errors

If you encounter errors:
1. Check the error message for specific issues
2. Verify you're applying migrations in the correct order
3. Ensure you have proper permissions (use Service Role key if needed)
4. Check Supabase logs for detailed error information

## Environment Variables

After applying migrations, ensure these environment variables are set in Vercel:

- `MAX_PUBLISHED_POSTS_PER_DAY` (optional, defaults to 80)
- `CRON_SECRET` (required for publish-scheduled-posts endpoint)

## Next Steps

After migrations are applied:

1. Verify with `npm run migrate:verify`
2. Test the publish cron: `/api/task/publish-scheduled-posts?secret=YOUR_SECRET`
3. Verify author pages work: `/author/daniel-bejkovski`
4. Check finance category: `/category/finance`
5. Monitor scheduled posts being published automatically

