import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

const activeRoomUsers = new Map() // projectId -> Map(socketId -> userObj)

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  })

  // Middleware to authenticate socket connections via JWT cookie or handshake auth token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0]
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.user = decoded
      }
      next()
    } catch (err) {
      // Allow connection but unauthenticated socket flags
      next()
    }
  })

  io.on('connection', (socket) => {
    let currentProject = null

    socket.on('join_project', (data) => {
      const projectId = typeof data === 'string' ? data : data?.projectId
      const user = typeof data === 'object' ? data?.user : socket.user
      currentProject = projectId

      if (projectId) {
        socket.join(projectId)

        if (user && user._id) {
          if (!activeRoomUsers.has(projectId)) {
            activeRoomUsers.set(projectId, new Map())
          }
          activeRoomUsers.get(projectId).set(socket.id, user)
          const onlineUsers = Array.from(activeRoomUsers.get(projectId).values())
          io.to(projectId).emit('presence_update', onlineUsers)
        }
      }
    })

    socket.on('leave_project', (projectId) => {
      if (projectId) {
        socket.leave(projectId)
        if (activeRoomUsers.has(projectId)) {
          activeRoomUsers.get(projectId).delete(socket.id)
          const onlineUsers = Array.from(activeRoomUsers.get(projectId).values())
          io.to(projectId).emit('presence_update', onlineUsers)
        }
      }
    })

    socket.on('typing_start', ({ projectId, user }) => {
      if (projectId) {
        socket.to(projectId).emit('user_typing_start', user || socket.user)
      }
    })

    socket.on('typing_stop', ({ projectId, user }) => {
      if (projectId) {
        socket.to(projectId).emit('user_typing_stop', user || socket.user)
      }
    })

    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`)
      }
    })

    socket.on('disconnect', () => {
      if (currentProject && activeRoomUsers.has(currentProject)) {
        activeRoomUsers.get(currentProject).delete(socket.id)
        const onlineUsers = Array.from(activeRoomUsers.get(currentProject).values())
        io.to(currentProject).emit('presence_update', onlineUsers)
      }
    })
  })

  return io
}