import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import Project from '../models/project.js'
import User from '../models/user.js'

const activeRoomUsers = new Map() // projectId -> Map(socketId -> userObj)

const toStr = (value) =>
  value && value._id ? value._id.toString() : value ? value.toString() : null

// Presence cache: socketId -> { user, joinedProjects:Set }
const socketState = new Map()

/**
 * Authenticates every socket connection. Fail-closed: a socket without a
 * valid JWT (handshake token or cookie) is rejected before it can join any room.
 */
const authenticateSocket = async (io, socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0]

    if (!token || !process.env.JWT_SECRET) {
      return next(new Error('UNAUTHORIZED'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!decoded?.id) return next(new Error('UNAUTHORIZED'))

    socket.userId = decoded.id
    socket.data.joinedProjects = new Set()
    socketState.set(socket.id, { userId: decoded.id, joinedProjects: new Set() })
    next()
  } catch {
    return next(new Error('UNAUTHORIZED'))
  }
}

const getSocketUser = async (socket) => {
  if (socket.data.userDoc) return socket.data.userDoc
  const user = await User.findById(socket.userId).select('name email avatar statusText')
  if (user) socket.data.userDoc = user.toObject?.() || user
  return socket.data.userDoc
}

const isMember = (project, userId) =>
  project?.members?.some((m) => toStr(m.user) === toStr(userId)) || false

const isJoined = (socket, projectId) => socket.data.joinedProjects.has(String(projectId))

export const initSocket = (httpServer, allowedOrigins = []) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true
    }
  })

  io.use((socket, next) => authenticateSocket(io, socket, next))

  io.on('connection', (socket) => {
    socket.on('join_project', async (data) => {
      const projectId = (typeof data === 'string' ? data : data?.projectId)?.toString()
      const key = String(projectId || '')

      if (!socket.userId || !projectId) {
        socket.emit('project_join_error', { error: 'Unauthenticated connection.' })
        return
      }
      if (isJoined(socket, projectId)) return

      try {
        const project = await Project.findById(projectId).select('name isActive members').lean()
        if (!project) {
          socket.emit('project_join_error', { error: 'Project not found.' })
          return
        }
        if (!project.isActive) {
          socket.emit('project_join_error', { error: 'Project is inactive.' })
          return
        }
        if (!isMember(project, socket.userId)) {
          socket.emit('project_join_error', { error: 'You are not a member of this project.' })
          return
        }

        socket.join(projectId)
        socket.data.joinedProjects.add(projectId)
        socketState.get(socket.id)?.joinedProjects.add(projectId)

        const user = await getSocketUser(socket)
        if (user) {
          if (!activeRoomUsers.has(key)) activeRoomUsers.set(key, new Map())
          activeRoomUsers.get(key).set(socket.id, user)
          const onlineUsers = Array.from(activeRoomUsers.get(key).values())
          io.to(projectId).emit('presence_update', onlineUsers)
        }
      } catch (err) {
        console.error('join_project error:', err)
        socket.emit('project_join_error', { error: 'Could not join project.' })
      }
    })

    socket.on('leave_project', (projectId) => {
      const key = String(projectId || '')
      if (key) {
        socket.leave(key)
        socket.data.joinedProjects.delete(key)
        socketState.get(socket.id)?.joinedProjects.delete(key)
        if (activeRoomUsers.has(key)) {
          activeRoomUsers.get(key).delete(socket.id)
          const onlineUsers = Array.from(activeRoomUsers.get(key).values())
          io.to(key).emit('presence_update', onlineUsers)
        }
      }
    })

    socket.on('typing_start', ({ projectId }) => {
      if (!isJoined(socket, projectId)) return
      socket.to(String(projectId)).emit('user_typing_start', socket.data.userDoc)
    })

    socket.on('typing_stop', ({ projectId }) => {
      if (!isJoined(socket, projectId)) return
      socket.to(String(projectId)).emit('user_typing_stop', socket.data.userDoc)
    })

    socket.on('join_user', (userId) => {
      // Users may only subscribe to their own notification room — never read
      // someone else's notifications over the socket.
      if (socket.userId && String(userId) === String(socket.userId)) {
        socket.join(`user_${String(userId)}`)
      }
    })

    socket.on('disconnect', () => {
      socketState.delete(socket.id)
      const joined = socket.data.joinedProjects || new Set()
      for (const projectId of joined) {
        const key = String(projectId)
        socket.leave(key)
        if (activeRoomUsers.has(key)) {
          activeRoomUsers.get(key).delete(socket.id)
          const onlineUsers = Array.from(activeRoomUsers.get(key).values())
          io.to(key).emit('presence_update', onlineUsers)
        }
      }
    })
  })

  return io
}