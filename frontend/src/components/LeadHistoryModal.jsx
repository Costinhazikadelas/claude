import { useState, useEffect } from 'react'
import { leadsAPI } from '../services/api'

export default function LeadHistoryModal({ lead, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leadsAPI.getHistory(lead.id)
      .then(res => setHistory(res.data))
      .finally(() => setLoading(false))
  }, [lead.id])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Histórico</h2>
            <p className="text-xs text-gray-400">{lead.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Esse lead ainda não mudou de coluna.
            </p>
          ) : (
            <div className="space-y-3">
              {history.slice().reverse().map((h, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-700">
                      {h.from_status ? (
                        <><span className="text-gray-400">{h.from_status}</span> → <span className="font-medium">{h.to_status}</span></>
                      ) : (
                        <span className="font-medium">{h.to_status}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(h.changed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
