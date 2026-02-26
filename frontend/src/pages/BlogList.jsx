import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blogAPI } from '../api'
import './BlogList.css'

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function excerpt(text, len = 140) {
  return text.length > len ? text.slice(0, len).trimEnd() + '…' : text
}

export default function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBlogs()
  }, [])

  async function fetchBlogs() {
    try {
      const res = await blogAPI.getAll()
      setBlogs(res.data)
    } catch {
      setError('Failed to load posts. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this post permanently?')) return
    setDeleting(id)
    try {
      await blogAPI.delete(id)
      setBlogs(b => b.filter(p => p.id !== id))
    } catch {
      alert('Failed to delete post')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="blog-list-page">
      {/* Hero */}
      <header className="list-hero">
        <div className="hero-tag">✦ A space for ideas</div>
        <h1 className="hero-title">Stories &<br />Perspectives</h1>
        <p className="hero-sub">Curated writing from curious minds</p>
      </header>

      {/* Content */}
      <section className="posts-section">
        {loading && (
          <div className="skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 12, width: '70%' }} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="error-state">
            <span className="error-icon">⚠</span>
            <p>{error}</p>
            <button onClick={fetchBlogs} className="retry-btn">Retry</button>
          </div>
        )}

        {!loading && !error && blogs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <h2>No stories yet</h2>
            <p>Be the first to share something</p>
            <Link to="/write" className="empty-cta">Write a Post</Link>
          </div>
        )}

        {!loading && !error && blogs.length > 0 && (
          <div className="posts-grid">
            {blogs.map((blog, i) => (
              <article
                key={blog.id}
                className="post-card"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => navigate(`/blog/${blog.id}`)}
              >
                <div className="post-meta">
                  <span className="post-author">{blog.author}</span>
                  <span className="meta-dot">·</span>
                  <span className="post-date">{formatDate(blog.created_at)}</span>
                </div>
                <h2 className="post-title">{blog.title}</h2>
                <p className="post-excerpt">{excerpt(blog.content)}</p>
                <div className="post-footer">
                  <Link to={`/blog/${blog.id}`} className="read-link" onClick={e => e.stopPropagation()}>
                    Read more →
                  </Link>
                  <div className="post-actions">
                    <Link
                      to={`/edit/${blog.id}`}
                      className="action-btn edit-btn"
                      onClick={e => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDelete(blog.id, e)}
                      disabled={deleting === blog.id}
                    >
                      {deleting === blog.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}