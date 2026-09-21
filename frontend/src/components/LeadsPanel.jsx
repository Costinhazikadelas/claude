import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { leadsAPI } from '../services/api'

const COLUMNS = [
  { key: 'novo', label: 'Novo', accent: '#898781' },
  { key: 'qualificado', label: 'Qualificado', accent: '#2a78d6' },
  { key: 'negociando', label: 'Negociando', accent: '#fab219' },
  { key: 'ganho', label: 'Ganho', accent: '#0ca30c' },
  { key: 'perdido', label: 'Perdido', accent: '#d03b3b' },
]

function LeadCard({ lead, onOpenChat, onDragStart, isDragging }) {
  const tags = (lead.tags || '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <p className="font-medium text-gray-800 truncate">{lead.name}</p>
      <p className="text-xs text-gray-400 mb-2">ID: {lead.telegram_id}</p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {lead.notes && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{lead.notes}</p>
      )}

      <button
        onClick={() => onOpenChat(lead)}
        className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-1.5 rounded transition"
      >
        Abrir conversa
      </button>
    </div>
  )
}

export default function LeadsPanel() {
  const { leads, setLeads, setSelectedChat, setActiveTab } = useStore()
  const [loading, setLoading] = useState(false)
  const [draggingLeadId, setDraggingLeadId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setLoading(true)
    try {
      const res = await leadsAPI.getAll(null, 0, 200)
      setLeads(res.data)
    } catch (error) {
      console.error('Failed to load leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('text/plain', String(lead.id))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingLeadId(lead.id)
  }

  const handleDrop = async (e, status) => {
    e.preventDefault()
    setDragOverColumn(null)
    const leadId = Number(e.dataTransfer.getData('text/plain'))
    const lead = leads.find(l => l.id === leadId)
    setDraggingLeadId(null)
    if (!lead || lead.status === status) return

    // Optimistic update so the card moves instantly
    setLeads(leads.map(l => (l.id === leadId ? { ...l, status } : l)))
    try {
      await leadsAPI.update(leadId, { ...lead, status })
    } catch (error) {
      console.error('Failed to update lead:', error)
      loadLeads()
    }
  }

  const handleOpenChat = (lead) => {
    setSelectedChat({
      telegram_id: lead.telegram_id,
      name: lead.name,
      is_group: false,
      last_message_at: new Date().toISOString(),
    })
    setActiveTab('chats')
  }

  return (
    <div className="h-full flex flex-col">
      {loading && leads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const columnLeads = leads.filter(l => l.status === col.key)
            const isOver = dragOverColumn === col.key
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverColumn(col.key)
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col transition ${
                  isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: col.accent }}
                    />
                    <span className="font-semibold text-sm text-gray-700">{col.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-2 space-y-2 min-h-[100px]">
                  {columnLeads.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">
                      Arraste um lead aqui
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onOpenChat={handleOpenChat}
                        onDragStart={handleDragStart}
                        isDragging={draggingLeadId === lead.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
