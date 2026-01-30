import { supabase } from './supabase-config.js';

// 1. Función para marcar/desmarcar checkboxes rápidamente
window.marcarTodos = (clase) => {
    const checkboxes = document.querySelectorAll(`.${clase}`);
    const todosMarcados = Array.from(checkboxes).every(c => c.checked);
    checkboxes.forEach(c => c.checked = !todosMarcados);
    actualizarContador();
};

// 2. Buscar en Supabase basándose en múltiples filtros
export async function buscarPartiturasAvanzado() {
    const instSeleccionados = Array.from(document.querySelectorAll('.filtro-inst:checked')).map(c => c.value);
    const genSeleccionados = Array.from(document.querySelectorAll('.filtro-gen:checked')).map(c => c.value);

    let query = supabase.from('partituras').select('*');

    if (instSeleccionados.length > 0) query = query.in('instrumento', instSeleccionados);
    if (genSeleccionados.length > 0) query = query.in('genero', genSeleccionados);

    const { data, error } = await query;
    const contenedor = document.getElementById('lista-resultados');
    const panelAcciones = document.getElementById('panel-acciones');

    if (error || data.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron partituras con esos filtros.</p>";
        panelAcciones.style.display = "none";
        return;
    }

    panelAcciones.style.display = "flex";
    contenedor.innerHTML = data.map(p => `
        <div class="card-partitura">
            <input type="checkbox" class="check-partitura" data-url="${p.archivo_url}" onchange="actualizarContador()">
            <div class="info">
                <h3>${p.titulo}</h3>
                <small>${p.instrumento} | ${p.genero}</small>
            </div>
        </div>
    `).join('');
}

// 3. La lógica de descarga (JPG vs PDF)
async function procesarDescarga() {
    const seleccionados = Array.from(document.querySelectorAll('.check-partitura:checked'));
    if (seleccionados.length === 0) return alert("Selecciona partituras primero");

    const { jsPDF } = window.jspdf;

    if (seleccionados.length <= 3) {
        // DESCARGA JPG INDIVIDUAL
        alert("Descargando imágenes...");
        seleccionados.forEach((check, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = check.dataset.url;
                link.download = `partitura_${index}.jpg`;
                link.click();
            }, index * 500); // Pequeño retraso para no bloquear el navegador
        });
    } else {
        // GENERAR PDF
        const pdf = new jsPDF();
        alert("Generando PDF con " + seleccionados.length + " páginas...");
        
        for (let i = 0; i < seleccionados.length; i++) {
            const img = await cargarImagen(seleccionados[i].dataset.url);
            const props = pdf.getImageProperties(img);
            const width = pdf.internal.pageSize.getWidth();
            const height = (props.height * width) / props.width;
            
            if (i > 0) pdf.addPage();
            pdf.addImage(img, 'JPEG', 0, 0, width, height);
        }
        pdf.save("Banda_Colegio_Partituras.pdf");
    }
}

// Función auxiliar necesaria para actualizar el contador visual
window.actualizarContador = () => {
    const cant = document.querySelectorAll('.check-partitura:checked').length;
    document.getElementById('contador-seleccion').innerText = `${cant} seleccionadas`;
};

// Función para cargar imagen (CORS safe)
function cargarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => resolve(img);
    });
}