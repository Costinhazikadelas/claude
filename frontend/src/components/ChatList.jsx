import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { chatsAPI } from '../services/api'

export default function ChatList() {
  const { chats, setChats, selectedChat, setSelectedChat, setMessages } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    setLoading(true)
    try {
      const res = await chatsAPI.getAll(0, 100)
      setChats(res.data)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat)
    try {
      const res = await chatsAPI.getMessages(chat.telegram_id, 0, 100)
      setMessages(res.data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const filteredChats = chats.filter(chat =>
    (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search chats..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No chats found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <button
                key={chat.telegram_id}
                onClick={() => handleSelectChat(chat)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  selectedChat?.telegram_id === chat.telegram_id
                    ? 'bg-blue-100 border-l-4 border-blue-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{chat.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString() : 'No messages'}
                    </p>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
