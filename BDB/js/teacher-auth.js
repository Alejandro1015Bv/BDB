/*
 * Protege una página para que solo el profesor (usuario real de
 * Supabase Auth, creado desde el Dashboard) pueda ver su contenido.
 * A diferencia del panel de partituras, aquí NO hay una contraseña
 * escrita en el código: la validación la hace Supabase del lado del
 * servidor con auth.signInWithPassword().
 *
 * Uso en cada página protegida:
 *   protegerConSupabaseAuth(email => {
 *     // este callback solo corre si el login fue exitoso
 *     document.getElementById('sesion-email').textContent = email;
 *     iniciarPagina();
 *   });
 */
function protegerConSupabaseAuth(onAutenticado) {
  if (!window.supabaseClient) {
    console.error('Supabase no está inicializado.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.id = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-box">
      <h3>Acceso del Profesor</h3>
      <p>Inicia sesión con tu cuenta para continuar.</p>
      <div class="form-group">
        <label for="auth-email">Usuario:</label>
        <input type="email" id="auth-email" class="neu-input" placeholder="tu.usuario@colegio.edu" autocomplete="username">
      </div>
      <div class="form-group">
        <label for="auth-password">Contraseña:</label>
        <input type="password" id="auth-password" class="neu-input" placeholder="••••••••" autocomplete="current-password">
      </div>
      <button type="button" id="auth-submit" class="btn-pdf" style="width:100%;">Iniciar Sesión</button>
      <p class="auth-error" id="auth-error">Usuario o contraseña incorrectos.</p>
    </div>
  `;

  function mostrarLogin() {
    document.body.appendChild(overlay);
    const email = overlay.querySelector('#auth-email');
    const pass = overlay.querySelector('#auth-password');
    const btn = overlay.querySelector('#auth-submit');
    const err = overlay.querySelector('#auth-error');

    async function intentar() {
      err.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Verificando...';

      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email.value.trim(),
        password: pass.value
      });

      btn.disabled = false;
      btn.textContent = 'Iniciar Sesión';

      if (error || !data.session) {
        err.style.display = 'block';
        pass.value = '';
        return;
      }

      overlay.remove();
      onAutenticado(data.session.user.email);
    }

    btn.addEventListener('click', intentar);
    [email, pass].forEach(input => {
      input.addEventListener('keypress', e => { if (e.key === 'Enter') intentar(); });
    });
  }

  // ¿Ya hay una sesión activa? (por ejemplo, si recargó la página)
  window.supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
      onAutenticado(data.session.user.email);
    } else {
      mostrarLogin();
    }
  }).catch((err) => {
    console.error('Error verificando la sesión:', err);
    mostrarLogin();
  });
}

async function cerrarSesionProfesor() {
  if (window.supabaseClient) {
    await window.supabaseClient.auth.signOut();
  }
  location.reload();
}
