import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { blogAPI } from '../api'
import './BlogDetail.css'

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function BlogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    blogAPI.getById(id)
      .then(r => setBlog(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Delete this post permanently?')) return
    setDeleting(true)
    try {
      await blogAPI.delete(id)
      navigate('/')
    } catch {
      alert('Failed to delete')
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="detail-loading">
      <div className="loading-spinner" />
    </div>
  )

  if (!blog) return null

  return (
    <div className="detail-page">
      <div className="detail-inner">
        <nav className="detail-breadcrumb">
          <Link to="/" className="back-link">← All Posts</Link>
        </nav>

        <header className="detail-header">
          <div className="detail-meta">
            <span className="detail-author">{blog.author}</span>
            <span className="meta-dot">·</span>
            <span className="detail-date">{formatDate(blog.created_at)}</span>
            {blog.updated_at !== blog.created_at && (
              <>
                <span className="meta-dot">·</span>
                <span className="detail-updated">Updated {formatDate(blog.updated_at)}</span>
              </>
            )}
          </div>
          <h1 className="detail-title">{blog.title}</h1>
          <div className="detail-divider" />
        </header>

        <div className="detail-body">
          {blog.content.split('\n').map((para, i) =>
            para.trim() ? <p key={i}>{para}</p> : <br key={i} />
          )}
        </div>

        <footer className="detail-footer">
          <div className="footer-actions">
            <Link to={`/edit/${blog.id}`} className="footer-btn edit-btn">
              ✎ Edit Post
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="footer-btn delete-btn"
            >
              {deleting ? 'Deleting…' : '✕ Delete Post'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}