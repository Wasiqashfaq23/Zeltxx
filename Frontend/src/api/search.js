import api from './axiosInstance'

export const globalSearch = (q) => api.get('/api/search', { params: { q } })