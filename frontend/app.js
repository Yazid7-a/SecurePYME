window.onload = () => {
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  if (!token || !usuario) {
    mostrarNotificacion("Debes iniciar sesión para acceder al sistema", "error");
    setTimeout(() => window.location.href = "login.html", 2000);
  } else {
    document.getElementById("username-display").textContent = usuario;
    document.getElementById("profile-username").textContent = usuario;
    document.getElementById("total-scans").textContent =
      `${localStorage.getItem('total_scans') || '0'} realizados`;

    actualizarEstadisticas();
    mostrarVista("welcome");
    initModalTabs();
  }
};

// Función única para mostrar vistas
function mostrarVista(vista) {
  // Ocultar todas las vistas
  document.getElementById("welcome-message").style.display = "none";
  document.getElementById("escanear-view").style.display = "none";
  document.getElementById("historial-view").style.display = "none";
  document.getElementById("perfil-view").style.display = "none";

  // Mostrar la vista seleccionada
  if (vista === "welcome") {
    document.getElementById("welcome-message").style.display = "block";
  } else {
    document.getElementById(`${vista}-view`).style.display = "block";
  }

  // Actualizar botones activos en sidebar
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-target") === vista) {
      btn.classList.add("active");
    }
  });

  // Actualizar título de página
  const titulos = {
    welcome: "Panel de Control",
    escanear: "Escaneo de Seguridad",
    historial: "Historial de Escaneos",
    perfil: "Mi Perfil"
  };
  document.getElementById("page-title").textContent = titulos[vista] || "SecurePYME";

  // Acciones específicas por vista
  if (vista === "historial") verHistorial();
  if (vista === "perfil") actualizarPerfil();
}

function actualizarPerfil() {
  document.getElementById("perfil-usuario").textContent = localStorage.getItem("usuario") || "-";
  document.getElementById("perfil-fecha").textContent = localStorage.getItem("last_scan_date") || "No disponible";
  document.getElementById("perfil-total").textContent = localStorage.getItem("total_scans") || "0";
  document.getElementById("perfil-promedio").textContent = `${localStorage.getItem("avg_risk") || "0"}/100`;
}

function mostrarAyuda() {
  mostrarNotificacion("Ingrese un dominio o IP para comenzar el análisis de seguridad", "info");
}

function cerrarSesion() {
  localStorage.clear();
  mostrarNotificacion("Sesión cerrada correctamente", "success");
  setTimeout(() => (window.location.href = "login.html"), 1500);
}


// Función para inicializar pestañas del modal
function initModalTabs() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Actualizar botones activos
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      
      // Mostrar contenido correspondiente
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

