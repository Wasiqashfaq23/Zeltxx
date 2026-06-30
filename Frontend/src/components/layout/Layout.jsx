import { createContext, useContext, useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const SidebarContext = createContext({
  sidebarState: 'expanded',
  toggleSidebar: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

const Layout = ({ children }) => {
  const [sidebarState, setSidebarState] = useState('expanded')

  const toggleSidebar = () => {
    setSidebarState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
  }

  const marginClass = sidebarState === 'expanded' ? 'ml-56' : 'ml-14'

  return (
    <SidebarContext.Provider value={{ sidebarState, toggleSidebar }}>
      <div className="min-h-screen bg-[#f4f4f7]">
        <Navbar />
        <Sidebar />
        <main
          className={`mt-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#f4f4f7] p-6 transition-all duration-200 ${marginClass}`}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

export default Layout
