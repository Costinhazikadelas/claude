import os
import sys
import subprocess
import threading
import time
from pathlib import Path

# Adicionar cores no Windows
os.system('color')

class CRMLauncher:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.base_dir = Path(__file__).parent

    def print_header(self, text):
        print("\n" + "="*50)
        print(f"  {text}")
        print("="*50 + "\n")

    def setup(self):
        """Instala dependências"""
        self.print_header("⚙️  CONFIGURANDO SISTEMA")

        # Check Python
        print("🔍 Verificando Python...")
        result = os.system("py --version >nul 2>&1")
        if result != 0:
            print("❌ ERRO: Python não está instalado!")
            print("\n📥 Baixe em: https://www.python.org/downloads/")
            print("   ⚠️  Marque a opção 'Add Python to PATH' durante instalação\n")
            input("Pressione ENTER para sair...")
            sys.exit(1)
        print("✅ Python encontrado\n")

        # Check Node
        print("🔍 Verificando Node.js...")
        result = os.system("node --version >nul 2>&1")
        if result != 0:
            print("❌ ERRO: Node.js não está instalado!")
            print("\n📥 Baixe em: https://nodejs.org/")
            print("   Instale e reinicie este programa\n")
            input("Pressione ENTER para sair...")
            sys.exit(1)
        print("✅ Node.js encontrado\n")

        # Setup Backend
        print("📦 Instalando Backend...")
        backend_dir = self.base_dir / "backend"
        venv_dir = backend_dir / "venv"

        if not venv_dir.exists():
            os.system(f"cd {backend_dir} && py -m venv venv")

        pip_cmd = str(venv_dir / "Scripts" / "pip.exe")
        os.system(f'"{pip_cmd}" install -q -r "{backend_dir / "requirements.txt"}"')
        print("✅ Backend pronto\n")

        # Setup Frontend
        print("📦 Instalando Frontend...")
        frontend_dir = self.base_dir / "frontend"

        if not (frontend_dir / "node_modules").exists():
            os.system(f"cd {frontend_dir} && npm install -q")

        print("✅ Frontend pronto\n")

        self.print_header("✅ SETUP CONCLUÍDO!")

    def start_backend(self):
        """Inicia Backend"""
        backend_dir = self.base_dir / "backend"
        python_exe = backend_dir / "venv" / "Scripts" / "python.exe"

        print("🚀 Iniciando Backend...")
        self.backend_process = subprocess.Popen(
            [str(python_exe), "main.py"],
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print("✅ Backend rodando\n")
        time.sleep(2)

    def start_frontend(self):
        """Inicia Frontend"""
        frontend_dir = self.base_dir / "frontend"

        print("🚀 Iniciando Frontend...")
        self.frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print("✅ Frontend rodando\n")
        time.sleep(3)

    def open_browser(self):
        """Abre navegador"""
        print("🌐 Abrindo navegador...")
        time.sleep(2)
        os.system("start http://localhost:3000")

    def run(self):
        """Fluxo principal"""
        try:
            self.print_header("🚀 TELEGRAM CRM")

            # Verifica se já foi feito setup
            if not (self.base_dir / "backend" / "venv").exists():
                self.setup()
                os.system("cls")

            self.print_header("INICIANDO APLICAÇÃO")

            # Inicia serviços
            backend_thread = threading.Thread(target=self.start_backend)
            frontend_thread = threading.Thread(target=self.start_frontend)
            browser_thread = threading.Thread(target=self.open_browser)

            backend_thread.daemon = True
            frontend_thread.daemon = True
            browser_thread.daemon = True

            backend_thread.start()
            frontend_thread.start()
            browser_thread.start()

            self.print_header("✅ TUDO RODANDO!")

            print("📊 Backend:  http://localhost:8000")
            print("🌐 Frontend: http://localhost:3000\n")
            print("✨ Seu navegador vai abrir em alguns segundos...\n")
            print("="*50)
            print("  💬 Insira seu telefone com código do país")
            print("  Exemplo: +55 11 99999-9999")
            print("="*50 + "\n")

            # Aguarda até o usuário fechar
            print("⏸️  Pressione CTRL+C para parar\n")

            while True:
                time.sleep(1)

        except KeyboardInterrupt:
            print("\n\n🛑 Encerrando...")
            if self.backend_process:
                self.backend_process.terminate()
            if self.frontend_process:
                self.frontend_process.terminate()
            print("✅ Encerrado")
            sys.exit(0)
        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            input("Pressione ENTER para sair...")
            sys.exit(1)

if __name__ == "__main__":
    launcher = CRMLauncher()
    launcher.run()
