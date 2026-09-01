import api from './axiosInstance'

export const getTasks = (projectId) => api.get(`/api/tasks/project/${projectId}`)
export const createTask = (projectId, data) => api.post(`/api/tasks/project/${projectId}`, data)
export const updateTask = (id, data) => api.put(`/api/tasks/${id}`, data)
export const addSubtask = (id, data) => api.post(`/api/tasks/${id}/subtasks`, data)
export const toggleSubtask = (id, subtaskId) => api.patch(`/api/tasks/${id}/subtasks/${subtaskId}`)
export const addTaskComment = (id, data) => api.post(`/api/tasks/${id}/comments`, data)
export const toggleTaskCommentReaction = (id, commentId, emoji) =>
  api.patch(`/api/tasks/${id}/comments/${commentId}/reactions`, { emoji })
export const trackTaskTime = (id, data) => api.post(`/api/tasks/${id}/time`, data)
export const addTaskAttachment = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/api/tasks/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
export const deleteTaskAttachment = (id, attId) => api.delete(`/api/tasks/${id}/attachments/${attId}`)
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`)
