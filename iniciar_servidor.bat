@echo off
title Servidor Findly - NO CERRAR
echo Iniciando servidor Findly...
cd /d "C:\Users\34616\Desktop\AppsDani_\Findly 2"
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error al iniciar el servidor. Asegurese de que Python esta instalado.
    pause
)
