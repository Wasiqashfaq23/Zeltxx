import api from './axiosInstance'

export const getProjects = () => api.get('/api/projects')

export const getProjectById = (id) => api.get(`/api/projects/${id}`)

export const createProject = (data) => api.post('/api/projects', data)

export const updateProject = (id, data) => api.patch(`/api/projects/${id}`, data)

export const deleteProject = (id) => api.delete(`/api/projects/${id}`)

export const inviteMember = (id, data) => api.post(`/api/projects/${id}/invite`, data)

export const removeMember = (id, userId) => api.delete(`/api/projects/${id}/remove/${userId}`)

export const updateProjectNotes = (id, data) => api.patch(`/api/projects/${id}/notes`, data)

export const getProjectActivity = (id, limit = 50) => api.get(`/api/projects/${id}/activity`, { params: { limit } })

export const generateWebhookSecret = (id) => api.post(`/api/projects/${id}/webhook-secret`)

export const updateWebhookEvents = (id, data) => api.patch(`/api/projects/${id}/webhook-events`, data)
