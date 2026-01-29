import { cargarPartituras } from './display.js';
import { inicializarFormularioSubida } from './upload.js';

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const seccion = link.dataset.url;
            
            if(seccion === "inicio") {
                location.reload();
                return;
            }

            try {
                const resp = await fetch(`secciones/${seccion}.html`);
                if(!resp.ok) throw new Error();
                const html = await resp.text();
                content.innerHTML = html;

                // Si la sección tiene data-inst, cargamos sus partituras
                const header = content.querySelector('h2');
                if (header && header.dataset.inst) {
                    cargarPartituras(header.dataset.inst);
                }

                // Si cargamos la página de subida (aunque no esté en el menú)
                if(seccion === 'subir') inicializarFormularioSubida();
                
            } catch (err) {
                content.innerHTML = "<h2>Error al cargar la sección</h2>";
            }
        });
    });
});

// Función global para los botones de filtro
window.ejecutarFiltro = (genero) => {
    const h2 = document.querySelector('h2');
    if(h2) cargarPartituras(h2.dataset.inst, genero);
};