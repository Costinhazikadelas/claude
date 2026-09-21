@echo off
chcp 65001 >nul
cls

echo.
echo ═══════════════════════════════════════
echo   Telegram CRM - Iniciando...
echo ═══════════════════════════════════════
echo.

REM Start Backend
echo Iniciando Backend...
cd backend
call venv\Scripts\activate.bat
start "Telegram CRM - Backend" cmd /k python main.py
cd ..
timeout /t 2 /nobreak

REM Start Frontend
echo Iniciando Frontend...
cd frontend
start "Telegram CRM - Frontend" cmd /k npm run dev
cd ..

cls

echo.
echo ═══════════════════════════════════════
echo   ✅ Tudo está rodando!
echo ═══════════════════════════════════════
echo.

echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.

echo Abrindo navegador em 3 segundos...
timeout /t 3 /nobreak

REM Try to open browser
start http://localhost:3000

echo.
echo Feche esta janela para parar os serviços.
pause
