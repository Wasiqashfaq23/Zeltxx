import api from './axiosInstance'

export const getNotifications = () => api.get('/api/notifications')
export const markAsRead = (id) => api.patch(`/api/notifications/${id}/read`)
export const markAllAsRead = () => api.patch('/api/notifications/read-all')
