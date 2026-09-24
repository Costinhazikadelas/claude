import { useState, useEffect } from 'react'
import { useStore } from '../store'
import ChatList from './ChatList'
import MessageView from './MessageView'
import Sidebar from './Sidebar'
import LeadsPanel from './LeadsPanel'
import StatsBar from './StatsBar'

export default function Dashboard() {
  const { activeTab, selectedChat } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Bar */}
        <StatsBar />

        {/* Content Area */}
        {activeTab === 'leads' ? (
          <div className="flex-1 overflow-hidden p-4">
            <LeadsPanel />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden gap-4 p-4">
            {/* Left Panel - Chats */}
            <div className="w-80 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <ChatList />
            </div>

            {/* Right Panel - Messages */}
            {selectedChat ? (
              <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <MessageView />
              </div>
            ) : (
              <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto mb-3 text-gray-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Selecione uma conversa para começar</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
