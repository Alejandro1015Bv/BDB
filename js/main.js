// Este es un ejemplo conceptual.
// En la práctica, necesitarás una estructura de datos más robusta.

const partituras = {
    'saxofon': {
        'bailables': [
            { titulo: 'Saxofón - Bailable 1', archivo: 'partitura1_sax_bailable.jpg' },
            { titulo: 'Saxofón - Bailable 2', archivo: 'partitura2_sax_bailable.jpg' }
        ],
        'marchas': [
            { titulo: 'Saxofón - Marcha 1', archivo: 'partitura1_sax_marcha.jpg' }
        ]
    },
    'clarinetes': {
        'bailables': [
            { titulo: 'Clarinete - Bailable 1', archivo: 'partitura1_clarinete_bailable.jpg' }
        ],
        'marchas': [
            { titulo: 'Clarinete - Marcha 1', archivo: 'partitura1_clarinete_marcha.jpg' }
        ]
    },
    'bajoytrombon': {
        'bailables': [
            { titulo: 'Bajo/Trombón - Bailable 1', archivo: 'partitura1_bajoytrombon_bailable.jpg' }
        ],
        'marchas': [
            { titulo: 'Bajo/Trombón - Marcha 1', archivo: 'partitura1_bajoytrombon_marcha.jpg' }
        ]
    },
    'trompetas': {
        'bailables': [
            { titulo: 'Trompeta - Bailable 1', archivo: 'partitura1_trompeta_bailable.jpg' }
        ],
        'marchas': [
            { titulo: 'Trompeta - Marcha 1', archivo: 'partitura1_trompeta_marcha.jpg' }
        ]
    },
    'liras': {
        'bailables': [
            { titulo: 'Lira - Bailable 1', archivo: 'partitura1_lira_bailable.jpg' }
        ],
        'marchas': [
            { titulo: 'Lira - Marcha 1', archivo: 'partitura1_lira_marcha.jpg' }
        ]
    }
};

// Cargar las partituras al cargar la página de instrumento
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const instrumento = params.get('inst');

    if (instrumento) {
        // Formatear el título para que se vea bien en la página
        const nombreDisplay = instrumento.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        document.getElementById('instrumento-titulo').textContent = nombreDisplay;
        document.getElementById('instrumento-titulo-header').textContent = nombreDisplay;
        cargarPartituras(instrumento);
    }
});

function cargarPartituras(instrumento) {
    const container = document.getElementById('partituras-container');
    container.innerHTML = ''; // Limpiar el contenedor

    if (!partituras[instrumento]) {
        container.innerHTML = '<p>No se encontraron partituras para este instrumento.</p>';
        return;
    }

    let htmlContent = '';
    
    htmlContent += '<h2>Músicas Bailables</h2>';
    partituras[instrumento].bailables.forEach(partitura => {
        htmlContent += `
            <div class="partitura-item">
                <h3>${partitura.titulo}</h3>
                <img src="partituras/${instrumento}/bailables/${partitura.archivo}" alt="${partitura.titulo}">
                <a href="partituras/${instrumento}/bailables/${partitura.archivo}" download="${partitura.titulo}">Descargar Imagen</a>
            </div>
        `;
    });
    
    htmlContent += '<h2>Marchas</h2>';
    partituras[instrumento].marchas.forEach(partitura => {
        htmlContent += `
            <div class="partitura-item">
                <h3>${partitura.titulo}</h3>
                <img src="partituras/${instrumento}/marchas/${partitura.archivo}" alt="${partitura.titulo}">
                <a href="partituras/${instrumento}/marchas/${partitura.archivo}" download="${partitura.titulo}">Descargar Imagen</a>
            </div>
        `;
    });

    container.innerHTML = htmlContent;
}

// Lógica de búsqueda (básica)
function buscarPartituras() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.partitura-item');
    items.forEach(item => {
        const titulo = item.querySelector('h3').textContent.toLowerCase();
        if (titulo.includes(input)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}