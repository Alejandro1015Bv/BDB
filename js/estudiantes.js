// NIVEL_LABEL ya está declarado globalmente por credenciales.js (se carga antes
// en estudiantes.html) -- no lo repetimos aquí para evitar un choque de
// identificadores entre los dos <script> (rompía toda la página).
let estudiantesCache = [];

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

  fotoInput.addEventListener('change', () => {
    const file = fotoInput.files[0];
    if (file) fotoPreview.src = URL.createObjectURL(file);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnGuardar.disabled = true;
    statusMsg.style.color = 'blue';
    statusMsg.textContent = 'Guardando...';

    try {
      const nombre_completo = document.getElementById('nombre_completo').value.trim();
      const curso = document.getElementById('curso').value.trim();
      const nivel = document.getElementById('nivel').value;
      const seccion = document.getElementById('seccion').value.trim();
      const fotoFile = fotoInput.files[0];

      let foto_url = null;
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

      const { error: dbErr } = await window.supabaseClient.from('estudiantes').insert([{
        nombre_completo, curso, nivel, seccion, foto_url
      }]);
      if (dbErr) throw new Error('Error guardando el estudiante: ' + dbErr.message);

      statusMsg.style.color = 'green';
      statusMsg.textContent = '¡Estudiante registrado con éxito!';
      form.reset();
      fotoPreview.src = '../assets/logo-colegio.png';
      await cargarListaEstudiantes();
    } catch (err) {
      console.error(err);
      statusMsg.style.color = 'red';
      statusMsg.textContent = err.message;
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
    } catch (err) {
      console.error(err);
      alert('Error generando el PDF: ' + err.message);
    } finally {
      btnTodas.disabled = false;
      btnTodas.textContent = textoOriginal;
    }
  });

  await cargarListaEstudiantes();
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
  info.append(h4, small);

  top.append(img, info);

  const actions = document.createElement('div');
  actions.className = 'student-item-actions';

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
      alert('Error generando la credencial: ' + err.message);
    } finally {
      btnCred.disabled = false;
      btnCred.textContent = textoOriginal;
    }
  });

  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'btn-eliminar';
  btnDel.textContent = '🗑️ Dar de baja';
  btnDel.addEventListener('click', () => eliminarEstudiante(est, card));

  actions.append(btnCred, btnDel);
  card.append(top, actions);
  return card;
}

async function eliminarEstudiante(est, card) {
  const confirmado = confirm(
    `¿Dar de baja a "${est.nombre_completo}"?\n\n` +
    `Ya no podrá marcar asistencia ni aparecerá en la lista, pero su historial ` +
    `de asistencias anteriores se conserva (no se borra, para no afectar notas ya calculadas).`
  );
  if (!confirmado) return;

  // Baja lógica (activo = false), NO se borra la fila para conservar el
  // historial de asistencias ya registrado (relevante para la nota final).
  const { error } = await window.supabaseClient
    .from('estudiantes')
    .update({ activo: false })
    .eq('id', est.id);

  if (error) {
    alert('Error al dar de baja: ' + error.message);
    return;
  }
  card.remove();
  estudiantesCache = estudiantesCache.filter(e => e.id !== est.id);
}
