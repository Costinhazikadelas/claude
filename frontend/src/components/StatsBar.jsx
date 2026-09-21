import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { leadsAPI } from '../services/api'

export default function StatsBar() {
  const { chats, leads } = useStore()
  const [stats, setStats] = useState({
    totalChats: 0,
    totalLeads: 0,
    qualifiedLeads: 0,
    closedDeals: 0
  })

  useEffect(() => {
    calculateStats()
  }, [chats, leads])

  const calculateStats = () => {
    const qualifiedLeads = leads.filter(l => l.status !== 'novo').length
    const closedDeals = leads.filter(l => l.status === 'ganho').length

    setStats({
      totalChats: chats.length,
      totalLeads: leads.length,
      qualifiedLeads,
      closedDeals
    })
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 grid grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">Active Chats</p>
        <p className="text-2xl font-bold text-blue-600">{stats.totalChats}</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">Total Leads</p>
        <p className="text-2xl font-bold text-purple-600">{stats.totalLeads}</p>
      </div>

      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">Qualified</p>
        <p className="text-2xl font-bold text-yellow-600">{stats.qualifiedLeads}</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">Closed Deals</p>
        <p className="text-2xl font-bold text-green-600">{stats.closedDeals}</p>
      </div>
    </div>
  )
}
