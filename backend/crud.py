# backend/crud.py
from sqlmodel import Session, select
from datetime import datetime
from backend.models import Usuario, Escaneo
from fastapi import HTTPException
import bcrypt
from datetime import datetime, timedelta

# ======================
# USUARIOS
# ======================

def obtener_usuario_por_username(session: Session, username: str) -> Usuario | None:
    statement = select(Usuario).where(Usuario.username == username)
    return session.exec(statement).first()


def crear_usuario(session: Session, username: str, password: str) -> Usuario:
    if obtener_usuario_por_username(session, username):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    nuevo_usuario = Usuario(username=username, hashed_password=hashed_password)
    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)
    return nuevo_usuario


BLOQUEO_MINUTOS = 5
MAX_INTENTOS = 5

def verificar_credenciales(session: Session, username: str, password: str) -> bool:
    usuario = obtener_usuario_por_username(session, username)
    if not usuario:
        return False

    ahora = datetime.utcnow()

    # Si está bloqueado
    if usuario.bloqueado_hasta and ahora < usuario.bloqueado_hasta:
        raise HTTPException(status_code=403, detail="Cuenta bloqueada temporalmente. Intenta más tarde.")

    # Verificar contraseña
    if bcrypt.checkpw(password.encode('utf-8'), usuario.hashed_password.encode('utf-8')):
        # Resetear intentos al ingresar correctamente
        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        session.commit()
        return True
    else:
        usuario.intentos_fallidos += 1
        if usuario.intentos_fallidos >= MAX_INTENTOS:
            usuario.bloqueado_hasta = ahora + timedelta(minutes=BLOQUEO_MINUTOS)
        session.commit()
        return False



# ======================
# ESCANEOS
# ======================

def registrar_escaneo(session: Session, host: str, puertos_abiertos: list[str], user_id: int) -> Escaneo:
    escaneo = Escaneo(
        host=host,
        puertos_abiertos=",".join(puertos_abiertos),
        fecha=datetime.utcnow(),
        user_id=user_id
    )
    session.add(escaneo)
    session.commit()
    session.refresh(escaneo)
    return escaneo


def obtener_historial(session: Session, user_id: int, limite: int | None = None) -> list[Escaneo]:
    statement = select(Escaneo).where(Escaneo.user_id == user_id).order_by(Escaneo.fecha.desc())
    if limite:
        statement = statement.limit(limite)
    return session.exec(statement).all()
