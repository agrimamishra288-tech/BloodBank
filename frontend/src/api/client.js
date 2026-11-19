import axios from 'axios'

// All requests go to /api (proxied to localhost:5000 by Vite in dev)
const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear token so ProtectedRoute redirects to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Sign-in endpoints return 401 for bad credentials or codes; let the form show that error.
    const isAuthRequest = /^\/?auth\/(login|register|google|firebase|mfa\/)/.test(err.config?.url || '')
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
