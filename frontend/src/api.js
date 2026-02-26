import axios from 'axios'

let baseURL = import.meta.env.VITE_API_URL || '/api';

// Dynamic routing for Render deployments
if (typeof window !== 'undefined' && window.location.hostname.endsWith('.onrender.com')) {
  // If the frontend is hosted at aiblog-frontend.onrender.com,
  // the backend is expected to be at aiblog-backend.onrender.com
  const backendHost = window.location.hostname.replace('-frontend', '-backend');
  baseURL = `https://${backendHost}/api`;
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