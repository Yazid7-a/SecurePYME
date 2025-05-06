from sqlmodel import Session
from typing import Dict, List
from .models import RiskRule

# Datos predeterminados de reglas de riesgo (pueden cargarse desde la DB después)
DEFAULT_RISK_RULES = {
    22: {
        "service_name": "SSH",
        "risk_level": "High",
        "description": "Puerto SSH expuesto a ataques de fuerza bruta",
        "recommendation": "Restrinja el acceso con IP whitelist o use VPN"
    },
    3389: {
        "service_name": "RDP",
        "risk_level": "High",
        "description": "Escritorio remoto (RDP) accesible desde internet",
        "recommendation": "Deshabilite RDP o implemente autenticación multifactor"
    },
    80: {
        "service_name": "HTTP",
        "risk_level": "Medium",
        "description": "Tráfico web sin cifrar",
        "recommendation": "Redirija a HTTPS y actualice a TLS 1.2+"
    },
    443: {
        "service_name": "HTTPS",
        "risk_level": "Low",
        "description": "Tráfico web cifrado",
        "recommendation": "Verifique que el certificado SSL sea válido"
    },
    3306: {
        "service_name": "MySQL",
        "risk_level": "Critical",
        "description": "Base de datos MySQL expuesta",
        "recommendation": "Bloquee el acceso externo y use SSH tunneling"
    }
}

def calculate_risk(scan_data: Dict, db: Session) -> Dict:
    """
    Calcula el puntaje de riesgo (0-100) y genera recomendaciones basadas en puertos abiertos.
    
    Args:
        scan_data: Diccionario con los resultados del escaneo (ej: {"open_ports": [22, 80], ...}).
        db: Sesión de SQLModel para consultar reglas desde la DB.
    
    Returns:
        Dict: Ejemplo: {
            "score": 70,
            "findings": [
                {"port": 22, "risk": "High", "recommendation": "Restrinja el acceso..."},
                ...
            ]
        }
    """
    open_ports = scan_data.get("open_ports", [])
    total_score = 100  # Puntaje inicial (100 = seguro)
    findings = []

    for port in open_ports:
        # Buscar regla en la DB o usar las predeterminadas
        risk_rule = db.query(RiskRule).filter(RiskRule.port == port).first()
        
        if not risk_rule:  # Si no existe en DB, usar reglas predeterminadas
            rule_data = DEFAULT_RISK_RULES.get(port)
            if not rule_data:
                continue  # Si el puerto no está en las reglas, se ignora
            
            risk_rule = RiskRule(
                port=port,
                service_name=rule_data["service_name"],
                risk_level=rule_data["risk_level"],
                description=rule_data["description"],
                recommendation=rule_data["recommendation"]
            )

        # Calcular penalización al puntaje según el riesgo
        penalty = {
            "Critical": 30,
            "High": 20,
            "Medium": 10,
            "Low": 5
        }.get(risk_rule.risk_level, 0)

        total_score -= penalty

        # Agregar hallazgo
        findings.append({
            "port": port,
            "service": risk_rule.service_name,
            "risk": risk_rule.risk_level,
            "description": risk_rule.description,
            "recommendation": risk_rule.recommendation
        })

    # Asegurar que el puntaje no sea negativo
    total_score = max(total_score, 0)

    return {
        "score": total_score,
        "findings": findings
    }

def initialize_risk_rules(db: Session):
    """Carga las reglas predeterminadas en la base de datos (opcional)."""
    for port, rule_data in DEFAULT_RISK_RULES.items():
        if not db.query(RiskRule).filter(RiskRule.port == port).first():
            db_rule = RiskRule(
                port=port,
                service_name=rule_data["service_name"],
                risk_level=rule_data["risk_level"],
                description=rule_data["description"],
                recommendation=rule_data["recommendation"]
            )
            db.add(db_rule)
    db.commit()