// Al cargar la página, comprobamos si hay sesión iniciada
window.onload = () => {
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  if (!token || !usuario) {
    alert("Debes iniciar sesión.");
    window.location.href = "login.html";
  } else {
    mostrarVista('escanear');
  }
};

// Función para mostrar diferentes vistas dinámicamente
function mostrarVista(vista) {
  const main = document.getElementById('main-content');
  main.classList.remove('fade-in');
  void main.offsetWidth;
  main.classList.add('fade-in');

  if (vista === 'escanear') {
    main.innerHTML = `
      <section id="seccion-escanear" class="seccion">
        <div class="scan-header">
          <h2><i class="icon-scan"></i> Escaneo de Seguridad</h2>
          <div class="scan-actions">
            <button class="btn-help" onclick="mostrarAyuda()">
              <i class="icon-help"></i> Ayuda
            </button>
          </div>
        </div>
        
        <form id="form-escanear" class="scan-form">
          <div class="input-group">
            <input type="text" id="host" placeholder="ejemplo.com o 192.168.1.1" required>
            <button type="submit" class="btn-scan">
              <i class="icon-search"></i> Escanear
            </button>
          </div>
        </form>

        <div id="loader" class="loader-container">
          <div class="loader-content">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
            </svg>
            <p>Analizando seguridad...</p>
          </div>
        </div>

        <div id="resultados-container" class="results-container">
          <!-- Los resultados se cargarán dinámicamente -->
        </div>
      </section>
    `;

    document.getElementById('form-escanear').addEventListener('submit', function(e) {
      e.preventDefault();
      escanear();
    });

  } else if (vista === 'historial') {
    main.innerHTML = `
      <section id="seccion-historial" class="seccion">
        <div class="history-header">
          <h2><i class="icon-history"></i> Historial de Escaneos</h2>
          <div class="history-actions">
            <div class="search-box">
              <i class="icon-search"></i>
              <input type="text" id="busqueda" placeholder="Buscar por host o fecha..." onkeyup="filtrarHistorial()">
            </div>
          </div>
        </div>
        
        <div class="history-container">
          <table id="historial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Host</th>
                <th>Fecha</th>
                <th>Puertos</th>
                <th class="text-center">Nivel de Riesgo</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="historial-body"></tbody>
          </table>
        </div>
      </section>
    `;
    verHistorial();
  } else if (vista === 'perfil') {
    const usuario = localStorage.getItem("usuario");
    const lastScan = localStorage.getItem("last_scan_date") || "No disponible";
    
    main.innerHTML = `
      <section id="seccion-perfil" class="seccion">
        <h2><i class="icon-profile"></i> Mi Perfil</h2>
        
        <div class="profile-card">
          <div class="profile-info">
            <div class="info-item">
              <span class="info-label">Usuario:</span>
              <span class="info-value">${usuario}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Último escaneo:</span>
              <span class="info-value">${lastScan}</span>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat-card">
              <div class="stat-value">${localStorage.getItem('total_scans') || '0'}</div>
              <div class="stat-label">Escaneos realizados</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${localStorage.getItem('avg_risk') || 'N/A'}</div>
              <div class="stat-label">Riesgo promedio</div>
            </div>
          </div>
        </div>
        
        <button class="btn-logout" onclick="cerrarSesion()">
          <i class="icon-logout"></i> Cerrar sesión
        </button>
      </section>
    `;
  }
}

// Función de escaneo mejorada
async function escanear() {
  const host = document.getElementById("host").value.trim();
  const loader = document.getElementById("loader");
  const resultadosContainer = document.getElementById("resultados-container");
  const token = localStorage.getItem("token");

  if (!validarHost(host)) {
    mostrarNotificacion('Por favor ingrese un dominio o dirección IP válida', 'error');
    return;
  }

  // Mostrar loader
  loader.style.display = "flex";
  resultadosContainer.innerHTML = '';

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

    // Ocultar loader
    loader.style.display = "none";

    if (data.detail) {
      mostrarNotificacion(data.detail, 'error');
      return;
    }

    // Actualizar última fecha de escaneo
    localStorage.setItem('last_scan_date', formatearFechaBonita(new Date()));
    
    // Mostrar resultados
    mostrarResultadosEscaneo(data);
    
    // Guardar en historial local
    guardarEnHistorialLocal(data);

  } catch (error) {
    console.error("Error en el escaneo:", error);
    loader.style.display = "none";
    mostrarNotificacion(`Error al conectar con el servidor: ${error.message}`, 'error');
  }
}

