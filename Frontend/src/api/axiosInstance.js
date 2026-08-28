import axios from 'axios'

const getBackendUrl = () => {
  const url =
    import.meta.env.BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5001'
  return url.replace(/\/$/, '')
}

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true
})

export default api
