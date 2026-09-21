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
            <div className="w-80 bg-white rounded-lg shadow flex flex-col overflow-hidden">
              <ChatList />
            </div>

            {/* Right Panel - Messages */}
            {selectedChat ? (
              <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden">
                <MessageView />
              </div>
            ) : (
              <div className="flex-1 bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">Selecione uma conversa</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
