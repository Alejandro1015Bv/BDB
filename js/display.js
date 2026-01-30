import { supabase } from './supabase-config.js';

export async function cargarPartituras(instrumento, genero = 'todos') {
    const contenedor = document.getElementById('lista-partituras');
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Buscando partituras...</p>';

    let query = supabase.from('partituras').select('*').eq('instrumento', instrumento);
    if (genero !== 'todos') query = query.eq('genero', genero);

    const { data, error } = await query;

    if (error) return contenedor.innerHTML = '<p>Error de conexión.</p>';
    if (data.length === 0) return contenedor.innerHTML = '<p>No hay partituras aún.</p>';

    contenedor.innerHTML = data.map(p => `
        <div class="card-partitura">
            <h3>${p.titulo}</h3>
            <p>Categoría: <strong>${p.genero}</strong></p>
            <div class="partitura-imagen">
                <img src="${p.archivo_url}" alt="${p.titulo}" style="max-width: 100%; height: auto;">
            </div>
            <a href="${p.archivo_url}" target="_blank" class="btn-descargar">Ver / Descargar</a>
        </div>
    `).join('');
}