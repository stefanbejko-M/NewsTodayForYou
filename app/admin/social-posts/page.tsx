'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type SocialPost = {
  id: string
  article_id: number
  slug: string
  title: string
  url: string
  fb_text: string
  ig_text: string
  threads_text: string
  hashtags: string
  image_url: string | null
  fb_posted: boolean
  ig_posted: boolean
  threads_posted: boolean
  created_at: string
  updated_at: string
}

export default function AdminSocialPostsPage() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>('')
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unposted'>('unposted')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null) // Track which post is being published

  // Get token from URL or localStorage
  useEffect(() => {
    const urlToken = searchParams.get('token')
    const storedToken = localStorage.getItem('admin_token')
    const initialToken = urlToken || storedToken || ''
    setToken(initialToken)
    if (initialToken && !storedToken) {
      localStorage.setItem('admin_token', initialToken)
    }
  }, [searchParams])

  // Fetch posts
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const fetchPosts = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/social-posts?status=${statusFilter}&token=${encodeURIComponent(token)}`
        )

        if (response.status === 401) {
          setError('Unauthorized. Please check your token.')
          setPosts([])
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data = await response.json()
        setPosts(data.posts || [])
        setError(null)

        // Auto-select post from URL if provided
        const postId = searchParams.get('id')
        if (postId && data.posts) {
          const post = data.posts.find((p: SocialPost) => p.id === postId)
          if (post) {
            setSelectedPost(post)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [token, statusFilter, searchParams])

  // Fetch single post
  const fetchPost = async (id: string) => {
    try {
      const response = await fetch(`/api/social-posts/${id}?token=${encodeURIComponent(token)}`)

      if (response.status === 401) {
        setError('Unauthorized. Please check your token.')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch post')
      }

      const data = await response.json()
      setSelectedPost(data.post)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      alert('Failed to copy. Please copy manually.')
    }
  }

  // Update post
  const updatePost = async (updates: Partial<SocialPost>) => {
    if (!selectedPost) return

    try {
      setSaving(true)
      const response = await fetch(`/api/social-posts/${selectedPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(updates),
      })

      if (response.status === 401) {
        setError('Unauthorized. Please check your token.')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update post')
      }

      const data = await response.json()
      setSelectedPost(data.post)

      // Update in list
      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? data.post : p))
      )

      alert('Post updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      alert('Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  // Publish to Instagram
  const publishToInstagram = async (postId: string) => {
    try {
      setPublishing(postId)
      setError(null)

      const response = await fetch(`/api/social-posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
      })

      if (response.status === 401) {
        setError('Unauthorized. Please check your token.')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to Instagram')
      }

      // Update the post in the list and selected post
      const updatedPost = data.post || { ...posts.find((p) => p.id === postId), ig_posted: true }
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)))

      if (selectedPost?.id === postId) {
        setSelectedPost(updatedPost)
      }

      alert(`Successfully published to Instagram! Post ID: ${data.instagramPostId || 'N/A'}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      alert(`Failed to publish: ${errorMessage}`)
    } finally {
      setPublishing(null)
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <h1>Admin Panel - Social Posts</h1>
        <p style={{ color: '#dc2626', marginBottom: '20px' }}>
          Unauthorized. Please provide a valid token.
        </p>
        <input
          type="text"
          placeholder="Enter admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        />
        <button
          onClick={() => {
            localStorage.setItem('admin_token', token)
            window.location.reload()
          }}
          style={{
            marginTop: '12px',
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Set Token
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <h1>Admin Panel - Social Posts</h1>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label>
          Filter:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unposted')}
            style={{
              marginLeft: '8px',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
            }}
          >
            <option value="unposted">Unposted</option>
            <option value="all">All</option>
          </select>
        </label>
        <span style={{ color: '#64748b' }}>
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Posts List */}
        <div>
          <h2>Posts List</h2>
          {loading ? (
            <p>Loading...</p>
          ) : posts.length === 0 ? (
            <p style={{ color: '#64748b' }}>No posts found.</p>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                      Date
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>
                      Title
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        backgroundColor: selectedPost?.id === post.id ? '#f0f9ff' : 'transparent',
                      }}
                      onClick={() => fetchPost(post.id)}
                    >
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {post.title.length > 50 ? post.title.slice(0, 50) + '...' : post.title}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px' }}>
                          {post.fb_posted ? '✓' : '○'} FB{' '}
                          {post.ig_posted ? '✓' : '○'} IG{' '}
                          {post.threads_posted ? '✓' : '○'} TH
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              fetchPost(post.id)
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            View
                          </button>
                          {!post.ig_posted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                publishToInstagram(post.id)
                              }}
                              disabled={publishing === post.id}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: publishing === post.id ? '#9ca3af' : '#e91e63',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: publishing === post.id ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              {publishing === post.id ? '...' : 'Publish IG'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Post Details */}
        <div>
          {selectedPost ? (
            <div>
              <h2>Post Details</h2>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <h3 style={{ marginTop: 0 }}>{selectedPost.title}</h3>
                <p>
                  <a href={selectedPost.url} target="_blank" rel="noopener noreferrer">
                    {selectedPost.url}
                  </a>
                </p>

                {selectedPost.image_url && (
                  <div style={{ marginBottom: '20px' }}>
                    <img
                      src={selectedPost.image_url}
                      alt={selectedPost.title}
                      style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                  </div>
                )}

                {/* Facebook Text */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Facebook Post:
                  </label>
                  <textarea
                    value={selectedPost.fb_text}
                    onChange={(e) => setSelectedPost({ ...selectedPost, fb_text: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(selectedPost.fb_text)}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Copy Facebook Text
                  </button>
                </div>

                {/* Instagram Text */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Instagram Post:
                  </label>
                  <textarea
                    value={selectedPost.ig_text}
                    onChange={(e) => setSelectedPost({ ...selectedPost, ig_text: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => copyToClipboard(selectedPost.ig_text)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Copy Instagram Text
                    </button>
                    {!selectedPost.ig_posted && (
                      <button
                        onClick={() => publishToInstagram(selectedPost.id)}
                        disabled={publishing === selectedPost.id}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: publishing === selectedPost.id ? '#9ca3af' : '#e91e63',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: publishing === selectedPost.id ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        {publishing === selectedPost.id ? 'Publishing...' : 'Publish to Instagram'}
                      </button>
                    )}
                    {selectedPost.ig_posted && (
                      <span
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        ✓ Published
                      </span>
                    )}
                  </div>
                </div>

                {/* Threads Text */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Threads Post:
                  </label>
                  <textarea
                    value={selectedPost.threads_text}
                    onChange={(e) =>
                      setSelectedPost({ ...selectedPost, threads_text: e.target.value })
                    }
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(selectedPost.threads_text)}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Copy Threads Text
                  </button>
                </div>

                {/* Hashtags */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Hashtags:
                  </label>
                  <input
                    type="text"
                    value={selectedPost.hashtags}
                    onChange={(e) => setSelectedPost({ ...selectedPost, hashtags: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(selectedPost.hashtags)}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Copy Hashtags
                  </button>
                </div>

                {/* Posted Status */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Posted Status:
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPost.fb_posted}
                        onChange={(e) => {
                          const updated = { ...selectedPost, fb_posted: e.target.checked }
                          setSelectedPost(updated)
                          updatePost({ fb_posted: e.target.checked })
                        }}
                      />
                      Facebook Posted
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPost.ig_posted}
                        onChange={(e) => {
                          const updated = { ...selectedPost, ig_posted: e.target.checked }
                          setSelectedPost(updated)
                          updatePost({ ig_posted: e.target.checked })
                        }}
                      />
                      Instagram Posted
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPost.threads_posted}
                        onChange={(e) => {
                          const updated = { ...selectedPost, threads_posted: e.target.checked }
                          setSelectedPost(updated)
                          updatePost({ threads_posted: e.target.checked })
                        }}
                      />
                      Threads Posted
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => {
                    updatePost({
                      fb_text: selectedPost.fb_text,
                      ig_text: selectedPost.ig_text,
                      threads_text: selectedPost.threads_text,
                      hashtags: selectedPost.hashtags,
                    })
                  }}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: saving ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2>Post Details</h2>
              <p style={{ color: '#64748b' }}>Select a post from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

