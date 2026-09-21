#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Telegram CRM - Iniciando...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Encerrando serviços...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${YELLOW}Iniciando Backend...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
sleep 2
cd ..

# Start Frontend
echo -e "${YELLOW}Iniciando Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
cd ..

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Tudo está rodando!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "${BLUE}Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}Frontend:${NC} http://localhost:3000\n"

echo -e "${YELLOW}Abra http://localhost:3000 no navegador${NC}"
echo -e "${YELLOW}Pressione CTRL+C para parar${NC}\n"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
