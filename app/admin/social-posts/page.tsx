'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type SocialPost = {
  id: string
  title: string
  url: string
  image_url: string | null
  platform: string
  status: string
  suggested_text: string | null
  created_at: string
  updated_at: string
  instagram_post_id?: string | null
  instagram_permalink?: string | null
  published_at?: string | null
  last_error?: string | null
}

// Helper to get status badge style
function getStatusBadgeStyle(status: string) {
  if (status === 'published') {
    return { backgroundColor: '#10b981', color: 'white', text: 'Published' }
  } else if (status === 'failed') {
    return { backgroundColor: '#ef4444', color: 'white', text: 'Failed' }
  } else {
    return { backgroundColor: '#f59e0b', color: 'white', text: 'Pending' }
  }
}

export default function AdminSocialPostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unposted'>('unposted')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reclassifying, setReclassifying] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [showError, setShowError] = useState<string | null>(null)

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/admin/login')
    }
  }

  // Fetch pending count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/social-posts/generate')
        if (response.ok) {
          const data = await response.json()
          setPendingCount(data.pendingInstagramPosts || 0)
        }
      } catch (err) {
        // Silently fail - not critical
      }
    }

    fetchPendingCount()
  }, [])

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/social-posts?status=${statusFilter}`)

        if (response.status === 401) {
          router.push('/admin/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data = await response.json()
        // Filter out posts without valid image_url (Instagram requires images)
        const allPosts = data.posts || []
        const validPosts = allPosts.filter(
          (post: SocialPost) => typeof post.image_url === 'string' && post.image_url.trim().length > 0
        )
        setPosts(validPosts)
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
  }, [statusFilter, searchParams, router])

  // Fetch single post
  const fetchPost = async (id: string) => {
    try {
      const response = await fetch(`/api/social-posts/${id}`)

      if (response.status === 401) {
        router.push('/admin/login')
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

  // Refresh posts list
  const refreshPosts = async () => {
    try {
      const response = await fetch(`/api/social-posts?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        const allPosts = data.posts || []
        const validPosts = allPosts.filter(
          (post: SocialPost) => typeof post.image_url === 'string' && post.image_url.trim().length > 0
        )
        setPosts(validPosts)
      }
    } catch (err) {
      console.error('Failed to refresh posts:', err)
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
        },
        body: JSON.stringify(updates),
      })

      if (response.status === 401) {
        router.push('/admin/login')
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

  // Generate Instagram posts for new articles
  const generateInstagramPosts = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch(`/api/social-posts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Instagram posts')
      }

      // Refresh the posts list
      await refreshPosts()
      alert('Instagram posts generated successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      alert(`Failed to generate: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  // Reclassify post categories
  const reclassifyCategories = async () => {
    if (!confirm('This will reclassify all posts based on their title and excerpt. This may take a while. Continue?')) {
      return
    }

    try {
      setReclassifying(true)
      setError(null)

      const response = await fetch(`/api/admin/reclassify-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reclassify categories')
      }

      alert(
        `Reclassification complete!\n\nUpdated: ${data.updated}\nUnchanged: ${data.unchanged}\nErrors: ${data.errors || 0}`
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      alert(`Failed to reclassify: ${errorMessage}`)
    } finally {
      setReclassifying(false)
    }
  }

  // Publish to Instagram
  const publishToInstagram = async (postId: string) => {
    try {
      setPublishing(postId)
      setError(null)
      setShowError(null)

      const response = await fetch(`/api/social-posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to publish to Instagram'
        setError(errorMessage)
        setShowError(errorMessage)
        alert(`Failed to publish: ${errorMessage}`)
        // Refresh to get updated status from database
        await refreshPosts()
        if (selectedPost?.id === postId) {
          await fetchPost(postId)
        }
        return
      }

      // Refresh posts list to show updated status
      await refreshPosts()

      // Update selected post if it's the one we just published
      if (selectedPost?.id === postId) {
        await fetchPost(postId)
      }

      alert(`Successfully published to Instagram! Post ID: ${data.instagramPostId || 'N/A'}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setShowError(errorMessage)
      alert(`Failed to publish: ${errorMessage}`)
      // Refresh to get updated status
      await refreshPosts()
    } finally {
      setPublishing(null)
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Admin Panel - Social Posts</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <option value="unposted">Unposted (status ≠ published)</option>
            <option value="all">All</option>
          </select>
        </label>
        <span style={{ color: '#64748b' }}>
          {posts.length} post{posts.length !== 1 ? 's' : ''}
          {pendingCount !== null && (
            <span style={{ marginLeft: '8px' }}>
              ({pendingCount} pending Instagram)
            </span>
          )}
        </span>
        <button
          onClick={generateInstagramPosts}
          disabled={generating}
          style={{
            padding: '8px 16px',
            backgroundColor: generating ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {generating ? 'Generating...' : 'Generate Instagram Posts'}
        </button>
        <button
          onClick={reclassifyCategories}
          disabled={reclassifying}
          style={{
            padding: '8px 16px',
            backgroundColor: reclassifying ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: reclassifying ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            marginLeft: 'auto',
          }}
        >
          {reclassifying ? 'Reclassifying...' : 'Reclassify Categories'}
        </button>
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
                      Platform
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
                  {posts.map((post) => {
                    const badgeStyle = getStatusBadgeStyle(post.status)
                    return (
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
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', textTransform: 'capitalize' }}>
                          {post.platform}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: badgeStyle.backgroundColor,
                              color: badgeStyle.color,
                              fontWeight: '600',
                            }}
                          >
                            {badgeStyle.text}
                          </span>
                          {post.last_error && (
                            <span
                              title={`Why failed? ${post.last_error}`}
                              style={{
                                marginLeft: '6px',
                                cursor: 'help',
                                fontSize: '14px',
                                color: '#ef4444',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                alert(`Why failed?\n\n${post.last_error}`)
                              }}
                            >
                              ⚠
                            </span>
                          )}
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
                            {post.platform?.toLowerCase().includes('instagram') &&
                              post.status !== 'published' && (
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
                    )
                  })}
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

                <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>
                    <strong>Platform:</strong> {selectedPost.platform}
                  </span>
                  {(() => {
                    const badgeStyle = getStatusBadgeStyle(selectedPost.status)
                    return (
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: badgeStyle.backgroundColor,
                          color: badgeStyle.color,
                          fontWeight: '600',
                        }}
                      >
                        {badgeStyle.text}
                      </span>
                    )
                  })()}
                  {selectedPost.instagram_post_id && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      IG ID: {selectedPost.instagram_post_id}
                    </span>
                  )}
                  {selectedPost.published_at && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Published: {new Date(selectedPost.published_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {selectedPost.last_error && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '6px',
                      marginBottom: '20px',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <strong>Why failed?</strong>
                      <button
                        onClick={() => {
                          const errorText = selectedPost.last_error || 'No error details available'
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(errorText)
                            alert('Error details copied to clipboard!')
                          } else {
                            alert(errorText)
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedPost.last_error}
                    </div>
                  </div>
                )}

                {selectedPost.image_url && (
                  <div style={{ marginBottom: '20px' }}>
                    <img
                      src={selectedPost.image_url}
                      alt={selectedPost.title}
                      style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                  </div>
                )}

                {/* Suggested Text */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Suggested Text:
                  </label>
                  <textarea
                    value={selectedPost.suggested_text || ''}
                    onChange={(e) =>
                      setSelectedPost({ ...selectedPost, suggested_text: e.target.value })
                    }
                    rows={6}
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
                      onClick={() => copyToClipboard(selectedPost.suggested_text || '')}
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
                      Copy Text
                    </button>
                    {selectedPost.platform?.toLowerCase().includes('instagram') &&
                      selectedPost.status !== 'published' && (
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
                    {selectedPost.status === 'published' && (
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

                {/* Status Update */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                    Status:
                  </label>
                  <select
                    value={selectedPost.status}
                    onChange={(e) => {
                      const updated = { ...selectedPost, status: e.target.value }
                      setSelectedPost(updated)
                      updatePost({ status: e.target.value })
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => {
                    updatePost({
                      suggested_text: selectedPost.suggested_text,
                      title: selectedPost.title,
                      url: selectedPost.url,
                      image_url: selectedPost.image_url,
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
