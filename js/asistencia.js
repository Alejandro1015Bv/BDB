const NIVEL_LABEL = { primaria: 'Primaria', secundaria: 'Secundaria' };
let html5QrCode = null;
let escaneando = false;
let mapaNombreId = {};

document.addEventListener('DOMContentLoaded', async () => {
  await cargarListaBasica();
  iniciarEscaner();

  document.getElementById('btn-mostrar-fallback').addEventListener('click', () => {
    const panel = document.getElementById('kiosk-fallback');
    const visible = panel.style.display === 'flex';
    panel.style.display = visible ? 'none' : 'flex';
  });

  document.getElementById('btn-marcar-pin').addEventListener('click', marcarConPin);
  document.getElementById('fallback-pin').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') marcarConPin();
  });
});

async function cargarListaBasica() {
  if (!window.supabaseClient) return;
  const { data, error } = await window.supabaseClient.rpc('rpc_lista_estudiantes_basico');
  if (error) {
    console.error('Error cargando lista de respaldo:', error);
    return;
  }
  const datalist = document.getElementById('lista-nombres');
  datalist.innerHTML = '';
  mapaNombreId = {};
  (data || []).forEach(est => {
    const etiqueta = `${est.nombre_completo} — ${est.curso}`;
    mapaNombreId[etiqueta] = est.id;
    const option = document.createElement('option');
    option.value = etiqueta;
    datalist.appendChild(option);
  });
}

function iniciarEscaner() {
  html5QrCode = new Html5Qrcode('qr-reader');
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      if (!escaneando) return;
      escaneando = false;
      html5QrCode.pause(true);
      procesarQR(decodedText);
    },
    () => { /* se dispara en cada frame sin QR detectado; se ignora */ }
  ).then(() => {
    escaneando = true;
  }).catch((err) => {
    console.error('No se pudo iniciar la cámara:', err);
    const aviso = document.getElementById('camara-error');
    aviso.style.display = 'block';
    aviso.textContent = 'No se pudo acceder a la cámara. Usa la opción de nombre y PIN, o revisa los permisos del navegador.';
  });
}

async function procesarQR(codigo) {
  const { data, error } = await window.supabaseClient.rpc('rpc_marcar_por_qr', { p_codigo: codigo });
  if (error) {
    mostrarResultado('error', { error: 'Error de conexión. Intenta de nuevo.' });
  } else {
    interpretarRespuesta(data);
  }
  setTimeout(reanudarEscaneo, 4000);
}

async function marcarConPin() {
  const nombreInput = document.getElementById('fallback-nombre');
  const pinInput = document.getElementById('fallback-pin');
  const estudiante_id = mapaNombreId[nombreInput.value];

  if (!estudiante_id) {
    alert('Selecciona tu nombre de la lista de sugerencias.');
    return;
  }
  if (!/^\d{4}$/.test(pinInput.value)) {
    alert('El PIN debe tener 4 dígitos.');
    return;
  }

  const btn = document.getElementById('btn-marcar-pin');
  btn.disabled = true;

  const { data, error } = await window.supabaseClient.rpc('rpc_marcar_por_pin', {
    p_estudiante_id: estudiante_id,
    p_pin: pinInput.value
  });

  btn.disabled = false;
  pinInput.value = '';
  nombreInput.value = '';
  document.getElementById('kiosk-fallback').style.display = 'none';

  if (error) {
    mostrarResultado('error', { error: 'Error de conexión. Intenta de nuevo.' });
  } else {
    interpretarRespuesta(data);
  }
  setTimeout(reanudarEscaneo, 4000);
}

function interpretarRespuesta(data) {
  if (!data.ok) {
    mostrarResultado('error', { error: data.error });
    return;
  }
  mostrarResultado(data.ya_marcado ? 'duplicate' : 'ok', data);
}

function mostrarResultado(estado, datos) {
  const panel = document.getElementById('kiosk-result');
  const icono = document.getElementById('kiosk-icon');
  const foto = document.getElementById('kiosk-foto');
  const nombre = document.getElementById('kiosk-nombre');
  const meta = document.getElementById('kiosk-meta');
  const hora = document.getElementById('kiosk-hora');

  panel.classList.remove('ok', 'duplicate', 'error');
  panel.classList.add('show', estado);

  if (estado === 'error') {
    icono.textContent = '❌';
    foto.style.display = 'none';
    nombre.textContent = 'No se pudo marcar';
    meta.textContent = datos.error || 'Intenta nuevamente.';
    hora.textContent = '';
    return;
  }

  icono.textContent = estado === 'ok' ? '✅' : '⚠️';
  if (datos.foto_url) {
    foto.src = datos.foto_url;
    foto.style.display = 'block';
  } else {
    foto.style.display = 'none';
  }
  nombre.textContent = datos.nombre_completo;
  const nivelTxt = NIVEL_LABEL[datos.nivel] || datos.nivel;
  meta.textContent = `${datos.curso} · ${nivelTxt} · Sección ${datos.seccion}`;
  const horaTexto = new Date(datos.hora).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  hora.textContent = estado === 'ok'
    ? `Asistencia registrada a las ${horaTexto}`
    : `Ya se había marcado hoy a las ${horaTexto}`;
}

function reanudarEscaneo() {
  document.getElementById('kiosk-result').classList.remove('show', 'ok', 'duplicate', 'error');
  if (html5QrCode) {
    html5QrCode.resume();
    escaneando = true;
  }
}
