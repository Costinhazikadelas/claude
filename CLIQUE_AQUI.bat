@echo off
chcp 65001 >nul
cls

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║                                                      ║
echo ║         🚀 TELEGRAM CRM - INICIANDO...             ║
echo ║                                                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Instala dependências se necessário
if not exist "backend\venv" (
    echo Instalando Backend (primeira vez - aguarde...)
    cd backend
    py -m venv venv
    call venv\Scripts\activate.bat
    pip install -q -r requirements.txt
    cd ..
)

if not exist "frontend\node_modules" (
    echo Instalando Frontend (primeira vez - aguarde...)
    cd frontend
    call npm install -q
    cd ..
)

echo.
echo ✅ Tudo pronto! Iniciando...
echo.

REM Inicia Backend
cd backend
call venv\Scripts\activate.bat
start "Backend" cmd /k python main.py
cd ..

timeout /t 3 /nobreak

REM Inicia Frontend
cd frontend
start "Frontend" cmd /k npm run dev
cd ..

echo.
echo 🌐 Abrindo navegador em 5 segundos...
timeout /t 5 /nobreak

start http://localhost:3000

echo ✅ Pronto! Seu CRM está rodando!
pause
