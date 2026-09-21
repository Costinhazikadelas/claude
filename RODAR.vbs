Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Pega o diretório atual
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Executa o programa Python
strCmd = "python """ & strPath & "\run.py"""

objShell.Run strCmd, 1, False
