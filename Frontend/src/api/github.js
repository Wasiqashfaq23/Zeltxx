import api from './axiosInstance'

export const syncGitHubCommits = (projectId, data) =>
  api.post(`/api/github/sync/${projectId}`, data)
