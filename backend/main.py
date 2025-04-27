from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
import bcrypt

app = FastAPI()

# Activar CORS para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Puedes especificar "http://127.0.0.1:5500" si prefieres limitar
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Definición del modelo de datos para usuarios
class Usuario(BaseModel):
    username: str
    password: str

# --- ENDPOINTS ---

@app.post("/register/")
def register(usuario: Usuario):
    usuarios = []

    # Cargar usuarios existentes si el archivo existe
    if os.path.exists("usuarios.json"):
        with open("usuarios.json", "r", encoding="utf-8") as f:
            contenido = f.read().strip()
            if contenido:
                usuarios = json.loads(contenido)

    # Comprobar si el usuario ya existe
    if any(u["username"] == usuario.username for u in usuarios):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")

    # Crear el nuevo usuario cifrando la contraseña
    nuevo_usuario = {
        "username": usuario.username,
        "password": bcrypt.hashpw(usuario.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        "registro_fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    usuarios.append(nuevo_usuario)

    # Guardar el usuario actualizado
    with open("usuarios.json", "w", encoding="utf-8") as f:
        json.dump(usuarios, f, indent=4, ensure_ascii=False)

    return {"mensaje": "Usuario registrado correctamente."}

@app.post("/login/")
def login(usuario: Usuario):
    if not os.path.exists("usuarios.json"):
        raise HTTPException(status_code=400, detail="No hay usuarios registrados aún.")

    with open("usuarios.json", "r", encoding="utf-8") as f:
        contenido = f.read().strip()
        if contenido:
            usuarios = json.loads(contenido)
        else:
            usuarios = []

    for u in usuarios:
        if u["username"] == usuario.username and bcrypt.checkpw(usuario.password.encode('utf-8'), u["password"].encode('utf-8')):
            return {"mensaje": "Login correcto."}

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

        guardar_en_historial(host, ports)

        return {
            "host": host,
            "ports": ports
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="El escaneo tardó demasiado en responder.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error realizando el escaneo: {str(e)}")

@app.get("/historial/")
def obtener_historial(limite: Optional[int] = None):
    try:
        if not os.path.exists("historial.json"):
            return []

        with open("historial.json", "r", encoding="utf-8") as f:
            contenido = f.read().strip()
            if not contenido:
                return []

            historial = json.loads(contenido)

        if limite is not None:
            historial = historial[-limite:]

        return historial

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial: {str(e)}")

# --- FUNCIONES AUXILIARES ---

def guardar_en_historial(host, puertos):
    historial = []

    try:
        if os.path.exists("historial.json"):
            with open("historial.json", "r", encoding="utf-8") as f:
                contenido = f.read().strip()
                if contenido:
                    historial = json.loads(contenido)
    except Exception:
        historial = []

    nuevo_registro = {
        "host": host,
        "fecha_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "puertos": [
            {"puerto": p["port"], "servicio": p["service"], "estado": p["state"]}
            for p in puertos
        ]
    }

    historial.append(nuevo_registro)

    with open("historial.json", "w", encoding="utf-8") as f:
        json.dump(historial, f, indent=4, ensure_ascii=False)