// Función de escaneo mejorada con animación de progreso
async function escanear() {
  const host = document.getElementById("host").value.trim();
  const loader = document.getElementById("loader");
  const resultadosContainer = document.getElementById("resultados");
  const token = localStorage.getItem("token");

  if (!validarHost(host)) {
    mostrarNotificacion('Por favor ingrese un dominio o dirección IP válida', 'error');
    return;
  }

  // Mostrar loader con animación progresiva
  loader.style.display = "block";
  resultadosContainer.style.display = "none";
  
  // Simular progreso de escaneo
  const progressBar = document.querySelector('.progress-bar');
  const progressStages = [30, 60, 85, 100];
  const stageMessages = [
    "Escaneando puertos comunes",
    "Analizando servicios detectados",
    "Buscando vulnerabilidades conocidas",
    "Generando informe de seguridad"
  ];
  
  let currentStage = 0;
  
  const progressInterval = setInterval(() => {
    if (currentStage < progressStages.length) {
      progressBar.style.width = `${progressStages[currentStage]}%`;
      document.querySelector('.scan-stats span:first-child').textContent = stageMessages[currentStage];
      currentStage++;
    }
  }, 1500);

  try {
    const response = await fetch(`http://127.0.0.1:8000/scan/?host=${host}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    // Ocultar loader después de breve pausa
    setTimeout(() => {
      loader.style.display = "none";
      mostrarResultadosEscaneo(data);
    }, 500);

    // Actualizar última fecha de escaneo
    localStorage.setItem('last_scan_date', formatearFechaBonita(new Date()));
    
    // Guardar en historial local
    guardarEnHistorialLocal(data);

  } catch (error) {
    console.error("Error en el escaneo:", error);
    clearInterval(progressInterval);
    loader.style.display = "none";
    mostrarNotificacion(`Error al conectar con el servidor: ${error.message}`, 'error');
  }
}

// Función para mostrar los resultados del escaneo
function mostrarResultadosEscaneo(data) {
  const resultadosContainer = document.getElementById("resultados");
  resultadosContainer.style.display = "block";
  
  // Determinar nivel de riesgo
  const riskScore = data.risk_score || 0;
  let riskLevel = "low";
  let riskLabel = "Bajo Riesgo";
  let riskDescription = "El sistema analizado presenta un buen nivel de seguridad";
  
  if (riskScore < 50) {
    riskLevel = "high";
    riskLabel = "Alto Riesgo";
    riskDescription = "Se encontraron vulnerabilidades críticas que requieren atención inmediata";
  } else if (riskScore < 80) {
    riskLevel = "medium";
    riskLabel = "Riesgo Moderado";
    riskDescription = "Se recomiendan mejoras de seguridad para optimizar la protección";
  }

  // Crear HTML para los resultados
  resultadosContainer.innerHTML = `
    <div class="scan-results">
      <div class="results-header">
        <h3><i class="fas fa-file-contract"></i> Resultados del Escaneo</h3>
        <div class="risk-badge ${riskLevel}">${riskLabel}</div>
      </div>
      
      <div class="results-summary">
        <div class="summary-item">
          <i class="fas fa-server"></i>
          <div>
            <span>Host Analizado</span>
            <strong>${data.host}</strong>
          </div>
        </div>
        
        <div class="summary-item">
          <i class="fas fa-clock"></i>
          <div>
            <span>Tiempo de Escaneo</span>
            <strong>${data.scan_duration || '45'} segundos</strong>
          </div>
        </div>
        
        <div class="summary-item">
          <i class="fas fa-plug"></i>
          <div>
            <span>Puertos Abiertos</span>
            <strong>${data.ports ? data.ports.length : '0'}</strong>
          </div>
        </div>
      </div>
      
      <div class="results-details">
        <div class="details-section">
          <h4><i class="fas fa-door-open"></i> Puertos Detectados</h4>
          <div class="ports-grid">
            ${data.ports && data.ports.length > 0 ? 
              data.ports.map(port => `
                <div class="port-card ${port.state}">
                  <div class="port-number">${port.port}</div>
                  <div class="port-info">
                    <span class="port-service">${port.service || 'Servicio no identificado'}</span>
                    <span class="port-protocol">${port.protocol}</span>
                  </div>
                  <div class="port-state">${port.state === 'open' ? 'Abierto' : 'Filtrado'}</div>
                </div>
              `).join('') : 
              '<div class="no-ports">No se encontraron puertos abiertos</div>'}
          </div>
        </div>
        
        <div class="details-section">
          <h4><i class="fas fa-shield-alt"></i> Hallazgos de Seguridad</h4>
          <div class="recommendations">
            ${data.findings && data.findings.length > 0 ? 
              data.findings.map(finding => `
                <div class="recommendation ${finding.risk.toLowerCase()}">
                  <div class="rec-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>${finding.title || 'Vulnerabilidad detectada'}</strong>
                  </div>
                  <p>${finding.description || 'Descripción no disponible'}</p>
                  <div class="rec-actions">
                    <span class="rec-priority">Prioridad: ${finding.risk || 'Alta'}</span>
                    <p class="rec-solution"><strong>Solución:</strong> ${finding.recommendation || 'Sin recomendación específica'}</p>
                  </div>
                </div>
              `).join('') : 
              '<div class="no-recs">No se requieren acciones críticas de seguridad</div>'}
          </div>
        </div>
      </div>
      
      <div class="results-actions">
        <button class="btn-export" onclick="exportarReporte(${JSON.stringify(data).replace(/"/g, '&quot;')})">
          <i class="fas fa-file-download"></i> Exportar Reporte
        </button>
        <button class="btn-newscan" onclick="mostrarVista('escanear')">
          <i class="fas fa-redo"></i> Nuevo Escaneo
        </button>
      </div>
    </div>
  `;
}

// Función para abrir el modal con resultados detallados
function abrirModalResultados(scanData) {
  const modal = document.getElementById('tech-modal');
  modal.classList.add('active');
  
  // Llenar datos en el modal
  document.getElementById('tech-host').textContent = scanData.host;
  document.getElementById('tech-date').textContent = formatearFechaBonita(new Date());
  document.getElementById('tech-score').textContent = scanData.risk_score || 'N/A';
  document.getElementById('open-ports').textContent = scanData.ports ? scanData.ports.length : '0';
  document.getElementById('vuln-count').textContent = scanData.findings ? scanData.findings.length : '0';
  
  // Actualizar barra de riesgo
  const riskScore = scanData.risk_score || 0;
  const riskBar = document.querySelector('.risk-level');
  riskBar.className = 'risk-level ';
  
  if (riskScore >= 80) {
    riskBar.classList.add('low');
    document.querySelector('.risk-label').textContent = 'Bajo Riesgo';
    document.querySelector('.risk-label').style.color = 'var(--secondary)';
    document.querySelector('.risk-description').textContent = 'El sistema analizado presenta un buen nivel de seguridad';
  } else if (riskScore >= 50) {
    riskBar.classList.add('medium');
    document.querySelector('.risk-label').textContent = 'Riesgo Moderado';
    document.querySelector('.risk-label').style.color = 'var(--warning)';
    document.querySelector('.risk-description').textContent = 'Se recomiendan mejoras de seguridad para optimizar la protección';
  } else {
    riskBar.classList.add('high');
    document.querySelector('.risk-label').textContent = 'Alto Riesgo';
    document.querySelector('.risk-label').style.color = 'var(--danger)';
    document.querySelector('.risk-description').textContent = 'Se encontraron vulnerabilidades críticas que requieren atención inmediata';
  }
  
  riskBar.style.width = `${riskScore}%`;
  
  // Actualizar pestaña de puertos
  const portsContent = document.getElementById('tab-ports-content');
  portsContent.innerHTML = scanData.ports && scanData.ports.length > 0 ? 
    scanData.ports.map(port => `
      <div class="port-detail">
        <div class="port-header">
          <span class="port-number">Puerto ${port.port}</span>
          <span class="port-state ${port.state}">${port.state === 'open' ? 'Abierto' : 'Filtrado'}</span>
        </div>
        <div class="port-info">
          <p><strong>Servicio:</strong> ${port.service || 'Desconocido'}</p>
          <p><strong>Protocolo:</strong> ${port.protocol || 'TCP'}</p>
          ${port.version ? `<p><strong>Versión:</strong> ${port.version}</p>` : ''}
        </div>
      </div>
    `).join('') : 
    '<p class="no-data">No se encontraron puertos abiertos</p>';
  
  // Actualizar pestaña de vulnerabilidades
  const vulnContent = document.getElementById('tab-vuln-content');
  vulnContent.innerHTML = scanData.findings && scanData.findings.length > 0 ? 
    scanData.findings.map(finding => `
      <div class="vuln-detail ${finding.risk.toLowerCase()}">
        <div class="vuln-header">
          <h4>${finding.title || 'Vulnerabilidad detectada'}</h4>
          <span class="vuln-risk">${finding.risk}</span>
        </div>
        <div class="vuln-info">
          <p><strong>Puerto:</strong> ${finding.port}</p>
          <p><strong>Descripción:</strong> ${finding.description || 'Sin descripción disponible'}</p>
          <p class="recommendation"><strong>Recomendación:</strong> ${finding.recommendation || 'Sin recomendación específica'}</p>
        </div>
      </div>
    `).join('') : 
    '<p class="no-data">No se encontraron vulnerabilidades críticas</p>';
}

// Función para cerrar el modal
function cerrarModal() {
  document.getElementById('tech-modal').classList.remove('active');
}

// Función para validar el host
function validarHost(host) {
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const domainPattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,6})+$/;
  return ipPattern.test(host) || domainPattern.test(host);
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `notification ${tipo}`;
  notificacion.innerHTML = `
    <span class="notification-text">${mensaje}</span>
    <span class="notification-close">&times;</span>
  `;
  
  document.body.appendChild(notificacion);
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    notificacion.classList.add('fade-out');
    setTimeout(() => notificacion.remove(), 300);
  }, 5000);
  
  // Cerrar al hacer click
  notificacion.querySelector('.notification-close').onclick = () => notificacion.remove();
}

// Función para obtener clase CSS según puntaje de riesgo
function getRiskClass(score) {
  if (score >= 80) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

// Función para ver historial
async function verHistorial() {
  const historialBody = document.getElementById("historial-body");
  const token = localStorage.getItem("token");
  
  // Mostrar loader
  historialBody.innerHTML = `
    <tr>
      <td colspan="6" class="loading-row">
        <div class="loader-small"></div>
        <span>Cargando historial...</span>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(`http://127.0.0.1:8000/historial/?limite=20`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      historialBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">
            <i class="fas fa-info-circle"></i>
            <span>No hay registros de escaneos</span>
          </td>
        </tr>
      `;
      return;
    }

    // Construir tabla de historial
    historialBody.innerHTML = data.map((item, index) => {
      const puertos = item.puertos_abiertos ? item.puertos_abiertos.split(',').slice(0, 3).map(p => 
        `<span class="port-badge">${p}</span>`
      ).join('') : '';
      
      const puertosExtra = item.puertos_abiertos && item.puertos_abiertos.split(',').length > 3 ? 
        `<span class="more-ports">+${item.puertos_abiertos.split(',').length - 3} más</span>` : '';
      
      const score = item.risk_score || 0;
      const riskClass = getRiskClass(score);
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td class="host-cell">${item.host}</td>
          <td>${formatearFechaBonita(item.fecha)}</td>
          <td class="ports-cell">
            ${puertos}
            ${puertosExtra}
          </td>
          <td class="text-center">
            <div class="risk-badge ${riskClass}">
              ${score}/100
            </div>
          </td>
          <td class="text-center">
            <button class="btn-action" onclick="abrirModalResultados(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error("Error al cargar historial:", error);
    historialBody.innerHTML = `
      <tr>
        <td colspan="6" class="error-row">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Error al cargar el historial</span>
        </td>
      </tr>
    `;
  }
}

// Función para filtrar historial
function filtrarHistorial() {
  const input = document.getElementById("busqueda").value.toLowerCase();
  const filtro = document.getElementById("filtro-riesgo").value;
  const filas = document.querySelectorAll("#historial-body tr");

  filas.forEach(fila => {
    if (fila.classList.contains('loading-row') || fila.classList.contains('empty-row') || fila.classList.contains('error-row')) {
      return;
    }

    const host = fila.querySelector('.host-cell').textContent.toLowerCase();
    const fecha = fila.cells[2].textContent.toLowerCase();
    const riesgo = fila.querySelector('.risk-badge').classList[1];
    
    const coincideTexto = host.includes(input) || fecha.includes(input);
    const coincideFiltro = filtro === 'all' || riesgo.includes(filtro);
    
    fila.style.display = (coincideTexto && coincideFiltro) ? '' : 'none';
  });
}

// Función para formatear la fecha
function formatearFechaBonita(fechaHora) {
  const fecha = new Date(fechaHora);
  const opciones = { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  };
  return fecha.toLocaleDateString('es-ES', opciones);
}

// Función para exportar reporte
function exportarReporte(scanData) {
  // Implementación simulada - en producción usaría una librería como jsPDF
  console.log("Exportando reporte para:", scanData);
  mostrarNotificacion('Preparando reporte para descarga...', 'success');
  
  // Aquí iría la lógica real para generar PDF
  setTimeout(() => {
    mostrarNotificacion('Reporte generado correctamente', 'success');
    
    // Crear enlace de descarga simulado
    const enlace = document.createElement('a');
    enlace.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Informe de seguridad - ' + scanData.host);
    enlace.download = `reporte-seguridad-${scanData.host}.txt`;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }, 1500);
}

// Función para guardar en historial local
function guardarEnHistorialLocal(scanData) {
  let historial = JSON.parse(localStorage.getItem('local_scan_history') || '[]');
  
  // Limitar a 50 registros
  if (historial.length >= 50) {
    historial = historial.slice(0, 49);
  }
  
  const nuevoEscaneo = {
    id: Date.now(),
    fecha: new Date().toISOString(),
    host: scanData.host,
    puertos: scanData.ports ? scanData.ports.map(p => p.port) : [],
    risk_score: scanData.risk_score || 0,
    detalles: {
      puertos_abiertos: scanData.ports ? scanData.ports.length : 0,
      hallazgos: scanData.findings ? scanData.findings.length : 0
    }
  };
  
  historial.unshift(nuevoEscaneo);
  localStorage.setItem('local_scan_history', JSON.stringify(historial));
  
  // Actualizar estadísticas
  actualizarEstadisticas();
}

// Función para actualizar estadísticas de usuario
function actualizarEstadisticas() {
  const historial = JSON.parse(localStorage.getItem('local_scan_history') || '[]');
  
  localStorage.setItem('total_scans', historial.length);
  
  if (historial.length > 0) {
    const avgRisk = Math.round(historial.reduce((sum, scan) => sum + (scan.risk_score || 0), 0) / historial.length);
    localStorage.setItem('avg_risk', avgRisk);
  }
  
  // Actualizar UI si está en vista de perfil
  if (document.getElementById('perfil-view')) {
    document.querySelector('.stat-card .stat-value').textContent = historial.length;
    document.querySelectorAll('.stat-card .stat-value')[1].textContent = 
      localStorage.getItem('avg_risk') || '0';
  }
}

// Función para mostrar ayuda
function mostrarAyuda() {
  mostrarNotificacion('Ingrese un dominio (ejemplo.com) o dirección IP (192.168.1.1) para escanear', 'info');
}

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  mostrarNotificacion("Sesión cerrada correctamente", "success");
  setTimeout(() => window.location.href = "login.html", 1500);
}