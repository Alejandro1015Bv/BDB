import { supabase } from './supabase-config.js';

export function inicializarFormularioSubida() {
    const form = document.getElementById('uploadForm');
    const status = document.getElementById('status-message');
    
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-subir');
        const file = document.getElementById('file').files[0];
        const titulo = document.getElementById('titulo').value;
        const instrumento = document.getElementById('instrumento').value;
        const genero = document.getElementById('genero').value;

        btn.innerText = 'Subiendo archivo...';
        btn.disabled = true;
        status.innerText = "Procesando...";

        try {
            // 1. Subir a Supabase Storage
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data: sData, error: sErr } = await supabase.storage
                .from('partituras_archivos')
                .upload(fileName, file);

            if (sErr) throw new Error("Error en Storage: " + sErr.message);

            // 2. Obtener URL Pública
            const { data: urlData } = supabase.storage
                .from('partituras_archivos')
                .getPublicUrl(fileName);

            // 3. Guardar en la Tabla SQL
            const { data, error: dbError } = await supabase
                .from('partituras')
                .insert([
                    {
                        titulo: titulo,
                        instrumento: instrumento,
                        genero: genero,
                        archivo_url: urlData.publicUrl
                    }
                ]);

            if (dbError) throw new Error("Error en Base de Datos: " + dbError.message);

            status.style.color = "green";
            status.innerText = "¡Éxito! La partitura se ha subido correctamente.";
            form.reset();

        } catch (error) {
            console.error(error);
            status.style.color = "red";
            status.innerText = "Error: " + error.message;
        } finally {
            btn.innerText = 'Subir Partitura';
            btn.disabled = false;
        }
    });
}
