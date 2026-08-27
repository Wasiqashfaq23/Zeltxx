import axios from 'axios'

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tasks`,
  withCredentials: true
})

export const getTasks = (projectId) => API.get(`/project/${projectId}`)
export const createTask = (projectId, data) => API.post(`/project/${projectId}`, data)
export const updateTask = (id, data) => API.put(`/${id}`, data)
export const addSubtask = (id, data) => API.post(`/${id}/subtasks`, data)
export const toggleSubtask = (id, subtaskId) => API.patch(`/${id}/subtasks/${subtaskId}`)
export const addTaskComment = (id, data) => API.post(`/${id}/comments`, data)
export const deleteTask = (id) => API.delete(`/${id}`)
