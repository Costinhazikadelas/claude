@echo off
cd /d "%~dp0"

echo ================================================
echo   TELEGRAM CRM - INICIANDO
echo ================================================
echo.

if not exist "backend\venv" (
    echo Instalando Backend pela primeira vez, aguarde...
    cd backend
    py -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
)

if not exist "frontend\node_modules" (
    echo Instalando Frontend pela primeira vez, aguarde...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Tudo pronto! Iniciando servidores...
echo.

cd backend
call venv\Scripts\activate.bat
start "Backend - Telegram CRM" cmd /k python main.py
cd ..

timeout /t 3 /nobreak >nul

cd frontend
start "Frontend - Telegram CRM" cmd /k npm run dev
cd ..

echo.
echo Abrindo navegador em 5 segundos...
timeout /t 5 /nobreak >nul

start http://localhost:3000

echo.
echo Pronto! O CRM esta rodando.
echo Se o navegador nao abrir sozinho, acesse: http://localhost:3000
echo.
pause
