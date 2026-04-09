import axios from 'axios'

const api = axios.create({
  baseURL: 'https://icard-backend.onrender.com/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Evitar loop en la ruta de refresh
    if (original.url?.includes('/auth/token/refresh/')) {
      return Promise.reject(error)  // ← NO borrar tokens aquí
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          'https://icard-backend.onrender.com/api/auth/token/refresh/',
          { refresh: refreshToken }
        )
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (refreshError) {
        if (refreshError.response?.status === 401) {
          localStorage.clear()
          window.location.replace('/login')
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api