# Telegram CRM

Um CRM completo baseado em Telegram que sincroniza mensagens em tempo real e gerencia seus leads.

## Características

✨ **Sincronização em Tempo Real**
- Importação automática de todo histórico de chats e mensagens
- Listeners ativos para novas mensagens
- WebSocket para updates em tempo real

💼 **Dashboard Corporativo**
- Layout estilo Salesforce
- Gerenciamento de leads com status
- Estatísticas de chats, leads qualificados e deals fechados
- Tags e notas para cada lead

🔐 **Autenticação Segura**
- Login com conta pessoal do Telegram
- Suporte para 2FA (quando configurado)

## Requisitos

- Python 3.8+
- Node.js 16+
- npm ou yarn

## Setup

### 1. Clonar o Repositório
```bash
git clone <repository-url>
cd telegram-crm
```

### 2. Configurar Backend (Python)

```bash
# Ir para pasta do backend
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### 3. Configurar Frontend (React)

```bash
# Voltar para raiz
cd ..

# Ir para pasta do frontend
cd frontend

# Instalar dependências
npm install
```

## Executar

### Terminal 1 - Backend

```bash
cd backend

# Ativar venv (se não estiver ativo)
source venv/bin/activate

# Rodar servidor
python main.py
```

O backend vai iniciar em `http://localhost:8000`

### Terminal 2 - Frontend

```bash
cd frontend

# Rodar dev server
npm run dev
```

O frontend vai iniciar em `http://localhost:3000`

## Uso

1. **Abra** `http://localhost:3000` no navegador
2. **Insira** seu número de telefone (com código do país, ex: +55 11 99999-9999)
3. **Aguarde** o código de verificação no Telegram
4. **Digite** o código recebido
5. **Pronto!** O sistema vai importar seu histórico automaticamente

## Fluxo de Funcionamento

### Autenticação
- Login com telefone
- Verificação de código via Telegram
- Backend conecta à sua conta pessoal do Telegram

### Importação de Histórico
- Puxa últimas 100 mensagens de cada chat
- Salva contatos e mensagens no banco de dados
- Cria leads automaticamente para contatos privados
- Pode levar alguns minutos dependendo do volume

### Monitoramento em Tempo Real
- Listener ativo aguarda novas mensagens
- WebSocket notifica frontend de updates
- Mensagens aparecem automaticamente no CRM
- Respostas no CRM são enviadas pelo Telegram

## Arquitetura

### Backend (Python)
- **Telethon**: Cliente do Telegram para conta pessoal
- **FastAPI**: APIs REST
- **SQLAlchemy**: ORM para banco de dados
- **SQLite**: Banco de dados local
- **WebSocket**: Comunicação em tempo real

### Frontend (React)
- **React 18**: UI framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **Zustand**: State management

## Estrutura de Arquivos

```
telegram-crm/
├── backend/
│   ├── main.py           # Backend principal (Telethon + FastAPI)
│   ├── requirements.txt   # Dependências Python
│   └── telegram_session.* # Arquivo de sessão (gerado)
├── frontend/
│   ├── src/
│   │   ├── main.jsx      # Entry point React
│   │   ├── App.jsx       # Componente principal
│   │   ├── store.js      # Zustand store (estado global)
│   │   ├── services/
│   │   │   └── api.js    # Clientes HTTP e WebSocket
│   │   └── components/   # Componentes React
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
├── .gitignore
└── README.md
```

## Banco de Dados

### Tabelas

**contacts**
- telegram_id: ID único no Telegram
- name: Nome do contato
- username: Username do Telegram
- phone: Número de telefone
- is_bot: Se é um bot

**chats**
- telegram_id: ID único do chat
- name: Nome do chat
- is_group: Se é um grupo
- last_message_at: Última mensagem
- unread_count: Mensagens não lidas

**messages**
- telegram_msg_id: ID da mensagem
- sender_id: ID do remetente
- sender_name: Nome do remetente
- chat_id: ID do chat
- text: Conteúdo da mensagem
- is_outgoing: Se foi enviada por você
- timestamp: Data/hora

**leads**
- contact_id: Referência ao contato
- telegram_id: ID no Telegram
- name: Nome do lead
- status: novo, qualificado, negociando, ganho, perdido
- tags: Tags separadas por vírgula
- notes: Notas sobre o lead
- created_at / updated_at: Timestamps

## Logs e Debugging

### Backend
- Todos os eventos são logados no console
- Verifique logs para erros de autenticação ou importação

### Frontend
- Abra DevTools (F12) para verificar console
- WebSocket activity em Network tab

## Problemas Comuns

### "Not authorized" na autenticação
- Certifique-se de inserir o telefone correto
- Verifique se recebeu o código no Telegram

### Mensagens não aparecem em tempo real
- Verifique se WebSocket está conectado (ícone na sidebar)
- Reinicie o frontend se necessário
- Verifique logs do backend

### Taxa de requisições excedida
- Telegram tem limites de requests
- Importação pode ser lenta (normal)
- Aguarde alguns minutos e recarregue

## Melhorias Futuras

- [ ] Suporte a múltiplas contas
- [ ] Exportar dados para Excel/CSV
- [ ] Automatização de respostas
- [ ] Integração com webhooks
- [ ] API pública para integrações
- [ ] Suporte a PostgreSQL
- [ ] Deploy em produção (Docker)

## Licença

MIT

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando Telethon, FastAPI e React**
