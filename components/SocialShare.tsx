'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

type SocialShareProps = {
  title: string
}

export function SocialShare({ title }: SocialShareProps) {
  const pathname = usePathname()
  const baseUrl = 'https://newstoday4u.com'
  const url = `${baseUrl}${pathname ?? ''}`

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`

  async function handleShareClick() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        })
      } catch {
        // silently ignore
      }
    } else {
      // fallback: copy link
      try {
        await navigator.clipboard.writeText(url)
        alert('Link copied. Share it on Instagram, Threads or TikTok.')
      } catch {
        alert('Could not copy link. You can still copy it manually from the address bar.')
      }
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied. Share it on Instagram, Threads or TikTok.')
    } catch {
      alert('Could not copy link. You can still copy it manually from the address bar.')
    }
  }

  return (
    <div className="share-block">
      <span className="share-label">Share:</span>
      <div className="share-buttons">
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-button share-facebook"
        >
          Facebook
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="share-button share-linkedin"
        >
          LinkedIn
        </a>
        <button
          type="button"
          onClick={handleShareClick}
          className="share-button share-native"
        >
          Share on mobile
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="share-button share-copy"
        >
          Copy link
        </button>
      </div>
    </div>
  )
}


