const NIVEL_LABEL = { primaria: 'Primaria', secundaria: 'Secundaria' };
let registrosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  protegerConSupabaseAuth(async (email) => {
    document.getElementById('pagina-contenido').style.display = 'block';
    document.getElementById('sesion-email').textContent = email;
    await inicializarPanel();
  });
});

async function inicializarPanel() {
  const fechaInicio = document.getElementById('filtro-fecha-inicio');
  const fechaFin = document.getElementById('filtro-fecha-fin');
  const buscarInput = document.getElementById('filtro-buscar');
  const btnExportar = document.getElementById('btn-exportar');
  const btnFiltrar = document.getElementById('btn-filtrar');

  const hoy = new Date().toISOString().slice(0, 10);
  fechaInicio.value = hoy;
  fechaFin.value = hoy;

  btnFiltrar.addEventListener('click', cargarAsistencias);
  buscarInput.addEventListener('input', renderizarTabla);
  btnExportar.addEventListener('click', exportarExcel);

  await cargarAsistencias();
}

async function cargarAsistencias() {
  const tbody = document.querySelector('#tabla-asistencias tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';

  const fechaInicio = document.getElementById('filtro-fecha-inicio').value;
  const fechaFin = document.getElementById('filtro-fecha-fin').value;

  let query = window.supabaseClient
    .from('asistencias')
    .select('id, fecha, hora, metodo, estudiantes(nombre_completo, curso, nivel, seccion)')
    .order('hora', { ascending: false });

  if (fechaInicio) query = query.gte('fecha', fechaInicio);
  if (fechaFin) query = query.lte('fecha', fechaFin);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#c62828;">Error: ${error.message}</td></tr>`;
    return;
  }

  registrosCache = data || [];
  renderizarTabla();
}

function filtrarPorTexto() {
  const texto = document.getElementById('filtro-buscar').value.trim().toLowerCase();
  if (!texto) return registrosCache;
  return registrosCache.filter(r => {
    const nombre = (r.estudiantes?.nombre_completo || '').toLowerCase();
    return nombre.includes(texto);
  });
}

function renderizarTabla() {
  const tbody = document.querySelector('#tabla-asistencias tbody');
  const filtrados = filtrarPorTexto();

  document.getElementById('contador-registros').textContent =
    `${filtrados.length} ${filtrados.length === 1 ? 'registro' : 'registros'}`;

  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros con estos filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  filtrados.forEach(r => {
    const est = r.estudiantes || {};
    const tr = document.createElement('tr');

    const celdas = [
      est.nombre_completo || '—',
      est.curso || '—',
      NIVEL_LABEL[est.nivel] || est.nivel || '—',
      est.seccion || '—',
      r.fecha,
      new Date(r.hora).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    ];

    celdas.forEach(texto => {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.appendChild(td);
    });

    const tdMetodo = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${r.metodo}`;
    badge.textContent = r.metodo.toUpperCase();
    tdMetodo.appendChild(badge);
    tr.appendChild(tdMetodo);

    tbody.appendChild(tr);
  });
}

function exportarExcel() {
  const filtrados = filtrarPorTexto();

  if (!filtrados.length) {
    alert('No hay registros para exportar con los filtros actuales.');
    return;
  }

  const filas = filtrados.map(r => {
    const est = r.estudiantes || {};
    return {
      'Nombre Completo': est.nombre_completo || '',
      'Curso': est.curso || '',
      'Nivel': NIVEL_LABEL[est.nivel] || est.nivel || '',
      'Sección': est.seccion || '',
      'Fecha': r.fecha,
      'Hora': new Date(r.hora).toLocaleTimeString('es-BO'),
      'Método': r.metodo.toUpperCase()
    };
  });

  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

  const inicio = document.getElementById('filtro-fecha-inicio').value;
  const fin = document.getElementById('filtro-fecha-fin').value;
  XLSX.writeFile(wb, `Asistencias_${inicio}_a_${fin}.xlsx`);
}
