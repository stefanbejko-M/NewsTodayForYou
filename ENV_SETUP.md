# Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file for local development and to your Vercel project settings for production:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy URL and anon public key
- Service role key (optional, for admin operations)

### Event Registry API
```
EVENT_REGISTRY_API_KEY=your_event_registry_api_key_here
```

**Where to get:**
- Sign up at [Event Registry](https://eventregistry.org/)
- Get your API key from account settings

### OpenAI API
```
OPENAI_API_KEY=your_openai_api_key_here
```

**Where to get:**
- Sign up at [OpenAI Platform](https://platform.openai.com/)
- Go to API Keys section
- Create new secret key

### Cron Job Security (Optional but Recommended)
```
CRON_SECRET=your_random_secret_string_here
```

Generate a random string for securing your cron endpoint.

### Site URL
```
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

Your production domain for SEO and metadata.

## Setup Instructions

1. Copy these variables to `.env.local` (for local development)
2. Add them to Vercel:
   - Go to your Vercel project
   - Settings → Environment Variables
   - Add each variable for Production, Preview, and Development environments
3. Redeploy after adding environment variables



