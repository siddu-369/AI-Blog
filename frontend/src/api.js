import axios from 'axios'

let baseURL = import.meta.env.VITE_API_URL || '/api';

// Render provides just the service name (e.g., 'aiblog-backend') when using property: host
// We need to convert it to the public URL format for the frontend to reach it.
if (baseURL !== '/api' && !baseURL.includes('.onrender.com') && !baseURL.includes('localhost')) {
  baseURL = `https://${baseURL}.onrender.com/api`;
} else if (baseURL !== '/api' && !baseURL.startsWith('http')) {
  baseURL = `https://${baseURL}`;
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

export const blogAPI = {
  getAll: () => api.get('/blogs'),
  getById: (id) => api.get(`/blogs/${id}`),
  create: (data) => api.post('/blogs', data),
  update: (id, data) => api.put(`/blogs/${id}`, data),
  delete: (id) => api.delete(`/blogs/${id}`)
}

export const aiAPI = {
  getSuggestions: (title, content) =>
    api.post('/ai-suggestions', { title, content })
}

export default api