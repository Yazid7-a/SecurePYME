from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os

app = FastAPI()

# Activar CORS para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # puedes especificar "http://127.0.0.1:5500" si prefieres limitar
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Usuario(BaseModel):
    username: str
    password: str

@app.post("/register/")
def register(usuario: Usuario):
    # Verificamos si el archivo existe
    if not os.path.exists("usuarios.json"):
        usuarios = []
    else:
        with open("usuarios.json", "r", encoding="utf-8") as f:
            usuarios = json.load(f)

    # Comprobamos si el usuario ya existe
    for u in usuarios:
        if u["username"] == usuario.username:
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")

    # Creamos nuevo usuario
    nuevo_usuario = {
        "username": usuario.username,
        "password": usuario.password,
        "registro_fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    usuarios.append(nuevo_usuario)

    # Guardamos el nuevo usuario
    with open("usuarios.json", "w", encoding="utf-8") as f:
        json.dump(usuarios, f, indent=4, ensure_ascii=False)

    return {"mensaje": "Usuario registrado correctamente."}

@app.post("/login/")
def login(usuario: Usuario):
    # Comprobamos si existe el archivo usuarios.json
    if not os.path.exists("usuarios.json"):
        raise HTTPException(status_code=400, detail="No hay usuarios registrados aún.")

    # Cargamos los usuarios registrados
    with open("usuarios.json", "r", encoding="utf-8") as f:
        usuarios = json.load(f)

    # Buscamos si el usuario y contraseña coinciden
    for u in usuarios:
        if u["username"] == usuario.username and u["password"] == usuario.password:
            return {"mensaje": "Login correcto."}

    # Si no se encuentra coincidencia
    raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")

@app.get("/")
def root():
    return {"message": "API SecurePYME funcionando"}

@app.get("/scan/")
def scan_host(host: str):
    try:
        result = subprocess.run(["nmap", "-F", host], capture_output=True, text=True, timeout=10)
        lines = result.stdout.splitlines()

        ports = []
        parsing = False
        for line in lines:
            if line.startswith("PORT"):
                parsing = True
                continue
            if parsing:
                parts = line.split()
                if len(parts) >= 3:
                    ports.append({
                        "port": parts[0],
                        "state": parts[1],
                        "service": parts[2]
                    })

        # ✨ AQUÍ añadimos guardar el historial
        guardar_en_historial(host, ports)

        return {
            "host": host,
            "ports": ports
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/historial/")
def obtener_historial(limite: Optional[int] = None):
    try:
        with open("historial.json", "r", encoding="utf-8") as f:
            historial = json.load(f)

        if limite is not None:
            historial = historial[-limite:]  # Devolvemos solo los últimos 'limite' registros

        return historial

    except FileNotFoundError:
        return {"mensaje": "No hay escaneos en el historial todavía."}
    except Exception as e:
        return {"error": str(e)}
    
def guardar_en_historial(host, puertos):
    historial = []

    try:
        # Intentamos leer el historial actual
        with open("historial.json", "r", encoding="utf-8") as f:
            historial = json.load(f)
    except FileNotFoundError:
        # Si no existe el archivo, empezamos con una lista vacía
        historial = []

    # Creamos el nuevo registro
    nuevo_registro = {
        "host": host,
        "fecha_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "puertos": [
            {"puerto": p["port"], "servicio": p["service"], "estado": p["state"]}
            for p in puertos
        ]
    }

    # Añadimos el nuevo escaneo al historial
    historial.append(nuevo_registro)

    # Guardamos de nuevo todo el historial
    with open("historial.json", "w", encoding="utf-8") as f:
        json.dump(historial, f, indent=4, ensure_ascii=False)
