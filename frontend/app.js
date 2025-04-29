// Al cargar la página, comprobamos si hay sesión iniciada
window.onload = () => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
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
  
          <h3>Resultados del Escaneo:</h3>
          <pre id="resultados"></pre>
        </section>
      `;
  
      document.getElementById('form-escanear').addEventListener('submit', function(e) {
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
  
    if (host === "") {
      alert("Introduce una dirección web.");
      return;
    }
  
    if (!host.includes(".")) {
      alert("Introduce una dirección válida.");
      return;
    }
  
    loader.style.display = "block";
    resultados.style.display = "none";
  
    try {
      const usuario = localStorage.getItem("usuario");
      const res = await fetch(`http://127.0.0.1:8000/scan/?host=${host}&username=${usuario}`);

      const data = await res.json();
  
      loader.style.display = "none";
      resultados.style.display = "block";
  
      if (data.error) {
        resultados.textContent = "Error: " + data.error;
      } else {
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
      }
    } catch (err) {
      loader.style.display = "none";
      resultados.style.display = "block";
      resultados.textContent = "Error al conectar con el servidor.";
    }
  }
  
  // Función para ver historial
  async function verHistorial() {
    const historialBody = document.getElementById("historial-body");
    historialBody.innerHTML = "";
  
    try {
      const usuario = localStorage.getItem("usuario");
      const res = await fetch(`http://127.0.0.1:8000/historial/?username=${usuario}&limite=10`);
      const data = await res.json();
  
      if (!Array.isArray(data) || data.length === 0) {
        historialBody.innerHTML = `<tr><td colspan="4">No hay registros de escaneos.</td></tr>`;
        return;
      }
  
      data.forEach((item, index) => {
        // Cada puerto es un string como "22"
        const puertos = item.puertos.map(p => `🛡️ ${p}`).join("<br>");
  
        const fila = `
          <tr>
            <td>${index + 1}</td>
            <td>${item.host}</td>
            <td>${formatearFechaBonita(item.fecha)}</td>
            <td>${puertos}</td>
          </tr>
        `;
        historialBody.innerHTML += fila;
      });
  
    } catch (err) {
      historialBody.innerHTML = `<tr><td colspan="4">Error al cargar historial: ${err}</td></tr>`;
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
  
      if (host.includes(input) || fecha.includes(input)) {
        fila.style.display = "";
      } else {
        fila.style.display = "none";
      }
    });
  }
  
  // Función para cerrar sesión
  function cerrarSesion() {
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
  