/*
 * Lista las partituras existentes dentro del Panel de Administración y
 * permite eliminarlas por completo: fila en la base de datos + archivo
 * de partitura + audio (si tiene) en Supabase Storage.
 */

const BUCKET_PARTITURAS = 'partituras';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('lista-partituras-admin')) {
    cargarPartiturasAdmin();
  }
});

async function cargarPartiturasAdmin() {
  const contenedor = document.getElementById('lista-partituras-admin');
  contenedor.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Cargando partituras...</p>';

  const { data, error } = await window.supabaseClient
    .from('partituras')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p style="text-align:center; grid-column:1/-1; color:#c62828;">Error: ${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    contenedor.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Aún no hay partituras subidas.</p>';
    return;
  }

  contenedor.innerHTML = '';
  data.forEach(item => contenedor.appendChild(crearFilaPartituraAdmin(item)));
}

function crearFilaPartituraAdmin(item) {
  const fila = document.createElement('div');
  fila.className = 'student-item animate__animated animate__fadeInUp';

  const top = document.createElement('div');
  top.className = 'student-item-top';

  const info = document.createElement('div');
  const h4 = document.createElement('h4');
  h4.textContent = item.titulo || 'Sin título';
  const small = document.createElement('small');
  small.textContent = `${formatearSeccionAdmin(item.seccion)} · ${item.genero || 'Sin género'}${item.audio_url ? ' · 🎧 con audio' : ''}`;
  info.append(h4, small);
  top.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'student-item-actions';

  const btnVer = document.createElement('a');
  btnVer.href = item.pdf_url || item.archivo_url || '#';
  btnVer.target = '_blank';
  btnVer.rel = 'noopener noreferrer';
  btnVer.className = 'btn-credencial';
  btnVer.style.textDecoration = 'none';
  btnVer.style.textAlign = 'center';
  btnVer.textContent = '👁️ Ver';

  const btnReemplazar = document.createElement('button');
  btnReemplazar.type = 'button';
  btnReemplazar.className = 'btn-logout';
  btnReemplazar.textContent = '🔄 Reemplazar Archivo';
  btnReemplazar.addEventListener('click', () => reemplazarArchivo(item, 'partitura', btnReemplazar));

  const btnReemplazarAudio = document.createElement('button');
  btnReemplazarAudio.type = 'button';
  btnReemplazarAudio.className = 'btn-logout';
  btnReemplazarAudio.textContent = item.audio_url ? '🔄 Reemplazar Audio' : '➕ Agregar Audio';
  btnReemplazarAudio.addEventListener('click', () => reemplazarArchivo(item, 'audio', btnReemplazarAudio));

  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'btn-eliminar';
  btnEliminar.textContent = '🗑️ Eliminar';
  btnEliminar.addEventListener('click', () => eliminarPartitura(item, fila));

  actions.append(btnVer, btnReemplazar, btnReemplazarAudio, btnEliminar);
  fila.append(top, actions);
  return fila;
}

