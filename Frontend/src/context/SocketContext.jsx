import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { backendUrl } from '../config'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!user) {
      setSocket(null)
      return
    }

    const s = io(backendUrl, {
      withCredentials: true
    })

    s.on('connect_error', (err) => {
      console.warn('Socket connection failed:', err?.message || err)
    })

    setSocket(s)

    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [user])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
