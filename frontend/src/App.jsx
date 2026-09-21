import { useState, useEffect } from 'react'
import { useStore } from './store'
import { healthAPI, connectWebSocket, chatsAPI, leadsAPI } from './services/api'
import AuthPanel from './components/AuthPanel'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const { isAuthenticated, setAuthenticated, setWsConnected, importInProgress, setImportInProgress } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      connectWS()
      loadChats()
      loadLeads()
      const interval = setInterval(() => {
        healthAPI.check().then(res => {
          setImportInProgress(res.data.importing)
        }).catch(() => {})
      }, 2000)
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
      const res = await chatsAPI.getAll(0, 100)
      useStore.setState({ chats: res.data })
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }

  const loadLeads = async () => {
    try {
      const res = await leadsAPI.getAll(null, 0, 100)
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
                ⏳ Importing historical data... This may take a few minutes.
              </p>
            </div>
          )}
          <Dashboard />
        </>
      )}
    </div>
  )
}

export default App
