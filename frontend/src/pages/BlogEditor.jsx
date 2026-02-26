import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { blogAPI, aiAPI } from '../api'
import './BlogEditor.css'

function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export default function BlogEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({ title: '', content: '', author: '' })
  const [saving, setSaving] = useState(false)
  const [loadingPost, setLoadingPost] = useState(isEdit)
  const [errors, setErrors] = useState({})

  // AI state
  const [suggestions, setSuggestions] = useState([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiVisible, setAiVisible] = useState(true)
  const [aiError, setAiError] = useState(null)

  useEffect(() => {
    if (isEdit) {
      blogAPI.getById(id)
        .then(r => setForm({
          title: r.data.title,
          content: r.data.content,
          author: r.data.author
        }))
        .catch(() => navigate('/'))
        .finally(() => setLoadingPost(false))
    }
  }, [id])

  const fetchSuggestions = useCallback(
    debounce(async (title, content) => {
      if (!title && content.length < 20) return
      setLoadingAI(true)
      setAiError(null)
      try {
        const res = await aiAPI.getSuggestions(title, content)
        setSuggestions(res.data.suggestions || [])
      } catch (err) {
        setAiError('AI suggestions unavailable. Check your GROQ_API_KEY.')
      } finally {
        setLoadingAI(false)
      }
    }, 1500),
    []
  )

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(e => ({ ...e, [name]: '' }))
    if (name === 'title' || name === 'content') {
      const updated = { ...form, [name]: value }
      fetchSuggestions(updated.title, updated.content)
    }
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.content.trim()) errs.content = 'Content is required'
    if (!form.author.trim()) errs.author = 'Author name is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      if (isEdit) {
        await blogAPI.update(id, form)
        navigate(`/blog/${id}`)
      } else {
        const res = await blogAPI.create(form)
        navigate(`/blog/${res.data.postId}`)
      }
    } catch {
      alert('Failed to save post. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleNewSuggestions() {
    setLoadingAI(true)
    setAiError(null)
    setSuggestions([])
    try {
      const res = await aiAPI.getSuggestions(form.title, form.content)
      setSuggestions(res.data.suggestions || [])
    } catch {
      setAiError('AI suggestions unavailable. Check your GROQ_API_KEY.')
    } finally {
      setLoadingAI(false)
    }
  }

  function applySuggestion(suggestion) {
    // If it's an intro paragraph suggestion, append to content
    if (suggestion.toLowerCase().includes('intro paragraph')) {
      const para = suggestion.replace(/^intro paragraph[^:]*:\s*/i, '')
      setForm(f => ({ ...f, content: f.content ? f.content + '\n\n' + para : para }))
    }
  }

  if (loadingPost) return (
    <div className="editor-loading">
      <div className="loading-spinner" />
    </div>
  )

  return (
    <div className="editor-page">
      <div className="editor-layout">
        {/* Form */}
        <div className="editor-main">
          <header className="editor-header">
            <Link to="/" className="back-link">← Back</Link>
            <h1 className="editor-title">
              {isEdit ? 'Edit Post' : 'New Post'}
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="editor-form">
            <div className={`form-group ${errors.title ? 'has-error' : ''}`}>
              <label className="form-label">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Your compelling headline…"
                className="form-input"
                autoFocus
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className={`form-group ${errors.author ? 'has-error' : ''}`}>
              <label className="form-label">Author</label>
              <input
                name="author"
                value={form.author}
                onChange={handleChange}
                placeholder="Your name"
                className="form-input"
              />
              {errors.author && <span className="form-error">{errors.author}</span>}
            </div>

            <div className={`form-group ${errors.content ? 'has-error' : ''}`}>
              <label className="form-label">Content</label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Start writing your story… AI suggestions will appear as you type."
                className="form-textarea"
                rows={16}
              />
              {errors.content && <span className="form-error">{errors.content}</span>}
            </div>

            <div className="form-actions">
              <Link to="/" className="btn btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Update Post' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>

        {/* AI Sidebar */}
        <aside className="ai-sidebar">
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-icon">✦</span>
              <span>AI Suggestions</span>
            </div>
            <button
              className="ai-toggle"
              onClick={() => setAiVisible(v => !v)}
            >
              {aiVisible ? 'Hide' : 'Show'}
            </button>
          </div>

          {aiVisible && (
            <div className="ai-body">
              <p className="ai-hint">
                Suggestions update as you write. Start typing your title or content.
              </p>

              {loadingAI && (
                <div className="ai-loading">
                  <div className="ai-spinner" />
                  <span>Generating…</span>
                </div>
              )}

              {aiError && (
                <div className="ai-error">
                  <span>⚠ </span>{aiError}
                </div>
              )}

              {!loadingAI && suggestions.length === 0 && !aiError && (
                <div className="ai-empty">
                  Start writing to get AI-powered suggestions
                </div>
              )}

              {suggestions.length > 0 && (
                <ul className="suggestions-list">
                  {suggestions.map((s, i) => (
                    <li key={i} className="suggestion-item">
                      <div className="suggestion-text">{s}</div>
                      {s.toLowerCase().includes('intro') && (
                        <button
                          className="suggestion-apply"
                          onClick={() => applySuggestion(s)}
                          title="Add to content"
                        >
                          + Use
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <button
                className="ai-refresh-btn"
                onClick={handleNewSuggestions}
                disabled={loadingAI || (!form.title && !form.content)}
              >
                {loadingAI ? 'Generating…' : '↻ New Suggestions'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}