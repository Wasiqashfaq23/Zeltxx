import api from './axiosInstance'

export const getResources = (projectId) => api.get(`/api/resources/project/${projectId}`)
export const createResource = (projectId, data) => api.post(`/api/resources/project/${projectId}`, data)
export const deleteResource = (id) => api.delete(`/api/resources/${id}`)
