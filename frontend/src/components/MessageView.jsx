import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { chatsAPI, templatesAPI } from '../services/api'
import { getInitials, avatarColor, dayLabel } from '../utils/format'

function TemplatesMenu({ onPick }) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (open) {
      templatesAPI.getAll().then(res => setTemplates(res.data)).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !text.trim()) return
    const res = await templatesAPI.create(title.trim(), text.trim())
    setTemplates([...templates, res.data])
    setTitle('')
    setText('')
    setCreating(false)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await templatesAPI.remove(id)
    setTemplates(templates.filter(t => t.id !== id))
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Respostas prontas"
        className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Respostas prontas
          </div>
          <div className="max-h-56 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 px-3">Nenhuma resposta salva ainda.</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onPick(t.text); setOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 truncate">{t.text}</p>
                  </div>
                  <span
                    onClick={(e) => handleDelete(t.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-gray-100 p-2">
            {creating ? (
              <div className="space-y-1.5">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título (ex: Proposta padrão)"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Texto da mensagem..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleCreate} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 rounded">Salvar</button>
                  <button onClick={() => setCreating(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-1 rounded">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-xs text-blue-500 hover:text-blue-600 font-medium py-1"
              >
                + Nova resposta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ name, size = 8 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ background: avatarColor(name), width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {getInitials(name)}
    </div>
  )
}

export default function MessageView() {
  const { selectedChat, messages, setMessages, addMessage } = useStore()
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    setSending(true)
    try {
      await chatsAPI.sendMessage(selectedChat.telegram_id, newMessage)
      addMessage({
        telegram_msg_id: 0,
        sender_id: 0,
        sender_name: 'Você',
        chat_id: selectedChat.telegram_id,
        text: newMessage,
        is_outgoing: true,
        timestamp: new Date().toISOString()
      })
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  if (!selectedChat) return null

  // Group consecutive messages and insert day separators
  const items = []
  let lastDay = null
  let lastSender = null
  messages.forEach((msg, idx) => {
    const day = new Date(msg.timestamp).toDateString()
    if (day !== lastDay) {
      items.push({ type: 'separator', key: `sep-${idx}`, label: dayLabel(msg.timestamp) })
      lastDay = day
      lastSender = null
    }
    const showAvatar = !msg.is_outgoing && lastSender !== msg.sender_name
    items.push({ type: 'message', key: idx, msg, showAvatar })
    lastSender = msg.sender_name
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
        <Avatar name={selectedChat.name} size={9} />
        <div>
          <h2 className="text-base font-semibold text-gray-800">{selectedChat.name}</h2>
          <p className="text-xs text-gray-400">
            {selectedChat.is_group ? 'Grupo' : 'Contato pessoal'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-1 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          items.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key={item.key} className="flex items-center justify-center py-3">
                  <span className="text-xs font-medium text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                    {item.label}
                  </span>
                </div>
              )
            }
            const msg = item.msg
            return (
              <div
                key={item.key}
                className={`flex items-end gap-2 ${msg.is_outgoing ? 'justify-end' : 'justify-start'} ${item.showAvatar ? 'mt-3' : 'mt-0.5'}`}
              >
                {!msg.is_outgoing && (
                  <div className="w-7 flex-shrink-0">
                    {item.showAvatar && <Avatar name={msg.sender_name} size={7} />}
                  </div>
                )}
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-3.5 py-2 shadow-sm ${
                    msg.is_outgoing
                      ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-gray-800 rounded-2xl rounded-bl-md'
                  }`}
                >
                  {!msg.is_outgoing && item.showAvatar && (
                    <p className="text-xs font-semibold mb-0.5" style={{ color: avatarColor(msg.sender_name) }}>
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="break-words whitespace-pre-wrap text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${
                    msg.is_outgoing ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <TemplatesMenu onPick={(text) => setNewMessage(text)} />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-transparent rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none disabled:bg-gray-100 text-sm transition"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white w-11 h-11 rounded-full transition flex items-center justify-center flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
