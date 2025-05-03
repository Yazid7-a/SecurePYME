from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import subprocess
import re
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from backend.database import get_session, crear_tablas
from backend import crud
from backend.models import Usuario, Escaneo  # NEW: Añadido Escaneo
from backend.auth import crear_token_jwt, get_current_user
from backend.risk_engine import calculate_risk  # NEW: Importar el motor de riesgo

app = FastAPI()

# CORS para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas al iniciar
@app.on_event("startup")
def on_startup():
    crear_tablas()

# ===========================
# Validaciones
# ===========================

def es_host_valido(host: str) -> bool:
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    domain_pattern = r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,6})+$"
    return bool(re.match(ip_pattern, host) or re.match(domain_pattern, host))

def validar_usuario_password(username: str, password: str) -> None:
    if not re.match(r"^[A-Za-z0-9_-]{4,}$", username):
        raise HTTPException(status_code=400, detail="Usuario debe tener al menos 4 caracteres.")
    if len(password) < 6 or not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(status_code=400, detail="Contraseña debe tener al menos 6 caracteres, una letra y un número.")

# ===========================
# Modelos Pydantic
# ===========================

class UsuarioInput(BaseModel):
    username: str
    password: str

class ScanResponse(BaseModel):
    host: str
    ports: list[dict]
    risk_score: Optional[int] = None  # NEW: Campo para el puntaje de riesgo
    findings: Optional[list] = None  # NEW: Campo para hallazgos de riesgo

# ===========================
# Endpoints
# ===========================

@app.post("/register/")
def register(usuario: UsuarioInput, session: Session = Depends(get_session)):
    validar_usuario_password(usuario.username, usuario.password)
    crud.crear_usuario(session, usuario.username, usuario.password)
    return {"mensaje": "Usuario registrado correctamente."}

@app.post("/login/")
def login(usuario: UsuarioInput, session: Session = Depends(get_session)):
    try:
        if crud.verificar_credenciales(session, usuario.username, usuario.password):
            return {"mensaje": "Login correcto."}
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    except HTTPException as e:
        raise e

@app.post("/token/")
def login_con_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    from backend.crud import verificar_credenciales

    username = form_data.username
    password = form_data.password

    if not verificar_credenciales(session, username, password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    token = crear_token_jwt({"sub": username})
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/")
def root():
    return {"message": "API SecurePYME funcionando"}

@app.get("/scan/", response_model=ScanResponse)
def scan_host(
    host: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not es_host_valido(host):
        raise HTTPException(status_code=400, detail="Formato de host no válido.")

    try:
        # Ejecutar nmap y procesar resultados (existente)
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

        puertos_numeros = [int(p["port"].split("/")[0]) for p in ports]  # NEW: Convertir a números
        
        # NEW: Calcular riesgo
        risk_report = calculate_risk(
            {"open_ports": puertos_numeros},
            session
        )

        # NEW: Registrar escaneo con datos de riesgo
        escaneo = crud.registrar_escaneo(
            session,
            host,
            ",".join(map(str, puertos_numeros)),
            current_user.id,
            risk_score=risk_report["score"],
            findings=risk_report["findings"]
        )

        return {
            "host": host,
            "ports": ports,
            "risk_score": risk_report["score"],  # NEW
            "findings": risk_report["findings"]  # NEW
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="El escaneo tardó demasiado en responder.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error realizando el escaneo: {str(e)}")

@app.get("/historial/")
def obtener_historial(
    limite: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    escaneos = crud.obtener_historial(session, current_user.id, limite)
    return [
        {
            "host": e.host,
            "fecha": e.fecha,
            "puertos": e.puertos_abiertos.split(","),
            "risk_score": e.risk_score,  # NEW
            "findings": e.get_findings()  # NEW: Usa el método del modelo
        }
        for e in escaneos
    ]