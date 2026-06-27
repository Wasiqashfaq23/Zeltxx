import { Navigate, Outlet } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import {createContext,useState,useEffect,useContext} from 'react'

const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
    const { user } = useAuth()
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user) return

        const s = io(import.meta.env.VITE_API_URL, {
            withCredentials: true,
        })

        setSocket(s)

        return () => s.disconnect()

    }, [user])


    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)