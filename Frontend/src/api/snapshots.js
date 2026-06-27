import api from './axiosInstance'

export const getSnapshots = (projectId) => api.get(`/api/snapshots/${projectId}`)

export const getSnapshotsByRange = (projectId, from, to) =>
  api.get(`/api/snapshots/${projectId}/range`, { params: { from, to } })
