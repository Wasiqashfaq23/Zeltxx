import api from './axiosInstance'

export const getMe = () => api.get('/api/auth/me')

export const logout = () => api.post('/api/auth/logout')

export const updateProfile = (data) => api.patch('/api/auth/profile', data)
