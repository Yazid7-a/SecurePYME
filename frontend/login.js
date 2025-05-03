const container = document.getElementById('container');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// Control del bloqueo en frontend (UX)
let intentosFallidos = 0;
let bloqueadoHasta = null;
let intervalTimer = null;

// Cambiar entre login y registro
document.getElementById('signUp').addEventListener('click', () => {
  container.classList.add("right-panel-active");
});

document.getElementById('signIn').addEventListener('click', () => {
  container.classList.remove("right-panel-active");
});

// ===========================
// Registro
// ===========================
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (username.length < 3 || password.length < 6) {
    alert("El nombre de usuario debe tener al menos 3 caracteres y la contraseña 6 caracteres.");
    return;
  }

  try {
    const res = await fetch('http://127.0.0.1:8000/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      alert('✅ Usuario registrado correctamente. ¡Ahora puedes iniciar sesión!');
      container.classList.remove("right-panel-active");
      formRegister.reset();
    } else {
      const data = await res.json();
      alert(`❌ Error: ${data.detail}`);
    }
  } catch (err) {
    alert("Error al conectar con el servidor.");
  }
});

// ===========================
// Login con JWT
// ===========================
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  // Control de bloqueo por intentos fallidos (UX)
  if (bloqueadoHasta && new Date() < bloqueadoHasta) {
    alert("🚫 Demasiados intentos fallidos. Espera para volver a intentarlo.");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  try {
    const res = await fetch('http://127.0.0.1:8000/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('usuario', username);
      localStorage.setItem('token', data.access_token);
      alert(`✅ Bienvenido ${username}`);
      window.location.href = "index.html";
    } else {
      if (res.status === 403) {
        alert(`⛔ ${data.detail}`);
      } else {
        alert(`❌ Error: ${data.detail}`);
        manejarIntentoFallido();
      }
    }
  } catch (err) {
    alert("Error al conectar con el servidor.");
  }
});

// ===========================
// Manejar intentos fallidos (frontend)
// ===========================
function manejarIntentoFallido() {
  intentosFallidos++;

  if (intentosFallidos >= 5) {
    bloqueadoHasta = new Date(Date.now() + 5 * 60 * 1000); // Bloqueado 5 min
    alert("🚫 Demasiados intentos. Tu cuenta está bloqueada por 5 minutos.");

    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
      const ahora = new Date();
      const tiempoRestante = bloqueadoHasta - ahora;

      if (tiempoRestante <= 0) {
        clearInterval(intervalTimer);
        intentosFallidos = 0;
        bloqueadoHasta = null;
        alert("🔓 Ahora puedes volver a intentarlo.");
      } else {
        const minutos = Math.floor((tiempoRestante / 1000) / 60);
        const segundos = Math.floor((tiempoRestante / 1000) % 60);
        console.log(`⏳ Tiempo restante de bloqueo: ${minutos}m ${segundos}s`);
      }
    }, 1000);
  }
}
