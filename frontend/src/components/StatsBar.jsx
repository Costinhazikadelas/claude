import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { kanbanAPI, statsAPI } from '../services/api'
import './StatsBar.css'

const ICON_PATHS = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  chat: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 4H4a2 2 0 0 0 0 4h1M17 4h3a2 2 0 0 1 0 4h-1',
  percent: 'M19 5L5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8',
}

function Icon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

function StatTile({ icon, tint, label, value, sub }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon" style={{ color: tint, background: `color-mix(in srgb, ${tint} 15%, transparent)` }}>
        <Icon name={icon} />
      </div>
      <p className="stat-tile-value">{value}</p>
      <p className="stat-tile-label">{label}</p>
      {sub && <p className="stat-tile-sub">{sub}</p>}
    </div>
  )
}

export default function StatsBar() {
  const { chats, leads } = useStore()
  const [columns, setColumns] = useState([])
  const [summary, setSummary] = useState({ messages_today: 0, new_leads_7d: 0 })

  useEffect(() => {
    kanbanAPI.getColumns().then(res => setColumns(res.data)).catch(() => {})
    const loadSummary = () => statsAPI.getSummary().then(res => setSummary(res.data)).catch(() => {})
    loadSummary()
    const interval = setInterval(loadSummary, 15000)
    return () => clearInterval(interval)
  }, [])

  const byStatus = columns.map((col) => ({
    key: col.key,
    label: col.label,
    color: col.color,
    count: leads.filter((l) => l.status === col.key).length,
  }))

  const totalLeads = leads.length
  const activeChats = chats.length
  const won = byStatus.find((s) => s.key === 'ganho')?.count || 0
  const lost = byStatus.find((s) => s.key === 'perdido')?.count || 0
  const conversionRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0
  const unread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  const maxCount = Math.max(1, ...byStatus.map((s) => s.count))

  return (
    <div className="stats-bar">
      <div className="stat-tiles">
        <StatTile icon="users" tint="var(--series-1)" label="Total de leads" value={totalLeads} />
        <StatTile
          icon="chat"
          tint="var(--series-1)"
          label="Conversas ativas"
          value={activeChats}
          sub={unread > 0 ? `${unread} não lidas` : 'tudo em dia'}
        />
        <StatTile icon="trophy" tint="var(--status-good)" label="Negócios ganhos" value={won} />
        <StatTile
          icon="percent"
          tint="var(--status-warning)"
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          sub="ganhos / (ganhos + perdidos)"
        />
        <StatTile
          icon="message"
          tint="var(--series-1)"
          label="Mensagens hoje"
          value={summary.messages_today}
        />
        <StatTile
          icon="sparkle"
          tint="#4a3aa7"
          label="Novos leads (7 dias)"
          value={summary.new_leads_7d}
        />
      </div>

      <div className="funnel-card">
        <p className="funnel-title">Leads por status</p>
        <div className="funnel-rows">
          {byStatus.map((s) => (
            <div className="funnel-row" key={s.key}>
              <span className="funnel-row-label">{s.label}</span>
              <div className="funnel-track">
                <div
                  className="funnel-fill"
                  style={{ width: `${(s.count / maxCount) * 100}%`, background: s.color }}
                />
              </div>
              <span className="funnel-row-count">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
