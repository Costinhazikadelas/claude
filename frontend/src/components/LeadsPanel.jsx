import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { leadsAPI } from '../services/api'

export default function LeadsPanel() {
  const { leads, setLeads, selectedChat, setSelectedChat } = useStore()
  const [statusFilter, setStatusFilter] = useState(null)
  const [editingLead, setEditingLead] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [statusFilter])

  const loadLeads = async () => {
    setLoading(true)
    try {
      const res = await leadsAPI.getAll(statusFilter, 0, 100)
      setLeads(res.data)
    } catch (error) {
      console.error('Failed to load leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLead = async (lead, newStatus) => {
    try {
      await leadsAPI.update(lead.id, {
        ...lead,
        status: newStatus
      })
      loadLeads()
    } catch (error) {
      console.error('Failed to update lead:', error)
    }
  }

  const statuses = ['novo', 'qualificado', 'negociando', 'ganho', 'perdido']
  const statusColors = {
    novo: 'bg-gray-100 text-gray-800',
    qualificado: 'bg-blue-100 text-blue-800',
    negociando: 'bg-yellow-100 text-yellow-800',
    ganho: 'bg-green-100 text-green-800',
    perdido: 'bg-red-100 text-red-800'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status Filter */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              statusFilter === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition capitalize ${
                statusFilter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No leads found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-500">ID: {lead.telegram_id}</p>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="mb-2">
                  <select
                    value={lead.status}
                    onChange={(e) => handleUpdateLead(lead, e.target.value)}
                    className={`w-full px-2 py-1 text-xs rounded capitalize border-0 font-medium cursor-pointer ${
                      statusColors[lead.status]
                    }`}
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                {lead.tags && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {lead.tags.split(',').filter(t => t.trim()).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {lead.notes && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{lead.notes}</p>
                )}

                {/* Action Button */}
                <button
                  onClick={() => {
                    setSelectedChat({
                      telegram_id: lead.telegram_id,
                      name: lead.name,
                      is_group: false,
                      last_message_at: new Date().toISOString()
                    })
                  }}
                  className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-1 rounded transition"
                >
                  Open Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
