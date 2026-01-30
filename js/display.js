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
                <img src="${p.archivo_url}" alt="${p.titulo}" style="max-width: 100%; height: auto;" onclick="abrirModal('${p.archivo_url}', '${p.titulo}')">
            </div>
            <a href="${p.archivo_url}" target="_blank" class="btn-descargar">Ver / Descargar</a>
        </div>
    `).join('');

    // Agregar modal al contenedor si no existe
    if (!document.getElementById('modal-partitura')) {
        contenedor.insertAdjacentHTML('afterend', `
            <div id="modal-partitura" class="modal-partitura" style="display: none;">
                <div class="modal-content">
                    <span class="cerrar-modal" onclick="cerrarModal()">&times;</span>
                    <img id="modal-img" src="" alt="">
                    <p id="modal-titulo"></p>
                </div>
            </div>
        `);
    }
}

// Funciones para el modal de visualización
window.abrirModal = (url, titulo) => {
    const modal = document.getElementById('modal-partitura');
    const modalImg = document.getElementById('modal-img');
    const modalTitulo = document.getElementById('modal-titulo');

    modalImg.src = url;
    modalTitulo.innerText = titulo;
    modal.style.display = 'block';
};

window.cerrarModal = () => {
    const modal = document.getElementById('modal-partitura');
    modal.style.display = 'none';
};

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-partitura');
    if (e.target === modal) {
        cerrarModal();
    }
});
