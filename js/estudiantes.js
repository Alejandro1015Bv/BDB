// NIVEL_LABEL ya está declarado globalmente por credenciales.js (se carga antes
// en estudiantes.html) -- no lo repetimos aquí para evitar un choque de
// identificadores entre los dos <script> (rompía toda la página).
let estudiantesCache = [];
let estudianteEditandoId = null; // null = modo "registrar nuevo"

document.addEventListener('DOMContentLoaded', () => {
  protegerConSupabaseAuth(async (email) => {
    document.getElementById('pagina-contenido').style.display = 'block';
    document.getElementById('sesion-email').textContent = email;
    await inicializarEstudiantes();
  });
});

async function inicializarEstudiantes() {
  const form = document.getElementById('form-estudiante');
  const fotoInput = document.getElementById('foto-input');
  const fotoPreview = document.getElementById('foto-preview');
  const statusMsg = document.getElementById('status-message');
  const btnGuardar = document.getElementById('btn-guardar');
  const btnTodas = document.getElementById('btn-todas-credenciales');
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');

  fotoInput.addEventListener('change', () => {
    const file = fotoInput.files[0];
    if (file) fotoPreview.src = URL.createObjectURL(file);
  });

  btnCancelarEdicion.addEventListener('click', salirModoEdicion);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnGuardar.disabled = true;
    statusMsg.textContent = estudianteEditandoId ? 'Guardando cambios...' : 'Guardando...';

    try {
      const nombres = document.getElementById('nombres').value.trim();
      const apellidos = document.getElementById('apellidos').value.trim();
      const curso = document.getElementById('curso').value.trim();
      const nivel = document.getElementById('nivel').value;
      const seccion = document.getElementById('seccion').value.trim();
      const fotoFile = fotoInput.files[0];

      let foto_url = estudianteEditandoId
        ? (estudiantesCache.find(e => e.id === estudianteEditandoId)?.foto_url || null)
        : null;

      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop().toLowerCase();
        const path = `fotos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await window.supabaseClient.storage
          .from('estudiantes')
          .upload(path, fotoFile, { cacheControl: '3600', upsert: false });
        if (upErr) throw new Error('Error subiendo la foto: ' + upErr.message);

        const { data: urlData } = window.supabaseClient.storage.from('estudiantes').getPublicUrl(path);
        foto_url = urlData.publicUrl;
      }

      const registro = { nombres, apellidos, curso, nivel, seccion, foto_url };

      if (estudianteEditandoId) {
        const { error: dbErr } = await window.supabaseClient
          .from('estudiantes')
          .update(registro)
          .eq('id', estudianteEditandoId);
        if (dbErr) throw new Error('Error guardando los cambios: ' + dbErr.message);
        mostrarToast('¡Estudiante actualizado con éxito!', 'exito');
      } else {
        const { error: dbErr } = await window.supabaseClient.from('estudiantes').insert([registro]);
        if (dbErr) throw new Error('Error guardando el estudiante: ' + dbErr.message);
        mostrarToast('¡Estudiante registrado con éxito!', 'exito');
      }

      statusMsg.textContent = '';
      salirModoEdicion();
      await cargarListaEstudiantes();
    } catch (err) {
      console.error(err);
      statusMsg.textContent = '';
      mostrarToast(err.message, 'error');
    } finally {
      btnGuardar.disabled = false;
    }
  });

  btnTodas.addEventListener('click', async () => {
    if (!estudiantesCache.length) return;
    btnTodas.disabled = true;
    const textoOriginal = btnTodas.textContent;
    btnTodas.textContent = 'Generando PDF...';
    try {
      await generarTodasCredencialesPDF(estudiantesCache);
      mostrarToast('PDF con todas las credenciales generado.', 'exito');
    } catch (err) {
      console.error(err);
      mostrarToast('Error generando el PDF: ' + err.message, 'error');
    } finally {
      btnTodas.disabled = false;
      btnTodas.textContent = textoOriginal;
    }
  });

  await cargarListaEstudiantes();
}

function entrarModoEdicion(est) {
  estudianteEditandoId = est.id;

  document.getElementById('nombres').value = est.nombres || '';
  document.getElementById('apellidos').value = est.apellidos || '';
  document.getElementById('curso').value = est.curso || '';
  document.getElementById('nivel').value = est.nivel || '';
  document.getElementById('seccion').value = est.seccion || '';
  document.getElementById('foto-preview').src = est.foto_url || '../assets/logo-colegio.png';
  document.getElementById('foto-input').value = '';

  document.getElementById('banner-editando').style.display = 'flex';
  document.getElementById('banner-editando-texto').textContent = `Editando a: ${est.nombre_completo}`;
  document.getElementById('btn-guardar').textContent = 'Guardar Cambios';

  document.getElementById('form-estudiante').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function salirModoEdicion() {
  estudianteEditandoId = null;
  document.getElementById('form-estudiante').reset();
  document.getElementById('foto-preview').src = '../assets/logo-colegio.png';
  document.getElementById('banner-editando').style.display = 'none';
  document.getElementById('btn-guardar').textContent = 'Registrar Estudiante';
}

async function cargarListaEstudiantes() {
  const contenedor = document.getElementById('lista-estudiantes');
  contenedor.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Cargando estudiantes...</p>';

  const { data, error } = await window.supabaseClient
    .from('estudiantes')
    .select('*')
    .eq('activo', true)
    .order('nombre_completo');

  if (error) {
    contenedor.innerHTML = `<p style="text-align:center; grid-column:1/-1; color:#c62828;">Error: ${error.message}</p>`;
    return;
  }

  estudiantesCache = data || [];

  if (!estudiantesCache.length) {
    contenedor.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Aún no hay estudiantes registrados.</p>';
    return;
  }

  contenedor.innerHTML = '';
  estudiantesCache.forEach(est => contenedor.appendChild(crearTarjetaEstudiante(est)));
}

function crearTarjetaEstudiante(est) {
  const card = document.createElement('div');
  card.className = 'student-item animate__animated animate__fadeInUp';

  const top = document.createElement('div');
  top.className = 'student-item-top';

  const img = document.createElement('img');
  img.className = 'student-photo';
  img.src = est.foto_url || '../assets/logo-colegio.png';
  img.alt = est.nombre_completo;

  const info = document.createElement('div');
  const h4 = document.createElement('h4');
  h4.textContent = est.nombre_completo;
  const small = document.createElement('small');
  small.textContent = `${est.curso} · ${NIVEL_LABEL[est.nivel] || est.nivel} · Sección ${est.seccion}`;
  const smallRegistro = document.createElement('small');
  smallRegistro.style.cssText = 'opacity:0.75;';
  smallRegistro.textContent = `N° Registro: ${est.numero_registro || '—'}`;
  info.append(h4, small, smallRegistro);

  top.append(img, info);

  const actions = document.createElement('div');
  actions.className = 'student-item-actions';

  const btnEditar = document.createElement('button');
  btnEditar.type = 'button';
  btnEditar.className = 'btn-logout';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.addEventListener('click', () => entrarModoEdicion(est));

  const btnCred = document.createElement('button');
  btnCred.type = 'button';
  btnCred.className = 'btn-credencial';
  btnCred.textContent = '🪪 Credencial';
  btnCred.addEventListener('click', async () => {
    btnCred.disabled = true;
    const textoOriginal = btnCred.textContent;
    btnCred.textContent = 'Generando...';
    try {
      await generarCredencialPDF(est);
    } catch (err) {
      console.error(err);
      mostrarToast('Error generando la credencial: ' + err.message, 'error');
    } finally {
      btnCred.disabled = false;
      btnCred.textContent = textoOriginal;
    }
  });

  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'btn-eliminar';
  btnDel.textContent = '🗑️ Eliminar';
  btnDel.addEventListener('click', () => eliminarEstudiante(est, card));

  actions.append(btnEditar, btnCred, btnDel);
  card.append(top, actions);
  return card;
}

async function eliminarEstudiante(est, card) {
  const confirmado = await confirmarEliminacionPorNombre({
    titulo: 'Eliminar estudiante',
    nombreEsperado: est.nombre_completo,
    mensajeExtra: 'El estudiante ya no podrá marcar asistencia ni aparecerá en la lista. Su historial de asistencias anteriores se conserva (no se borra, para no afectar notas ya calculadas).'
  });
  if (!confirmado) return;

  // Baja lógica (activo = false), NO se borra la fila para conservar el
  // historial de asistencias ya registrado (relevante para la nota final).
  const { data: filasActualizadas, error } = await window.supabaseClient
    .from('estudiantes')
    .update({ activo: false })
    .eq('id', est.id)
    .select();

  if (error) {
    mostrarToast('Error al eliminar: ' + error.message, 'error');
    return;
  }
  if (!filasActualizadas || filasActualizadas.length === 0) {
    mostrarToast('No se pudo eliminar: revisa que tu sesión siga activa y las políticas de la tabla "estudiantes".', 'error');
    return;
  }
  mostrarToast(`"${est.nombre_completo}" fue eliminado.`, 'info');
  card.remove();
  estudiantesCache = estudiantesCache.filter(e => e.id !== est.id);
  if (estudianteEditandoId === est.id) salirModoEdicion();
}
