/*
 * Notificaciones "toast" -- reemplazan los alert()/confirm() feos del
 * navegador con algo que combina con el diseño neumórfico del sitio.
 *
 * Uso:
 *   mostrarToast('¡Guardado con éxito!', 'exito');
 *   mostrarToast('Ese archivo es demasiado grande.', 'error');
 *   mostrarToast('Cargando...', 'info');
 */
function obtenerContenedorToast() {
  let contenedor = document.getElementById('toast-contenedor');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'toast-contenedor';
    contenedor.setAttribute('aria-live', 'polite');
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

const TOAST_ICONOS = { exito: '✅', error: '❌', info: 'ℹ️', advertencia: '⚠️' };

function mostrarToast(mensaje, tipo = 'info', duracionMs = 4500) {
  const contenedor = obtenerContenedorToast();

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo} animate__animated animate__fadeInRight`;
  toast.innerHTML = `
    <span class="toast-icono">${TOAST_ICONOS[tipo] || TOAST_ICONOS.info}</span>
    <span class="toast-texto"></span>
    <button type="button" class="toast-cerrar" aria-label="Cerrar">&times;</button>
  `;
  toast.querySelector('.toast-texto').textContent = mensaje;

  function quitar() {
    toast.classList.remove('animate__fadeInRight');
    toast.classList.add('animate__fadeOutRight');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  toast.querySelector('.toast-cerrar').addEventListener('click', quitar);
  contenedor.appendChild(toast);

  if (duracionMs > 0) setTimeout(quitar, duracionMs);
  return toast;
}
