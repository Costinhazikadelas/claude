@echo off
cd /d "%~dp0"

echo ================================================
echo   Telegram CRM - Setup
echo ================================================
echo.

echo Verificando Python...
py --version >nul 2>&1
if errorlevel 1 (
    echo Python nao encontrado!
    echo Instale em: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo OK - Python encontrado
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js nao encontrado!
    echo Instale em: https://nodejs.org/
    pause
    exit /b 1
)
echo OK - Node.js encontrado
echo.

echo Configurando Backend...
cd backend

if not exist ".env" (
    echo Criando arquivo de configuracao .env ...
    (
        echo API_ID=39680106
        echo API_HASH=f9833df7856684c660770995ea64131a
        echo DATABASE_URL=sqlite:///telegram_crm.db
        echo HOST=0.0.0.0
        echo PORT=8000
        echo DEBUG=False
    ) > .env
)

if not exist "venv" (
    py -m venv venv
)

call venv\Scripts\activate.bat

pip install -r requirements.txt

echo OK - Backend configurado
echo.

cd ..

echo Configurando Frontend...
cd frontend

if not exist "node_modules" (
    call npm install
)

echo OK - Frontend configurado
echo.

cd ..

echo ================================================
echo   Setup completo!
echo ================================================
echo.
echo Para iniciar o CRM, execute: start.bat
echo.

pause
