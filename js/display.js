/*
 * Catálogo de partituras
 * - Carga datos desde Supabase
 * - Búsqueda en tiempo real
 * - Filtros por sección y género
 * - Descarga real de archivos (PDF/PNG/JPG)
 */

document.addEventListener('DOMContentLoaded', inicializarCatalogo);

async function inicializarCatalogo() {
  const container = document.getElementById('partituras-container');
  if (!container) return;

  if (!window.supabaseClient) {
    mostrarMensaje(container, 'No se pudo inicializar la conexión con Supabase.', true);
    return;
  }

  const esCatalogoGeneral = container.dataset.seccion === 'todas';
  const searchInput = document.getElementById('search-input');
  const filtroInstrumento = document.getElementById('filtro-instrumento');
  const filtroGenero = document.getElementById('filtro-genero');
  const btnLimpiar = document.getElementById('btn-limpiar-filtros');
  const contador = document.getElementById('contador-resultados');

  let partituras = [];

  try {
    let query = window.supabaseClient
      .from('partituras')
      .select('*')
      .order('created_at', { ascending: false });

    if (!esCatalogoGeneral && container.dataset.seccion) {
      query = query.eq('seccion', container.dataset.seccion);
    }

    const { data, error } = await query;
    if (error) throw error;

    partituras = Array.isArray(data) ? data : [];

    if (esCatalogoGeneral) {
      poblarFiltros(partituras, filtroInstrumento, filtroGenero);
      searchInput?.addEventListener('input', renderizar);
      filtroInstrumento?.addEventListener('change', renderizar);
      filtroGenero?.addEventListener('change', renderizar);
      btnLimpiar?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (filtroInstrumento) filtroInstrumento.value = 'TODOS';
        if (filtroGenero) filtroGenero.value = 'TODOS';
        renderizar();
      });
    }

    renderizar();
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    mostrarMensaje(container, 'Error al cargar los archivos. Revisa la conexión con Supabase.', true);
  }

  function renderizar() {
    const texto = normalizar(searchInput?.value || '');
    const instrumento = filtroInstrumento?.value || 'TODOS';
    const genero = filtroGenero?.value || 'TODOS';

    const resultados = partituras.filter(item => {
      const titulo = normalizar(item.titulo || '');
      const seccion = String(item.seccion || item.instrumento || '').trim();
      const generoItem = String(item.genero || '').trim();

      const coincideTexto = !texto || titulo.includes(texto);
      const coincideInstrumento = instrumento === 'TODOS' || seccion === instrumento;
      const coincideGenero = genero === 'TODOS' || generoItem === genero;

      return coincideTexto && coincideInstrumento && coincideGenero;
    });

    if (contador) {
      contador.textContent = `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`;
    }

    if (resultados.length === 0) {
      mostrarMensaje(container, 'No se encontraron partituras con los criterios seleccionados.');
      return;
    }

    container.innerHTML = '';
    resultados.forEach(item => container.appendChild(crearTarjeta(item)));
  }
}

