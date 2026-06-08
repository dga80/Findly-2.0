Set WshShell = CreateObject("WScript.Shell")
' Ejecuta el servidor Python en segundo plano (0 oculta la ventana)
WshShell.Run "python """ & "C:\Users\34616\Desktop\AppsDani_\Findly 2\server.py" & """", 0, False

' Espera un segundo para asegurar que el servidor arranque antes de abrir el navegador
WScript.Sleep 1000

' Abre el archivo index.html en el navegador predeterminado
WshShell.Run """" & "C:\Users\34616\Desktop\AppsDani_\Findly 2\index_2.html" & """"
