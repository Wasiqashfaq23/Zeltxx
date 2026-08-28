import api from './axiosInstance'

export const getTasks = (projectId) => api.get(`/api/tasks/project/${projectId}`)
export const createTask = (projectId, data) => api.post(`/api/tasks/project/${projectId}`, data)
export const updateTask = (id, data) => api.put(`/api/tasks/${id}`, data)
export const addSubtask = (id, data) => api.post(`/api/tasks/${id}/subtasks`, data)
export const toggleSubtask = (id, subtaskId) => api.patch(`/api/tasks/${id}/subtasks/${subtaskId}`)
export const addTaskComment = (id, data) => api.post(`/api/tasks/${id}/comments`, data)
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`)
