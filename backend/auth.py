from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from backend.database import get_session
from backend.crud import obtener_usuario_por_username
from backend.models import Usuario

# Clave secreta para firmar los tokens (genera una fuerte para producción)
SECRET_KEY = "securepyme_supersecret_jwt_key"
ALGORITHM = "HS256"
EXPIRACION_MINUTOS = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def crear_token_jwt(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=EXPIRACION_MINUTOS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str, session: Session) -> Usuario:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credenciales_invalidas
    except JWTError:
        raise credenciales_invalidas

    usuario = obtener_usuario_por_username(session, username)
    if usuario is None:
        raise credenciales_invalidas
    return usuario

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Usuario:
    return verificar_token(token, session)
