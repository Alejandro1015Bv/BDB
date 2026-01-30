// Configuración de autenticación simple
// Cambia esta contraseña para modificar el acceso al panel de administración
const ADMIN_PASSWORD = 'admin123'; // Modifica esta línea para cambiar la contraseña

export function inicializarAuth() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('btn-logout');
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');
    const loginMessage = document.getElementById('login-message');

    // Verificar sesión al cargar (usando localStorage)
    if (localStorage.getItem('admin_logged_in') === 'true') {
        mostrarPanelAdmin();
    } else {
        mostrarLogin();
    }

    // Manejar login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;

            loginMessage.innerText = "Verificando...";
            loginMessage.style.color = "blue";

            // Verificar contraseña
            if (password === ADMIN_PASSWORD) {
                localStorage.setItem('admin_logged_in', 'true');
                loginMessage.innerText = "¡Inicio de sesión exitoso!";
                loginMessage.style.color = "green";
                mostrarPanelAdmin();
            } else {
                loginMessage.innerText = "Contraseña incorrecta";
                loginMessage.style.color = "red";
            }
        });
    }

    // Manejar logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('admin_logged_in');
            mostrarLogin();
        });
    }

    function mostrarLogin() {
        if (loginSection) loginSection.style.display = "block";
        if (adminPanel) adminPanel.style.display = "none";
    }

    function mostrarPanelAdmin() {
        if (loginSection) loginSection.style.display = "none";
        if (adminPanel) adminPanel.style.display = "block";
        // Inicializar subida si es necesario
        import('./upload.js').then(module => {
            module.inicializarFormularioSubida();
        });
    }
}
