import api from './axiosInstance'

export const getSprints = (projectId) => api.get(`/api/sprints/project/${projectId}`)
export const createSprint = (projectId, data) => api.post(`/api/sprints/project/${projectId}`, data)
export const updateSprint = (id, data) => api.patch(`/api/sprints/${id}`, data)
export const deleteSprint = (id) => api.delete(`/api/sprints/${id}`)
export const getBurndown = (id) => api.get(`/api/sprints/${id}/burndown`)