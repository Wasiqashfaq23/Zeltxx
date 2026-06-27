import axios from './axiosInstance'

export const getSnapshots = (projectId) => api.get(`/api/snapshots/${projectId}`)
export const getSnapshotsByRange = (projectId, from, to) => api.get(`/api/snapshots/${projectId}/range?from=${from}&to=${to}`)
