# backend/models.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
import json  # Para manejar el campo 'findings' como JSON

class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, min_length=3, max_length=50)
    hashed_password: str
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[datetime] = None

    escaneos: List["Escaneo"] = Relationship(back_populates="usuario")
    risk_rules: List["RiskRule"] = Relationship(back_populates="usuario")  # Opcional: si quieres reglas por usuario

class Escaneo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    host: str = Field(index=True)
    puertos_abiertos: str  # Se almacena como string "22,80,443"
    fecha: datetime = Field(default_factory=datetime.utcnow)
    risk_score: Optional[int] = Field(default=None)  # Nuevo: Puntaje de riesgo (0-100)
    findings: Optional[str] = Field(default=None)  # Nuevo: JSON con hallazgos de riesgo

    user_id: int = Field(foreign_key="usuario.id")
    usuario: Optional[Usuario] = Relationship(back_populates="escaneos")

    # Método para convertir findings (str JSON) a dict
    def get_findings(self) -> Dict[str, Any]:
        return json.loads(self.findings) if self.findings else {}

    # Método para guardar findings como JSON string
    def set_findings(self, findings: Dict[str, Any]):
        self.findings = json.dumps(findings)

class RiskRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    port: int = Field(index=True)  # Puerto asociado a la regla
    service_name: str  # Nombre del servicio (ej: "SSH")
    risk_level: str  # Nivel de riesgo: "Low", "Medium", "High", "Critical"
    description: str  # Descripción del riesgo
    recommendation: str  # Recomendación para mitigar

    # Opcional: si quieres asociar reglas a usuarios específicos
    user_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    usuario: Optional[Usuario] = Relationship(back_populates="risk_rules")