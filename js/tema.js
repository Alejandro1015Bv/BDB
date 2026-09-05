/*
 * Modo oscuro con recuerdo de preferencia (localStorage). Se aplica ANTES
 * de que termine de cargar el resto de la página para evitar el "flash"
 * de tema claro al entrar con modo oscuro ya elegido.
 */
(function aplicarTemaGuardado() {
  const guardado = localStorage.getItem('bda-tema');
  const prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = guardado || (prefiereOscuro ? 'dark' : 'light');
  if (tema === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

function alternarTema() {
  const esOscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  if (esOscuro) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('bda-tema', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bda-tema', 'dark');
  }
  actualizarIconoTema();
}

function actualizarIconoTema() {
  const boton = document.querySelector('.theme-toggle');
  if (!boton) return;
  const esOscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  boton.textContent = esOscuro ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', actualizarIconoTema);
