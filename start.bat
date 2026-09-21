@echo off
cd /d "%~dp0"

echo ================================================
echo   Telegram CRM - Iniciando
echo ================================================
echo.

echo Iniciando Backend...
cd backend
call venv\Scripts\activate.bat
start "Telegram CRM - Backend" cmd /k python main.py
cd ..
timeout /t 2 /nobreak >nul

echo Iniciando Frontend...
cd frontend
start "Telegram CRM - Frontend" cmd /k npm run dev
cd ..

echo.
echo ================================================
echo   Tudo esta rodando!
echo ================================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.

echo Abrindo navegador em 3 segundos...
timeout /t 3 /nobreak >nul

start http://localhost:3000

echo.
echo Feche esta janela para parar os servicos.
pause
