import { createContext, useState, useEffect, useContext } from 'react'
import { getMe, logout as logoutApi } from '../api/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMe().then(res => setUser(res.data))
            .catch(err => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    const logout =async () => {
        await logoutApi()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)