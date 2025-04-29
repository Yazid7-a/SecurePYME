# backend/database.py
from sqlmodel import SQLModel, Session, create_engine

# Nombre del archivo SQLite (puedes cambiarlo por un string de conexión PostgreSQL luego)
DATABASE_URL = "sqlite:///securepyme.db"

# Conexión a la base de datos
engine = create_engine(DATABASE_URL, echo=False)


def crear_tablas():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
