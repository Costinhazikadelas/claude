import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { leadsAPI, kanbanAPI } from '../services/api'
import ImportGroupModal from './ImportGroupModal'
import LeadHistoryModal from './LeadHistoryModal'
import { followUpInfo } from '../utils/format'

const NEW_COLUMN_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#4a3aa7', '#e34948']

const FOLLOW_UP_STYLES = {
  overdue: 'bg-red-50 text-red-600 border border-red-200',
  today: 'bg-amber-50 text-amber-700 border border-amber-200',
  future: 'bg-gray-100 text-gray-600 border border-gray-200',
}

function FollowUpBadge({ lead, onSetFollowUp }) {
  const [editing, setEditing] = useState(false)
  const info = followUpInfo(lead.follow_up_at)

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : ''}
        onBlur={(e) => { onSetFollowUp(e.target.value || null); setEditing(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="text-xs border border-blue-300 rounded px-1.5 py-0.5 outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  if (!info) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition"
        title="Marcar lembrete de follow-up"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Lembrete
      </button>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${FOLLOW_UP_STYLES[info.urgency]}`}
      title="Clique para mudar a data"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      {info.label}
    </button>
  )
}

function LeadCard({ lead, onOpenChat, onDragStart, isDragging, onUpdate, onViewHistory }) {
  const tags = (lead.tags || '').split(',').map(t => t.trim()).filter(Boolean)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(lead.notes || '')

  const saveNotes = () => {
    setEditingNotes(false)
    if (notesValue !== (lead.notes || '')) {
      onUpdate(lead.id, { notes: notesValue })
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-gray-800 truncate">{lead.name}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onViewHistory(lead) }}
          title="Ver histórico"
          className="text-gray-300 hover:text-gray-500 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">ID: {lead.telegram_id}</p>

      <div className="mb-2">
        <FollowUpBadge lead={lead} onSetFollowUp={(date) => onUpdate(lead.id, { follow_up_at: date })} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {editingNotes ? (
        <textarea
          autoFocus
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={saveNotes}
          onClick={(e) => e.stopPropagation()}
          placeholder="Adicionar nota..."
          rows={2}
          className="w-full text-xs border border-blue-300 rounded px-2 py-1 mb-2 outline-none resize-none"
        />
      ) : (
        <p
          onClick={(e) => { e.stopPropagation(); setEditingNotes(true) }}
          className={`text-xs mb-2 line-clamp-2 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 ${lead.notes ? 'text-gray-500' : 'text-gray-300 italic'}`}
        >
          {lead.notes || 'Clique para adicionar nota...'}
        </p>
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

function ColumnHeader({ column, count, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(column.label)

  const commit = async () => {
    setEditing(false)
    const trimmed = value.trim()
    if (!trimmed || trimmed === column.label) {
      setValue(column.label)
      return
    }
    onRename(column, trimmed)
  }

  return (
    <div className="flex items-center justify-between px-3 py-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setValue(column.label); setEditing(false) }
            }}
            className="font-semibold text-sm text-gray-700 bg-white border border-blue-300 rounded px-1 py-0.5 w-full outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Clique para renomear"
            className="font-semibold text-sm text-gray-700 truncate hover:underline decoration-dotted text-left"
          >
            {column.label}
          </button>
        )}
      </div>
      <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full flex-shrink-0">
        {count}
      </span>
    </div>
  )
}

export default function LeadsPanel() {
  const { leads, setLeads, setSelectedChat, setActiveTab } = useStore()
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)
  const [draggingLeadId, setDraggingLeadId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [showImportGroup, setShowImportGroup] = useState(false)
  const [historyLead, setHistoryLead] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadColumns()
    loadLeads()
  }, [])

  const loadColumns = async () => {
    try {
      const res = await kanbanAPI.getColumns()
      setColumns(res.data)
    } catch (error) {
      console.error('Failed to load kanban columns:', error)
    }
  }

  const loadLeads = async () => {
    setLoading(true)
    try {
      const res = await leadsAPI.getAll(null, 0)
      setLeads(res.data)
    } catch (error) {
      console.error('Failed to load leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenameColumn = async (column, newLabel) => {
    setColumns(columns.map(c => (c.id === column.id ? { ...c, label: newLabel } : c)))
    try {
      await kanbanAPI.updateColumn(column.id, { label: newLabel })
    } catch (error) {
      console.error('Failed to rename column:', error)
      loadColumns()
    }
  }

  const handleAddColumn = async () => {
    const label = newColumnName.trim()
    if (!label) {
      setAddingColumn(false)
      return
    }
    const color = NEW_COLUMN_COLORS[columns.length % NEW_COLUMN_COLORS.length]
    try {
      const res = await kanbanAPI.createColumn(label, color)
      setColumns([...columns, res.data])
    } catch (error) {
      console.error('Failed to create column:', error)
    } finally {
      setNewColumnName('')
      setAddingColumn(false)
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

  const handleUpdateLead = async (leadId, partialFields) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    const updated = { ...lead, ...partialFields }
    setLeads(leads.map(l => (l.id === leadId ? updated : l)))
    try {
      await leadsAPI.update(leadId, updated)
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

  const term = searchTerm.trim().toLowerCase()
  const matchesSearch = (lead) => {
    if (!term) return true
    const haystack = `${lead.name || ''} ${lead.tags || ''} ${lead.notes || ''}`.toLowerCase()
    return haystack.includes(term)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm text-gray-500 flex-shrink-0">{leads.length} leads no total</p>
          <div className="relative w-56">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, tag ou nota..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowImportGroup(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Importar de um grupo
          </button>
          <a
            href={leadsAPI.exportUrl()}
            download
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Exportar contatos (CSV)
          </a>
        </div>
      </div>

      {showImportGroup && (
        <ImportGroupModal
          onClose={() => setShowImportGroup(false)}
          onImported={() => { loadLeads(); loadColumns(); }}
        />
      )}

      {historyLead && (
        <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />
      )}

      {loading && leads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => {
            const columnLeads = leads.filter(l => l.status === col.key && matchesSearch(l))
            const isOver = dragOverColumn === col.key
            return (
              <div
                key={col.id}
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
                <ColumnHeader column={col} count={columnLeads.length} onRename={handleRenameColumn} />

                <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-2 space-y-2 min-h-[100px]">
                  {columnLeads.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">
                      {term ? 'Nenhum lead corresponde à busca' : 'Arraste um lead aqui'}
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onOpenChat={handleOpenChat}
                        onDragStart={handleDragStart}
                        isDragging={draggingLeadId === lead.id}
                        onUpdate={handleUpdateLead}
                        onViewHistory={setHistoryLead}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Add column */}
          <div className="flex-shrink-0 w-72">
            {addingColumn ? (
              <div className="bg-gray-100 rounded-lg p-3">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') { setAddingColumn(false); setNewColumnName('') }
                  }}
                  placeholder="Nome da coluna"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-1.5 rounded transition"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColumnName('') }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-1.5 rounded transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-full h-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 text-sm font-medium transition"
              >
                + Adicionar coluna
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
