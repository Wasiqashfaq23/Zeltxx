import axios from 'axios'
import { backendUrl } from '../config'

const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default api
