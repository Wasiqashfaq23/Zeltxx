import { createContext, useContext, useState } from 'react'
import { ChevronLeft, ChevronRight, PanelLeft } from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const SidebarContext = createContext({
  sidebarState: 'expanded',
  setSidebarState: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

const Layout = ({ children }) => {
  const [sidebarState, setSidebarState] = useState('expanded')

  const cycleSidebar = () => {
    setSidebarState(prev => {
      if (prev === 'expanded') return 'collapsed'
      if (prev === 'collapsed') return 'hidden'
      return 'expanded'
    })
  }

  const marginClass =
    sidebarState === 'expanded'
      ? 'ml-56'
      : sidebarState === 'collapsed'
        ? 'ml-14'
        : 'ml-0'

  return (
    <SidebarContext.Provider value={{ sidebarState, setSidebarState }}>
      <div className="min-h-screen bg-[#f4f4f7]">
        <Navbar />
        <Sidebar />
        <main
          className={`mt-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-[#f4f4f7] p-6 transition-all duration-200 ${marginClass}`}
        >
          <button
            onClick={cycleSidebar}
            className="fixed bottom-12 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8ef] bg-white shadow-sm hover:bg-[#f4f4f7] text-[#6b7280] transition-colors"
          >
            {sidebarState === 'expanded' ? (
              <ChevronLeft className="h-4 w-4" />
            ) : sidebarState === 'collapsed' ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

export default Layout