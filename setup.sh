#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Telegram CRM - Setup Automático${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

# Check Python
echo -e "${YELLOW}Verificando Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado! Instale em: https://www.python.org/downloads/"
    exit 1
fi
echo -e "${GREEN}✓ Python encontrado${NC}\n"

# Check Node
echo -e "${YELLOW}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado! Instale em: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js encontrado${NC}\n"

# Setup Backend
echo -e "${YELLOW}Configurando Backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

pip install -q -r requirements.txt
echo -e "${GREEN}✓ Backend configurado${NC}\n"

cd ..

# Setup Frontend
echo -e "${YELLOW}Configurando Frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    npm install -q
fi

echo -e "${GREEN}✓ Frontend configurado${NC}\n"

cd ..

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Setup Completo!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "${BLUE}Para iniciar o CRM, execute:${NC}"
echo -e "${YELLOW}./start.sh${NC}\n"

echo "Aguardando 2 segundos..."
sleep 2