// Función para mostrar los resultados del escaneo
function mostrarResultadosEscaneo(data) {
  const resultadosContainer = document.getElementById("resultados-container");
  
  // Crear HTML para los resultados
  resultadosContainer.innerHTML = `
    <div class="scan-summary">
      <div class="summary-card">
        <h3><i class="icon-info"></i> Resumen del Escaneo</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Host:</span>
            <span class="summary-value">${data.host}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Fecha:</span>
            <span class="summary-value">${formatearFechaBonita(new Date())}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Puertos abiertos:</span>
            <span class="summary-value">${data.ports ? data.ports.length : '0'}</span>
          </div>
        </div>
      </div>
      
      <div class="risk-card">
        <h3><i class="icon-shield"></i> Nivel de Seguridad</h3>
        <div class="risk-score-container ${getRiskClass(data.risk_score)}">
          <div class="risk-value">${data.risk_score || 'N/A'}<span>/100</span></div>
          <div class="risk-description">${getRiskDescription(data.risk_score)}</div>
          <div class="risk-meter">
            <div class="risk-level" style="width: ${data.risk_score || 0}%"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="results-section">
      <div class="ports-section">
        <h3><i class="icon-port"></i> Puertos Detectados</h3>
        ${data.ports && data.ports.length > 0 ? 
          `<ul class="ports-list">
            ${data.ports.map(port => `
              <li class="port-item ${port.state === 'open' ? 'open' : 'filtered'}">
                <span class="port-number">${port.port}</span>
                <span class="port-service">${port.service || 'Desconocido'}</span>
                <span class="port-state">${port.state === 'open' ? 'Abierto' : 'Filtrado'}</span>
              </li>
            `).join('')}
          </ul>` : 
          '<p class="no-ports">No se encontraron puertos abiertos.</p>'}
      </div>
      
      <div class="findings-section">
        <h3><i class="icon-warning"></i> Hallazgos de Seguridad</h3>
        ${data.findings && data.findings.length > 0 ? 
          `<div class="findings-list">
            ${data.findings.map(finding => `
              <div class="finding-item ${finding.risk.toLowerCase()}">
                <div class="finding-header">
                  <span class="finding-title">Puerto ${finding.port} - ${finding.service}</span>
                  <span class="finding-risk">${finding.risk}</span>
                </div>
                <div class="finding-content">
                  <p class="finding-desc">${finding.description}</p>
                  <div class="finding-recommendation">
                    <strong>Recomendación:</strong> ${finding.recommendation}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>` : 
          '<p class="no-findings">No se encontraron vulnerabilidades críticas.</p>'}
      </div>
    </div>
    
    <div class="scan-actions">
      <button class="btn-export" onclick="exportarReporte(${JSON.stringify(data).replace(/"/g, '&quot;')})">
        <i class="icon-download"></i> Exportar Reporte
      </button>
      <button class="btn-newscan" onclick="mostrarVista('escanear')">
        <i class="icon-scan"></i> Nuevo Escaneo
      </button>
    </div>
  `;
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
  if (score >= 80) return 'low-risk';
  if (score >= 50) return 'medium-risk';
  return 'high-risk';
}

// Función para obtener descripción del riesgo
function getRiskDescription(score) {
  if (!score) return 'No evaluado';
  if (score >= 80) return 'Excelente nivel de seguridad';
  if (score >= 50) return 'Riesgo moderado - Se recomiendan mejoras';
  return 'Riesgo alto - Requiere atención inmediata';
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
            <i class="icon-info"></i>
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
            <button class="btn-action" onclick="verDetallesEscaneo('${item.id}')" title="Ver detalles">
              <i class="icon-eye"></i>
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
          <i class="icon-error"></i>
          <span>Error al cargar el historial</span>
        </td>
      </tr>
    `;
  }
}

// Función para filtrar historial
function filtrarHistorial() {
  const input = document.getElementById("busqueda").value.toLowerCase();
  const filas = document.querySelectorAll("#historial-body tr");

  filas.forEach(fila => {
    if (fila.classList.contains('loading-row') || fila.classList.contains('empty-row') || fila.classList.contains('error-row')) {
      return;
    }

    const host = fila.querySelector('.host-cell').textContent.toLowerCase();
    const fecha = fila.cells[2].textContent.toLowerCase();
    const puertos = fila.querySelector('.ports-cell').textContent.toLowerCase();

    const coincide = host.includes(input) || fecha.includes(input) || puertos.includes(input);
    fila.style.display = coincide ? '' : 'none';
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
  }, 1500);
}

// Función para ver detalles de un escaneo histórico
function verDetallesEscaneo(scanId) {
  // Implementación para cargar detalles completos
  console.log("Cargando detalles del escaneo:", scanId);
  mostrarNotificacion(`Cargando detalles del escaneo ${scanId}...`, 'info');
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
    risk_score: scanData.risk_score || 0
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
}

// Función para mostrar ayuda
function mostrarAyuda() {
  mostrarNotificacion('Ingrese un dominio (ejemplo.com) o dirección IP (192.168.1.1) para escanear', 'info');
}

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}