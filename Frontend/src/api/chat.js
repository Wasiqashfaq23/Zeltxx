import axios from 'axios'

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chats`,
  withCredentials: true
})

export const getChatMessages = (projectId) => API.get(`/project/${projectId}`)
export const sendChatMessage = (projectId, data) => API.post(`/project/${projectId}`, data)
