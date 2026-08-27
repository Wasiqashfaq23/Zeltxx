import axios from 'axios'

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/resources`,
  withCredentials: true
})

export const getResources = (projectId) => API.get(`/project/${projectId}`)
export const createResource = (projectId, data) => API.post(`/project/${projectId}`, data)
export const deleteResource = (id) => API.delete(`/${id}`)
