import api from './axiosInstance'

export const logContribution = (data) => api.post('/api/contributions', data)

export const getContributions = (projectId, params = {}) =>
  api.get(`/api/contributions/${projectId}`, { params })

export const getProjectSummary = (projectId, range = 'all') =>
  api.get(`/api/contributions/${projectId}/summary`, { params: { range } })

export const getProjectStreaks = (projectId) => api.get(`/api/contributions/${projectId}/streak`)

export const getWorkspaceLeaderboard = (range = 'all') =>
  api.get('/api/contributions/workspace/leaderboard', { params: { range } })

export const toggleReaction = (id, emoji) => api.post(`/api/contributions/${id}/react`, { emoji })

export const exportContributionsCsv = (projectId) =>
  api.get(`/api/contributions/${projectId}/export`, { responseType: 'blob' })
