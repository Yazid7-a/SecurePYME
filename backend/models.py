# backend/models.py
from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship


class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, min_length=3, max_length=50)
    hashed_password: str
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[datetime] = None

    escaneos: List["Escaneo"] = Relationship(back_populates="usuario")


class Escaneo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    host: str = Field(index=True)
    puertos_abiertos: str  # Se puede almacenar como string tipo "22,80,443"
    fecha: datetime = Field(default_factory=datetime.utcnow)

    user_id: int = Field(foreign_key="usuario.id")
    usuario: Optional[Usuario] = Relationship(back_populates="escaneos")
