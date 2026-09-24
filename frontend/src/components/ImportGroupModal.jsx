import { useState, useEffect } from 'react'
import { groupsAPI } from '../services/api'

export default function ImportGroupModal({ onClose, onImported }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingId, setImportingId] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    groupsAPI.getAll()
      .then(res => setGroups(res.data))
      .catch(() => setError('Não foi possível carregar os grupos.'))
      .finally(() => setLoading(false))
  }, [])

  const handleImport = async (group) => {
    setImportingId(group.telegram_id)
    setError('')
    setResult(null)
    try {
      const res = await groupsAPI.importMembers(group.telegram_id)
      setResult({ group: group.name, ...res.data })
      onImported()
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao importar os membros do grupo.')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Importar de um grupo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 text-xs text-gray-500 border-b border-gray-50">
          Cada membro novo vira lead numa coluna com o nome do grupo. Quem já é
          lead em outra coluna não é movido, só ganha uma tag do grupo.
        </div>

        {result && (
          <div className="mx-5 mt-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-3 py-2">
            <p className="font-medium">{result.group}</p>
            <p>{result.imported} leads novos criados em "{result.column_label}"</p>
            {result.already_existed_tagged > 0 && (
              <p>{result.already_existed_tagged} já existiam e foram marcados com a tag do grupo</p>
            )}
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Nenhum grupo encontrado ainda. Grupos aparecem aqui depois que o CRM sincronizar suas conversas.
            </p>
          ) : (
            groups.map((group) => (
              <div
                key={group.telegram_id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50"
              >
                <span className="text-sm text-gray-700 truncate">{group.name}</span>
                <button
                  onClick={() => handleImport(group)}
                  disabled={importingId !== null}
                  className="flex-shrink-0 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium px-3 py-1.5 rounded-lg transition"
                >
                  {importingId === group.telegram_id ? 'Importando...' : 'Importar membros'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
