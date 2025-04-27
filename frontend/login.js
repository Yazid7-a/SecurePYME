async function login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const mensajeLogin = document.getElementById("mensaje-login");
  
    if (username === "" || password === "") {
      mensajeLogin.innerText = "❌ Completa todos los campos.";
      mensajeLogin.style.color = "red";
      return;
    }
  
    try {
      const res = await fetch('http://127.0.0.1:8000/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      if (res.ok) {
        localStorage.setItem("usuario", username);
        window.location.href = "index.html"; // Redirige al dashboard
      } else {
        const data = await res.json();
        mensajeLogin.innerText = `❌ ${data.detail}`;
        mensajeLogin.style.color = "red";
      }
  
    } catch (err) {
      mensajeLogin.innerText = "❌ Error al conectar con el servidor.";
      mensajeLogin.style.color = "red";
    }
  }
  
  async function registrar() {
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const mensajeLogin = document.getElementById("mensaje-login");
  
    if (username === "" || password === "") {
      mensajeLogin.innerText = "❌ Completa todos los campos.";
      mensajeLogin.style.color = "red";
      return;
    }
  
    try {
      const res = await fetch('http://127.0.0.1:8000/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      if (res.ok) {
        localStorage.setItem("usuario", username);
        window.location.href = "index.html"; // Redirige directamente después de registro
      } else {
        const data = await res.json();
        mensajeLogin.innerText = `❌ ${data.detail}`;
        mensajeLogin.style.color = "red";
      }
  
    } catch (err) {
      mensajeLogin.innerText = "❌ Error al conectar con el servidor.";
      mensajeLogin.style.color = "red";
    }
  }
  