import api from './axiosInstance'

export const logContribution = (data) => api.post('/api/contributions', data)

export const getContributions = (projectId) => api.get(`/api/contributions/${projectId}`)

export const getProjectSummary = (projectId) => api.get(`/api/contributions/${projectId}/summary`)

export const toggleReaction = (id, emoji) => api.post(`/api/contributions/${id}/react`, { emoji })
