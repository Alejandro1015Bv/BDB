/*
 * Modal de confirmación para acciones destructivas (borrar partitura,
 * dar de baja a un estudiante, etc.). Pide escribir el nombre exacto
 * del elemento antes de habilitar el botón de confirmar -- así un clic
 * accidental o un doble clic nunca puede borrar algo por error.
 *
 * Uso:
 *   const confirmado = await confirmarEliminacionPorNombre({
 *     titulo: 'Eliminar partitura',
 *     nombreEsperado: partitura.titulo,
 *     mensajeExtra: 'Esto también borrará su archivo e imagen.'
 *   });
 *   if (confirmado) { ...borrar... }
 */
function confirmarEliminacionPorNombre({ titulo, nombreEsperado, mensajeExtra }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-box">
        <h3>⚠️ ${escapeHtmlSeguro(titulo || 'Confirmar eliminación')}</h3>
        <p>Esta acción no se puede deshacer. Escribe exactamente el siguiente nombre para confirmar:</p>
        <p style="font-weight:800; color:var(--color-berries-dark); word-break:break-word; background:var(--bg-main); padding:8px 12px; border-radius:10px;">
          ${escapeHtmlSeguro(nombreEsperado)}
        </p>
        ${mensajeExtra ? `<p style="font-size:0.82rem; color:#6b7280;">${escapeHtmlSeguro(mensajeExtra)}</p>` : ''}
        <div class="form-group" style="text-align:left;">
          <input type="text" class="neu-input" id="confirm-del-input" placeholder="Escribe aquí el nombre...">
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn-logout" id="confirm-del-cancelar" style="flex:1;">Cancelar</button>
          <button type="button" class="btn-eliminar" id="confirm-del-aceptar" style="flex:1; border-radius:10px; padding:8px 10px;">Eliminar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#confirm-del-input');
    const btnAceptar = overlay.querySelector('#confirm-del-aceptar');
    const btnCancelar = overlay.querySelector('#confirm-del-cancelar');
    input.focus();

    function cerrar(resultado) {
      overlay.remove();
      resolve(resultado);
    }

    function intentarConfirmar() {
      const escrito = input.value.trim().toLowerCase();
      const esperado = String(nombreEsperado || '').trim().toLowerCase();
      if (escrito && escrito === esperado) {
        cerrar(true);
      } else {
        input.style.boxShadow = '0 0 0 3px rgba(198,40,40,0.45)';
        input.value = '';
        input.placeholder = 'No coincide, inténtalo de nuevo';
        input.focus();
      }
    }

    btnAceptar.addEventListener('click', intentarConfirmar);
    btnCancelar.addEventListener('click', () => cerrar(false));
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') intentarConfirmar(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
  });
}

function escapeHtmlSeguro(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto == null ? '' : texto);
  return div.innerHTML;
}
