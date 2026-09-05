document.addEventListener('DOMContentLoaded', async () => {
  const uploadForm = document.getElementById('upload-form');
  const statusMessage = document.getElementById('status-message');
  const btnSubmit = document.getElementById('btn-submit');
  const generoSelect = document.getElementById('genero-select');
  const groupNuevoGenero = document.getElementById('group-nuevo-genero');
  const inputNuevoGenero = document.getElementById('nuevo-genero');

  if (!uploadForm) return;

  // Convierte texto a CamelCase / PascalCase alfanumérico limpio
  const formatNamePart = (str) => {
    if (!str) return 'SinDato';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes y acentos
      .replace(/[^a-zA-Z0-9\s]/g, '')   // Quita caracteres especiales
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  async function cargarGeneros() {
    try {
      let listaGeneros = new Set(typeof GENEROS_BASE !== 'undefined' ? GENEROS_BASE : []);

      const { data, error } = await window.supabaseClient
        .from('partituras')
        .select('genero');

      if (!error && data) {
        data.forEach(item => {
          if (item.genero && item.genero.trim() !== '') {
            listaGeneros.add(item.genero.trim());
          }
        });
      }

      generoSelect.innerHTML = '<option value="" disabled selected>Selecciona un género</option>';
      
      Array.from(listaGeneros).sort().forEach(genero => {
        const option = document.createElement('option');
        option.value = genero;
        option.textContent = genero;
        generoSelect.appendChild(option);
      });

      const optionNuevo = document.createElement('option');
      optionNuevo.value = "__NUEVO__";
      optionNuevo.textContent = "➕ Agregar otro género...";
      generoSelect.appendChild(optionNuevo);

    } catch (err) {
      console.error('Error cargando géneros:', err);
    }
  }

  await cargarGeneros();

  generoSelect.addEventListener('change', () => {
    if (generoSelect.value === '__NUEVO__') {
      groupNuevoGenero.style.display = 'flex';
      inputNuevoGenero.required = true;
    } else {
      groupNuevoGenero.style.display = 'none';
      inputNuevoGenero.required = false;
    }
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!window.supabaseClient) {
      statusMessage.style.color = 'red';
      statusMessage.textContent = 'Error: Cliente Supabase no inicializado.';
      return;
    }

    const titulo = document.getElementById('titulo').value.trim();
    const seccion = document.getElementById('seccion').value;
    
    let generoFinal = generoSelect.value;
    if (generoFinal === '__NUEVO__') {
      generoFinal = inputNuevoGenero.value.trim();
    }

    const partituraFile = document.getElementById('partitura-file').files[0];
    const audioFile = document.getElementById('audio-file').files[0];

    if (!partituraFile) {
      statusMessage.style.color = 'red';
      statusMessage.textContent = 'Selecciona un archivo de partitura.';
      return;
    }

    btnSubmit.disabled = true;
    statusMessage.style.color = 'blue';
    statusMessage.textContent = 'Subiendo archivos a Supabase...';

    try {
      const timestamp = Date.now();

      // Construcción del nombre personalizado: Titulo_Genero_Instrumento
      const cleanTitulo = formatNamePart(titulo);
      const cleanGenero = formatNamePart(generoFinal);
      const cleanSeccion = formatNamePart(seccion);
      const baseCustomName = `${cleanTitulo}_${cleanGenero}_${cleanSeccion}`;

      // 1. Subida de Partitura
      const extPartitura = partituraFile.name.split('.').pop().toLowerCase();
      let mimeType = 'application/pdf';
      if (['jpg', 'jpeg'].includes(extPartitura)) mimeType = 'image/jpeg';
      if (extPartitura === 'png') mimeType = 'image/png';

      const partituraFileName = `${baseCustomName}_${timestamp}.${extPartitura}`;
      const partituraPath = `partituras/${partituraFileName}`;

      const { error: pError } = await window.supabaseClient.storage
        .from('partituras')
        .upload(partituraPath, partituraFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType
        });

      if (pError) throw new Error(`Error en Storage (Partitura): ${pError.message}`);

      const { data: pUrlData } = window.supabaseClient.storage
        .from('partituras')
        .getPublicUrl(partituraPath);

      // 2. Subida de Audio Opcional
      let audioUrl = null;
      if (audioFile) {
        const extAudio = audioFile.name.split('.').pop().toLowerCase();
        const audioFileName = `${baseCustomName}_Audio_${timestamp}.${extAudio}`;
        const audioPath = `audios/${audioFileName}`;

        const { error: aError } = await window.supabaseClient.storage
          .from('partituras')
          .upload(audioPath, audioFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: audioFile.type || 'audio/mpeg'
          });

        if (aError) throw new Error(`Error en Storage (Audio): ${aError.message}`);

        const { data: aUrlData } = window.supabaseClient.storage
          .from('partituras')
          .getPublicUrl(audioPath);

        audioUrl = aUrlData.publicUrl;
      }

      // 3. Guardar en Base de Datos
      const { error: dbError } = await window.supabaseClient
        .from('partituras')
        .insert([{
          titulo: titulo,
          seccion: seccion,
          genero: generoFinal,
          pdf_url: pUrlData.publicUrl,
          audio_url: audioUrl,
          tipo_archivo: mimeType.startsWith('image/') ? 'imagen' : 'pdf'
        }]);

      if (dbError) throw new Error(`Error en Base de Datos: ${dbError.message}`);

      statusMessage.style.color = 'green';
      statusMessage.textContent = '¡Partitura guardada con éxito!';
      uploadForm.reset();
      groupNuevoGenero.style.display = 'none';
      await cargarGeneros();

    } catch (err) {
      console.error(err);
      statusMessage.style.color = 'red';
      statusMessage.textContent = err.message || 'Error en la subida.';
    } finally {
      btnSubmit.disabled = false;
    }
  });
});