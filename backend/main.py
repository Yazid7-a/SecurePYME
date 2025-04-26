from fastapi import FastAPI
import subprocess

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Activar CORS para permitir conexiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # puedes especificar "http://127.0.0.1:5500" si prefieres limitar
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        return {
            "host": host,
            "ports": ports
        }

    except Exception as e:
        return {"error": str(e)}


