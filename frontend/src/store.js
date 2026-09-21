import { create } from 'zustand'

export const useStore = create((set) => ({
  // Auth
  isAuthenticated: false,
  isAuthenticating: false,
  phoneCodeHash: null,
  phone: null,

  // Data
  chats: [],
  selectedChat: null,
  messages: [],
  contacts: [],
  leads: [],

  // UI
  sidebarOpen: true,
  activeTab: 'chats', // chats, contacts, leads
  importInProgress: false,

  // WebSocket
  wsConnected: false,

  // Actions
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setAuthenticating: (value) => set({ isAuthenticating: value }),
  setPhoneCodeHash: (hash) => set({ phoneCodeHash: hash }),
  setPhone: (phone) => set({ phone }),

  setChats: (chats) => set({ chats }),
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  setMessages: (messages) => set({ messages }),
  setContacts: (contacts) => set({ contacts }),
  setLeads: (leads) => set({ leads }),

  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setImportInProgress: (value) => set({ importInProgress: value }),

  setWsConnected: (value) => set({ wsConnected: value }),

  // Add new message to messages list
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  // Update unread count for chat
  updateChatUnread: (chatId, count) => set((state) => ({
    chats: state.chats.map(chat =>
      chat.telegram_id === chatId ? { ...chat, unread_count: count } : chat
    )
  })),
}))