function reemplazarArchivo(item, tipo, boton) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = tipo === 'audio' ? 'audio/*' : 'application/pdf,image/png,image/jpeg,image/jpg';
  input.style.display = 'none';

  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.remove();
    if (!file) return;

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Subiendo...';

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const carpeta = tipo === 'audio' ? 'audios' : 'partituras';
      const nuevaRuta = `${carpeta}/${item.id}_${Date.now()}.${ext}`;

      const { error: upErr } = await window.supabaseClient.storage
        .from(BUCKET_PARTITURAS)
        .upload(nuevaRuta, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = window.supabaseClient.storage
        .from(BUCKET_PARTITURAS)
        .getPublicUrl(nuevaRuta);

      const camposActualizar = tipo === 'audio'
        ? { audio_url: urlData.publicUrl }
        : {
            pdf_url: urlData.publicUrl,
            tipo_archivo: ['jpg', 'jpeg', 'png'].includes(ext) ? 'imagen' : 'pdf'
          };

      const { error: dbErr } = await window.supabaseClient
        .from('partituras')
        .update(camposActualizar)
        .eq('id', item.id);
      if (dbErr) throw new Error(dbErr.message);

      // Borrar el archivo viejo del Storage (best-effort, no bloquea si falla)
      const urlVieja = tipo === 'audio' ? item.audio_url : (item.pdf_url || item.archivo_url);
      const rutaVieja = extraerRutaStorage(urlVieja, BUCKET_PARTITURAS);
      if (rutaVieja) {
        window.supabaseClient.storage.from(BUCKET_PARTITURAS).remove([rutaVieja])
          .then(({ error }) => { if (error) console.warn('Aviso borrando archivo anterior:', error.message); });
      }

      mostrarToast(`${tipo === 'audio' ? 'Audio' : 'Archivo'} reemplazado con éxito.`, 'exito');
      await cargarPartiturasAdmin();
    } catch (err) {
      console.error(err);
      boton.disabled = false;
      boton.textContent = textoOriginal;
      mostrarToast('No se pudo reemplazar el archivo: ' + err.message, 'error');
    }
  });

  document.body.appendChild(input);
  input.click();
}

async function eliminarPartitura(item, fila) {
  const confirmado = await confirmarEliminacionPorNombre({
    titulo: 'Eliminar partitura',
    nombreEsperado: item.titulo,
    mensajeExtra: 'Se borrará también el archivo de la partitura y su audio (si tiene) del almacenamiento. No se puede deshacer.'
  });
  if (!confirmado) return;

  fila.style.opacity = '0.5';

  try {
    const rutas = [];
    const rutaPartitura = extraerRutaStorage(item.pdf_url || item.archivo_url, BUCKET_PARTITURAS);
    if (rutaPartitura) rutas.push(rutaPartitura);
    const rutaAudio = extraerRutaStorage(item.audio_url, BUCKET_PARTITURAS);
    if (rutaAudio) rutas.push(rutaAudio);

    if (rutas.length) {
      const { error: storageError } = await window.supabaseClient.storage
        .from(BUCKET_PARTITURAS)
        .remove(rutas);
      // No detenemos el proceso si falla el borrado del archivo (por ejemplo,
      // si ya no existía); lo importante es que desaparezca de la lista.
      if (storageError) console.warn('Aviso borrando archivos de Storage:', storageError.message);
    }

    const { data: filasBorradas, error: dbError } = await window.supabaseClient
      .from('partituras')
      .delete()
      .eq('id', item.id)
      .select();

    if (dbError) throw new Error(dbError.message);

    if (!filasBorradas || filasBorradas.length === 0) {
      throw new Error(
        'La base de datos no reportó error, pero no se borró ninguna fila. ' +
        'Esto casi siempre significa que tu tabla "partituras" tiene Row Level ' +
        'Security activado sin una política que permita DELETE. Revisa las ' +
        'políticas de esa tabla en Supabase (Authentication > Policies).'
      );
    }

    fila.remove();
    mostrarToast(`"${item.titulo}" fue eliminada.`, 'info');
  } catch (err) {
    console.error(err);
    fila.style.opacity = '1';
    mostrarToast('No se pudo eliminar la partitura: ' + err.message +
      ' (si menciona permisos/RLS, revisa que tu tabla y bucket "partituras" permitan borrar)', 'error');
  }
}

function extraerRutaStorage(url, bucket) {
  if (!url) return null;
  const marcador = `/object/public/${bucket}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

function formatearSeccionAdmin(valor) {
  const mapa = {
    clarinete: 'Clarinete',
    saxofon: 'Saxofón',
    trompeta: 'Trompeta',
    bajo: 'Bajo / Tuba',
    liras: 'Liras'
  };
  return mapa[String(valor).toLowerCase()] || valor || 'General';
}
