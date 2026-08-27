import { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const SidebarContext = createContext({
  sidebarState: 'expanded',
  toggleSidebar: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

const Layout = ({ children }) => {
  const [sidebarState, setSidebarState] = useState('expanded')
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const toggleSidebar = () => {
    setSidebarState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
  }

  const toggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev)
  }

  const closeMobileSidebar = () => {
    setMobileOpen(false)
  }

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const marginClass = sidebarState === 'expanded' ? 'md:ml-56' : 'md:ml-14'

  return (
    <SidebarContext.Provider
      value={{
        sidebarState,
        toggleSidebar,
        mobileOpen,
        setMobileOpen,
        toggleMobileSidebar,
        closeMobileSidebar
      }}
    >
      <div className="min-h-screen bg-[#f4f4f7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar />
        <Sidebar />
        <main
          className={`mt-14 min-h-[calc(100vh-3.5rem)] bg-[#f4f4f7] dark:bg-slate-950 p-4 sm:p-6 transition-all duration-200 ml-0 ${marginClass}`}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

export default Layout
