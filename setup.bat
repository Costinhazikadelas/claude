@echo off
chcp 65001 >nul
cls

echo.
echo ═══════════════════════════════════════
echo   Telegram CRM - Setup Automático
echo ═══════════════════════════════════════
echo.

REM Check Python
echo Verificando Python...
py --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado!
    echo Instale em: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✓ Python encontrado
echo.

REM Check Node
echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado!
    echo Instale em: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js encontrado
echo.

REM Setup Backend
echo Configurando Backend...
cd backend

if not exist "venv" (
    py -m venv venv
)

call venv\Scripts\activate.bat

pip install -q -r requirements.txt

echo ✓ Backend configurado
echo.

cd ..

REM Setup Frontend
echo Configurando Frontend...
cd frontend

if not exist "node_modules" (
    npm install -q
)

echo ✓ Frontend configurado
echo.

cd ..

cls

echo.
echo ═══════════════════════════════════════
echo   ✅ Setup Completo!
echo ═══════════════════════════════════════
echo.

echo Para iniciar o CRM, execute:
echo start.bat
echo.

pause
