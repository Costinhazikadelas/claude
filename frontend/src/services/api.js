import axios from 'axios'

const API_BASE = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authAPI = {
  login: (phone) => api.post('/auth/login', { phone }),
  verify: (phone, code) => api.post('/auth/verify', { phone, code }),
}

export const chatsAPI = {
  // No limit sent = backend returns every chat, no cap.
  getAll: (skip = 0) => api.get('/chats', { params: { skip } }),
  getMessages: (chatId, skip = 0, limit = 50) =>
    api.get(`/chats/${chatId}/messages`, { params: { skip, limit } }),
  sendMessage: (chatId, text) =>
    api.post('/messages/send', { chat_id: chatId, text }),
}

export const contactsAPI = {
  getAll: (skip = 0) => api.get('/contacts', { params: { skip } }),
}

export const leadsAPI = {
  // No limit sent = backend returns every matching lead, no cap.
  getAll: (status, skip = 0) => api.get('/leads', { params: { status, skip } }),
  update: (leadId, data) => api.put(`/leads/${leadId}`, data),
  exportUrl: () => `${API_BASE}/leads/export`,
  getHistory: (leadId) => api.get(`/leads/${leadId}/history`),
}

export const templatesAPI = {
  getAll: () => api.get('/templates'),
  create: (title, text) => api.post('/templates', { title, text }),
  remove: (templateId) => api.delete(`/templates/${templateId}`),
}

export const groupsAPI = {
  getAll: () => api.get('/groups'),
  importMembers: (telegramId) => api.post(`/groups/${telegramId}/import-members`),
}

export const kanbanAPI = {
  getColumns: () => api.get('/kanban/columns'),
  createColumn: (label, color) => api.post('/kanban/columns', { label, color }),
  updateColumn: (columnId, data) => api.put(`/kanban/columns/${columnId}`, data),
}

export const healthAPI = {
  check: () => api.get('/health'),
}

export const statsAPI = {
  getSummary: () => api.get('/stats/summary'),
}

export const connectWebSocket = () => {
  const ws = new WebSocket('ws://localhost:8000/ws')
  return ws
}

export default api
