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
        <h2>Escaneo de Seguridad</h2>
        <form id="form-escanear">
          <input type="text" id="host" placeholder="Introduce una dirección web...">
          <button type="submit">Escanear</button>
        </form>

        <div id="loader" style="display: none;">
          <svg class="spinner" viewBox="0 0 50 50">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
          </svg>
          <p>Escaneando...</p>
        </div>

        <div id="resultados-container">
          <div id="risk-score-container" class="risk-card">
            <h3>Nivel de Seguridad:</h3>
            <div id="risk-score"></div>
          </div>
          
          <div class="scan-results">
            <h3>Resultados del Escaneo:</h3>
            <pre id="resultados"></pre>
          </div>
          
          <div id="risk-findings" class="risk-card">
            <h3>Hallazgos de Seguridad:</h3>
            <ul id="findings-list"></ul>
          </div>
        </div>
      </section>
    `;

    document.getElementById('form-escanear').addEventListener('submit', function (e) {
      e.preventDefault();
      escanear();
    });

  } else if (vista === 'historial') {
    main.innerHTML = `
      <section id="seccion-historial" class="seccion">
        <h2>Historial de Escaneos</h2>
        <input type="text" id="busqueda" placeholder="Buscar por host o fecha..." onkeyup="filtrarHistorial()">
        <table id="historial-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Host</th>
              <th>Fecha</th>
              <th>Puertos</th>
              <th>Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody id="historial-body"></tbody>
        </table>
      </section>
    `;
    verHistorial();
  } else if (vista === 'perfil') {
    const usuario = localStorage.getItem("usuario");
    main.innerHTML = `
      <section id="seccion-perfil" class="seccion">
        <h2>Mi Perfil</h2>
        <p><strong>Usuario:</strong> ${usuario}</p>
      </section>
    `;
  }
}

// Función de escaneo
async function escanear() {
  const host = document.getElementById("host").value.trim();
  const resultados = document.getElementById("resultados");
  const loader = document.getElementById("loader");
  const token = localStorage.getItem("token");
  const riskScoreContainer = document.getElementById("risk-score");
  const findingsList = document.getElementById("findings-list");

  if (!host.includes(".")) {
    alert("Introduce una dirección válida.");
    return;
  }

  loader.style.display = "block";
  resultados.style.display = "none";
  riskScoreContainer.innerHTML = "";
  findingsList.innerHTML = "";

  try {
    const res = await fetch(`http://127.0.0.1:8000/scan/?host=${host}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    loader.style.display = "none";
    resultados.style.display = "block";

    if (data.detail) {
      resultados.textContent = "Error: " + data.detail;
    } else {
      // Mostrar resultados del escaneo
      let salida = `Host: ${data.host}\n\nPuertos encontrados:\n\n`;
      if (!data.ports || data.ports.length === 0) {
        salida += "⚠️ No se encontraron puertos abiertos.";
      } else {
        data.ports.forEach(p => {
          const estado = p.state === "open" ? "🟢 ABIERTO" : "🟠 FILTRADO";
          salida += `→ ${p.port} (${p.service}) - ${estado}\n`;
        });
      }
      resultados.textContent = salida;

      // Mostrar puntaje de riesgo
      if (data.risk_score !== undefined) {
        const score = data.risk_score;
        const color = getRiskColor(score);
        
        riskScoreContainer.innerHTML = `
          <div class="risk-meter">
            <div class="risk-level" style="width: ${score}%; background: ${color};"></div>
          </div>
          <div class="risk-value" style="color: ${color};">${score}/100</div>
          <p class="risk-description">${getRiskDescription(score)}</p>
        `;
      }

      // Mostrar hallazgos de seguridad
      if (data.findings && data.findings.length > 0) {
        findingsList.innerHTML = data.findings.map(finding => `
          <li class="finding-item ${finding.risk.toLowerCase()}">
            <span class="finding-port">Puerto ${finding.port} (${finding.service})</span>
            <span class="finding-risk">${finding.risk}</span>
            <p class="finding-recommendation">${finding.recommendation}</p>
          </li>
        `).join("");
      } else {
        findingsList.innerHTML = "<li>No se encontraron problemas de seguridad críticos.</li>";
      }
    }
  } catch (err) {
    loader.style.display = "none";
    resultados.style.display = "block";
    resultados.textContent = "Error al conectar con el servidor.";
  }
}

// Función para determinar el color según el riesgo
function getRiskColor(score) {
  if (score >= 80) return "#4CAF50";  // Verde
  if (score >= 50) return "#FFC107";  // Amarillo
  return "#F44336";  // Rojo
}

// Función para obtener descripción del riesgo
function getRiskDescription(score) {
  if (score >= 80) return "Excelente nivel de seguridad";
  if (score >= 50) return "Nivel de seguridad moderado - Se recomiendan mejoras";
  return "Nivel de seguridad bajo - Requiere atención inmediata";
}

// Función para ver historial
async function verHistorial() {
  const historialBody = document.getElementById("historial-body");
  const token = localStorage.getItem("token");
  historialBody.innerHTML = "";

  try {
    const res = await fetch(`http://127.0.0.1:8000/historial/?limite=10`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      historialBody.innerHTML = `<tr><td colspan="5">No hay registros de escaneos.</td></tr>`;
      return;
    }

    data.forEach((item, index) => {
      const puertos = item.puertos.map(p => `🛡️ ${p}`).join("<br>");
      const score = item.risk_score || "N/A";
      const color = score !== "N/A" ? getRiskColor(score) : "#9E9E9E";
      
      const fila = `
        <tr>
          <td>${index + 1}</td>
          <td>${item.host}</td>
          <td>${formatearFechaBonita(item.fecha)}</td>
          <td>${puertos}</td>
          <td style="color: ${color}">${score !== "N/A" ? score + "/100" : score}</td>
        </tr>
      `;
      historialBody.innerHTML += fila;
    });

  } catch (err) {
    historialBody.innerHTML = `<tr><td colspan="5">Error al cargar historial: ${err}</td></tr>`;
  }
}

// Función para formatear la fecha
function formatearFechaBonita(fechaHora) {
  const fecha = new Date(fechaHora);
  const opciones = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return fecha.toLocaleDateString('es-ES', opciones);
}

// Función para filtrar historial
function filtrarHistorial() {
  const input = document.getElementById("busqueda").value.toLowerCase();
  const filas = document.querySelectorAll("#historial-body tr");

  filas.forEach(fila => {
    const host = fila.children[1]?.textContent.toLowerCase();
    const fecha = fila.children[2]?.textContent.toLowerCase();

    fila.style.display = (host.includes(input) || fecha.includes(input)) ? "" : "none";
  });
}

// Función para cerrar sesión
function cerrarSesion() {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}