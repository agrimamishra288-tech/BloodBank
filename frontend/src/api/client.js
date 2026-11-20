import axios from 'axios'

// All requests go to /api (proxied to localhost:5000 by Vite in dev)
const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 from a protected request, clear the session and return to login.
// Sign-in attempts must surface their own message on the form instead of
// reloading the page, otherwise the user never sees why sign-in failed.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    const isAuthAttempt = url.startsWith('/auth/')
    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(err)
  },
)

export default api
