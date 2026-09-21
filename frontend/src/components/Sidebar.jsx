import { useStore } from '../store'

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
            {open && <h1 className="text-xl font-bold">CRM</h1>}
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
            <span className="text-xl">💬</span>
            {open && <span>Chats</span>}
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'leads'
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">👥</span>
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
