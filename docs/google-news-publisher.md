# Google News Publisher Center Configuration Guide

This document provides a checklist for configuring NewsTodayForYou in Google News Publisher Center.

## Basic Information

- **Publication name:** NewsTodayForYou
- **Website:** https://newstoday4u.com/
- **Primary language:** English
- **Target countries:** US, UK, Canada, Australia (suggested)

## Logos

The site already has logos available in `/public`:

- Square logo: `/logo-nt.svg` (SVG format)
- Square logo (PNG): `/android-chrome-192x192.png`, `/android-chrome-512x512.png`
- Rectangular/icon: `/favicon-32x32.png`, `/favicon-16x16.png`

## Web Locations (Sections) to Add

Add these sections in Google News Publisher Center:

### Main Sections

1. **Home**
   - URL: https://newstoday4u.com/
   - Type: Web Location

2. **Latest News** (if different from home)
   - URL: https://newstoday4u.com/
   - Type: Web Location

### Category Sections

3. **Politics**
   - URL: https://newstoday4u.com/category/politics
   - Type: Web Location

4. **AI News**
   - URL: https://newstoday4u.com/category/ai-news
   - Type: Web Location

5. **Daily Highlights**
   - URL: https://newstoday4u.com/category/daily-highlights
   - Type: Web Location

6. **Sports**
   - URL: https://newstoday4u.com/category/sports
   - Type: Web Location

7. **Games**
   - URL: https://newstoday4u.com/category/games
   - Type: Web Location

8. **Celebrity**
   - URL: https://newstoday4u.com/category/celebrity
   - Type: Web Location

## Technical Requirements (Already Implemented)

The site already has the following technical requirements for Google News:

✅ **Structured Data:** NewsArticle JSON-LD schema on all article pages (`/news/[slug]`)

✅ **Sitemaps:** Available at:
   - https://newstoday4u.com/sitemap.xml (index)
   - https://newstoday4u.com/sitemap-0.xml (articles)

✅ **robots.txt:** Allows crawling (located at https://newstoday4u.com/robots.txt)

✅ **GA4 Integration:** Already integrated via `NEXT_PUBLIC_GA_ID` environment variable (GA4 already integrated)

## Step-by-Step Configuration

1. **Add Publication**
   - Go to [Google News Publisher Center](https://publishercenter.google.com/)
   - Click "Add publication"
   - Enter publication name: **NewsTodayForYou**

2. **Verify Site Ownership**
   - Follow Google's verification process (HTML file or meta tag)
   - The site already has Google Search Console verification meta tag configured

3. **Add Sections (Web Locations)**
   - Add each URL listed above as a "Web Location" section
   - Ensure each section is set to "Web Location" type

4. **Set Primary Language**
   - Set primary language to **English**

5. **Set Target Countries** (optional but recommended)
   - Add target countries: **United States, United Kingdom, Canada, Australia**

6. **Submit for Review**
   - Review all settings
   - Submit the publication for Google News review
   - Review typically takes a few days to a few weeks

## Notes

- All article pages include proper NewsArticle structured data
- The site uses dynamic metadata for SEO (title, description, OpenGraph, Twitter cards)
- Articles are refreshed every few hours via automated ingestion
- The site aggregates and rewrites news from trusted sources using AI

