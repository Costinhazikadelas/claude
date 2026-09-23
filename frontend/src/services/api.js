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
  getAll: (skip = 0, limit = 50) => api.get('/chats', { params: { skip, limit } }),
  getMessages: (chatId, skip = 0, limit = 50) =>
    api.get(`/chats/${chatId}/messages`, { params: { skip, limit } }),
  sendMessage: (chatId, text) =>
    api.post('/messages/send', { chat_id: chatId, text }),
}

export const contactsAPI = {
  getAll: (skip = 0, limit = 50) => api.get('/contacts', { params: { skip, limit } }),
}

export const leadsAPI = {
  getAll: (status, skip = 0, limit = 50) =>
    api.get('/leads', { params: { status, skip, limit } }),
  update: (leadId, data) => api.put(`/leads/${leadId}`, data),
}

export const kanbanAPI = {
  getColumns: () => api.get('/kanban/columns'),
  createColumn: (label, color) => api.post('/kanban/columns', { label, color }),
  updateColumn: (columnId, data) => api.put(`/kanban/columns/${columnId}`, data),
}

export const healthAPI = {
  check: () => api.get('/health'),
}

export const connectWebSocket = () => {
  const ws = new WebSocket('ws://localhost:8000/ws')
  return ws
}

export default api
