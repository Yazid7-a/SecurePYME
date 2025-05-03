# backend/database.py
from sqlmodel import SQLModel, Session, create_engine, select
from .models import Usuario, Escaneo, RiskRule
from .crud import inicializar_reglas_riesgo
import logging

# Configuración de la base de datos
DATABASE_URL = "sqlite:///securepyme.db"
engine = create_engine(
    DATABASE_URL, 
    echo=False,  # Cambiar a True para debug
    connect_args={"check_same_thread": False}  # Necesario para SQLite
)

def crear_tablas():
    """Crea todas las tablas definidas en los modelos SQLModel"""
    try:
        SQLModel.metadata.create_all(engine)
        logging.info("Tablas creadas exitosamente")
        
        # Inicializar datos básicos de riesgo
        with Session(engine) as session:
            if not session.exec(select(RiskRule)).first():
                inicializar_reglas_riesgo(session)
                logging.info("Reglas de riesgo inicializadas")
                
    except Exception as e:
        logging.error(f"Error al crear tablas: {e}")
        raise

def get_session():
    """Generador de sesiones para dependencias de FastAPI"""
    with Session(engine) as session:
        yield session

def reset_database():
    """Función para desarrollo: Elimina y recrea la base de datos"""
    import os
    if os.path.exists("securepyme.db"):
        os.remove("securepyme.db")
    crear_tablas()