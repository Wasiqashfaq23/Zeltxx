import api from './axiosInstance'

export const getChatMessages = (projectId) => api.get(`/api/chats/project/${projectId}`)
export const sendChatMessage = (projectId, data) => api.post(`/api/chats/project/${projectId}`, data)