function poblarFiltros(partituras, filtroInstrumento, filtroGenero) {
  if (filtroInstrumento) {
    const valores = [...new Set(
      partituras
        .map(item => String(item.seccion || item.instrumento || '').trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'es'));

    filtroInstrumento.innerHTML = '<option value="TODOS">Todos los instrumentos</option>';
    valores.forEach(valor => {
      filtroInstrumento.appendChild(new Option(formatearSeccion(valor), valor));
    });
  }

  if (filtroGenero) {
    const valores = [...new Set(
      partituras
        .map(item => String(item.genero || '').trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'es'));

    filtroGenero.innerHTML = '<option value="TODOS">Todos los géneros</option>';
    valores.forEach(valor => {
      filtroGenero.appendChild(new Option(valor, valor));
    });
  }
}

function crearTarjeta(item) {
  const card = document.createElement('div');
  card.className = 'sheet-card animate__animated animate__fadeInUp';

  const titulo = item.titulo || 'Partitura sin título';
  const seccion = item.seccion || item.instrumento || 'General';
  const genero = item.genero || 'General';
  const url = item.pdf_url || item.archivo_url || '';
  const esImagen = item.tipo_archivo === 'imagen' || /\.(jpeg|jpg|png|webp)(?:\?|$)/i.test(url);
  const nombreArchivo = construirNombreArchivo(titulo, item.tipo_archivo, url);

  const encabezado = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = titulo;
  const badge = document.createElement('span');
  badge.className = 'badge-genre';
  badge.textContent = genero;
  encabezado.append(h3, badge);

  const meta = document.createElement('p');
  meta.style.cssText = 'margin: 8px 0; font-size: 0.9rem; color: #555;';
  meta.textContent = `Instrumento: ${formatearSeccion(seccion)}`;

  card.append(encabezado, meta);

  if (esImagen && url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Vista previa de ${titulo}`;
    img.className = 'media-preview';
    img.loading = 'lazy';
    card.appendChild(img);
  }

  if (item.audio_url) {
    const audioBox = document.createElement('div');
    audioBox.className = 'audio-box';
    const label = document.createElement('label');
    label.textContent = '🎧 Audio de referencia:';
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.className = 'audio-player';
    audio.preload = 'none';
    const source = document.createElement('source');
    source.src = item.audio_url;
    audio.appendChild(source);
    audioBox.append(label, audio);
    card.appendChild(audioBox);
  } else {
    const sinAudio = document.createElement('p');
    sinAudio.style.cssText = 'font-size: 0.85rem; color: #666; font-style: italic;';
    sinAudio.textContent = 'Sin audio disponible';
    card.appendChild(sinAudio);
  }

  const acciones = document.createElement('div');
  acciones.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;';

  if (url) {
    const ver = document.createElement('a');
    ver.href = url;
    ver.target = '_blank';
    ver.rel = 'noopener noreferrer';
    ver.className = 'btn-pdf';
    ver.textContent = esImagen ? '🖼️ Ver Imagen' : '📖 Ver Partitura';

    const descargar = document.createElement('button');
    descargar.type = 'button';
    descargar.className = 'btn-pdf';
    descargar.textContent = '⬇️ Descargar';
    descargar.addEventListener('click', () => descargarArchivo(url, nombreArchivo, descargar));

    acciones.append(ver, descargar);
  }

  card.appendChild(acciones);
  return card;
}

async function descargarArchivo(url, nombreArchivo, boton) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = '⏳ Descargando...';

  try {
    // Primero intentamos descargar como Blob para forzar el guardado local.
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = blobUrl;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error('Descarga directa falló:', error);

    // Fallback: el navegador abre el archivo si el servidor bloquea la descarga por CORS.
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

function construirNombreArchivo(titulo, tipoArchivo, url) {
  const limpio = String(titulo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'partitura';

  let extension = tipoArchivo === 'imagen' ? '.jpg' : '.pdf';
  const coincidencia = String(url || '').match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (coincidencia && /^(pdf|png|jpe?g|webp)$/i.test(coincidencia[1])) {
    extension = `.${coincidencia[1].toLowerCase()}`;
  }

  return `${limpio}${extension}`;
}

function normalizar(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatearSeccion(valor) {
  const mapa = {
    clarinete: 'Clarinete',
    saxofon: 'Saxofón',
    trompeta: 'Trompeta',
    bajo: 'Bajo / Tuba',
    liras: 'Liras'
  };
  return mapa[String(valor).toLowerCase()] || valor;
}

function mostrarMensaje(container, mensaje, error = false) {
  container.innerHTML = '';
  const p = document.createElement('p');
  p.style.cssText = `text-align:center;grid-column:1/-1;${error ? 'color:#c62828;' : ''}`;
  p.textContent = mensaje;
  container.appendChild(p);
}
