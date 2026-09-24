import { useState, useEffect } from 'react'
import { useStore } from './store'
import { healthAPI, connectWebSocket, chatsAPI, leadsAPI } from './services/api'
import AuthPanel from './components/AuthPanel'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const { isAuthenticated, setAuthenticated, setWsConnected, importInProgress, setImportInProgress } = useStore()
  const [loading, setLoading] = useState(true)
  const [newLeadToast, setNewLeadToast] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      connectWS()
      loadChats()
      loadLeads()
      let wasImporting = false
      const interval = setInterval(() => {
        healthAPI.check().then(res => {
          setImportInProgress(res.data.importing)
          // Refresh data while importing so the dashboard fills in live,
          // and once more right when it finishes to catch the last batch.
          if (res.data.importing || wasImporting) {
            loadChats()
            loadLeads()
          }
          wasImporting = res.data.importing
        }).catch(() => {})
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const checkAuth = async () => {
    try {
      const res = await healthAPI.check()
      if (res.data.authenticated) {
        setAuthenticated(true)
        setImportInProgress(res.data.importing)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  const connectWS = () => {
    try {
      const ws = connectWebSocket()

      ws.onopen = () => {
        setWsConnected(true)
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message') {
          console.log('New message:', data.data)
          loadChats()
          loadLeads()
          if (data.data.is_new_lead) {
            setNewLeadToast(data.data.sender_name)
            setTimeout(() => setNewLeadToast(null), 6000)
          }
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsConnected(false)
      }

      ws.onclose = () => {
        setWsConnected(false)
        setTimeout(connectWS, 3000)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  const loadChats = async () => {
    try {
      const res = await chatsAPI.getAll(0)
      useStore.setState({ chats: res.data })
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const loadLeads = async () => {
    try {
      const res = await leadsAPI.getAll(null, 0)
      useStore.setState({ leads: res.data })
    } catch (error) {
      console.error('Failed to load leads:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      {!isAuthenticated ? (
        <AuthPanel />
      ) : (
        <>
          {importInProgress && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
              <p className="text-sm text-yellow-800">
                ⏳ Importando histórico de conversas... isso pode levar alguns minutos. Os leads vão aparecendo aqui aos poucos.
              </p>
            </div>
          )}
          <Dashboard />
          {newLeadToast && (
            <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span className="font-medium">Novo lead: {newLeadToast}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
