import api from './axiosInstance'

export const getProjects =()=> api.get('/api/projects')
export const getProjectById= (id)=>api.get(`/api/projects/${id}`)
export const createProject= (data)=>api.post(`/api/projects`,data)
export const updateProject = (id,data)=>api.patch(`/api/projects/${id}`,data)
export const deleteProject= (id)=>api.delete(`/api/projects/${id}`)
export const inviteMember = (id,data)=>api.post(`/api/projects/${id}/invite`,data)
export const removeMember = (id,data)=>api.post(`/api/projects/${id}/invite${membderId}`)
