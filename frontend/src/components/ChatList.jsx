import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { chatsAPI } from '../services/api'
import { getInitials, avatarColor, relativeTime } from '../utils/format'

function Avatar({ name, isGroup }) {
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
      style={{ background: avatarColor(name) }}
    >
      {isGroup ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ) : (
        getInitials(name)
      )}
    </div>
  )
}

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
      const res = await chatsAPI.getAll(0, 5000)
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
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none text-sm transition"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredChats.map((chat) => {
              const isSelected = selectedChat?.telegram_id === chat.telegram_id
              return (
                <button
                  key={chat.telegram_id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar name={chat.name} isGroup={chat.is_group} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium truncate text-sm ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {chat.name}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {relativeTime(chat.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate">
                        {chat.last_message_text || 'Sem mensagens ainda'}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="ml-1 bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
