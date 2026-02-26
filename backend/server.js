require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Render provides just the service name (e.g., 'aiblog-frontend') when using property: host
if (frontendUrl !== 'http://localhost:5173' && !frontendUrl.includes('.onrender.com') && !frontendUrl.includes('localhost')) {
  frontendUrl = `https://${frontendUrl}.onrender.com`;
} else if (frontendUrl !== 'http://localhost:5173' && !frontendUrl.startsWith('http')) {
  frontendUrl = `https://${frontendUrl}`;
}

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

if (!process.env.FRONTEND_URL) {
  console.warn('⚠️ Warning: FRONTEND_URL is not defined. Defaulting to localhost:5173');
}
app.use(express.json());

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, 'blogs.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Groq AI client
if (!process.env.GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY is not defined in the environment.');
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── BLOG ROUTES ───────────────────────────────────────────────

// GET /api/blogs - List all blogs
app.get('/api/blogs', (req, res) => {
  try {
    const blogs = db.prepare('SELECT * FROM blogs ORDER BY created_at DESC').all();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blogs', details: err.message });
  }
});

// GET /api/blogs/:id - Get single blog
app.get('/api/blogs/:id', (req, res) => {
  try {
    const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog post not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blog', details: err.message });
  }
});

// POST /api/blogs - Create blog
app.post('/api/blogs', (req, res) => {
  const { title, content, author } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, content, and author are required' });
  }
  try {
    const stmt = db.prepare(
      'INSERT INTO blogs (title, content, author) VALUES (?, ?, ?)'
    );
    const result = stmt.run(title, content, author);
    res.status(201).json({
      message: 'Blog post created successfully',
      postId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create blog', details: err.message });
  }
});

// PUT /api/blogs/:id - Update blog
app.put('/api/blogs/:id', (req, res) => {
  const { title, content, author } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Blog post not found' });

    db.prepare(
      'UPDATE blogs SET title = ?, content = ?, author = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(
      title || existing.title,
      content || existing.content,
      author || existing.author,
      req.params.id
    );
    res.json({ message: 'Blog post updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blog', details: err.message });
  }
});

// DELETE /api/blogs/:id - Delete blog
app.delete('/api/blogs/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Blog post not found' });
    db.prepare('DELETE FROM blogs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Blog post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete blog', details: err.message });
  }
});

// ─── AI SUGGESTIONS ────────────────────────────────────────────

app.post('/api/ai-suggestions', async (req, res) => {
  const { title, content } = req.body;
  if (!title && !content) {
    return res.status(400).json({ error: 'Title or content is required' });
  }

  try {
    const prompt = `You are a creative blog writing assistant. Based on the blog post below, generate exactly 5 helpful suggestions.

Title: "${title || 'Untitled'}"
Content: "${content || 'No content yet'}"

Please provide the suggestions in the following JSON format. Make sure all strings are properly escaped.
{
  "suggestions": [
    "Related topic: [Your suggestion here]",
    "Related topic: [Your suggestion here]",
    "Intro paragraph: [Your suggestion here]",
    "SEO tip: [Your suggestion here without quotes]",
    "Content idea: [Your suggestion here]"
  ]
}

Return ONLY valid JSON, nothing else. Do not use nested quotes inside the suggestions string values.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant', // Updated decommissioned model
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' } // Improvement: Enforce JSON response
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    
    let parsed;
    try {
      // Clean and parse JSON
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: extract lines as suggestions
      const lines = raw.split('\n').filter(l => l.trim().length > 10).slice(0, 5);
      parsed = { suggestions: lines };
    }

    res.json(parsed);
  } catch (err) {
    console.error('Groq API error:', err.message);
    res.status(500).json({ error: 'AI suggestion failed', details: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blog API running' });
});

app.get('/api/debug-groq', (req, res) => {
  const key = process.env.GROQ_API_KEY;
  const isSet = !!key;
  const startsWithGsk = isSet && typeof key === 'string' && key.startsWith('gsk_');
  const length = isSet ? key.length : 0;
  // Also checking if the user accidentally pasted the instruction text
  const isPlaceholder = isSet && key.includes('Your Groq API Key');
  res.json({ isSet, startsWithGsk, length, isPlaceholder });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});