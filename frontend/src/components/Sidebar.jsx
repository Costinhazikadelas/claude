import { useStore } from '../store'

function NavIcon({ path }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={path} />
    </svg>
  )
}

const CHAT_ICON = 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'
const USERS_ICON = 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
const SEND_ICON = 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'

export default function Sidebar({ open, onToggle }) {
  const { activeTab, setActiveTab, isAuthenticated, setAuthenticated, wsConnected } = useStore()

  const handleLogout = () => {
    localStorage.clear()
    setAuthenticated(false)
  }

  return (
    <>
      {/* Sidebar */}
      <div className={`${open ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {open && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <NavIcon path={SEND_ICON} />
                </div>
                <h1 className="text-lg font-bold tracking-tight">Telegram CRM</h1>
              </div>
            )}
            <button
              onClick={() => onToggle(!open)}
              className="p-1 hover:bg-gray-800 rounded"
            >
              {open ? '✕' : '≡'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'chats'
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <NavIcon path={CHAT_ICON} />
            {open && <span>Conversas</span>}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'leads'
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <NavIcon path={USERS_ICON} />
            {open && <span>Leads</span>}
          </button>
        </nav>

        {/* Status & Logout */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          <div className={`flex items-center gap-2 text-sm ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {open && <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>}
          </div>

          {open && (
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </>
  )
}
