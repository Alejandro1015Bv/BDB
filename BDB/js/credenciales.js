/*
 * Dibuja credenciales (foto + datos + código QR) sobre un canvas oculto
 * y las exporta como PDF, individuales o en lote. Se usa desde la página
 * de Gestión de Estudiantes.
 */

const CRED_W = 640;
const CRED_H = 960;

function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // seguimos sin foto si falla
    img.src = src;
  });
}

function envolverTexto(ctx, texto, maxWidth) {
  const palabras = texto.split(' ');
  const lineas = [];
  let linea = '';
  palabras.forEach(palabra => {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxWidth && linea) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = prueba;
    }
  });
  if (linea) lineas.push(linea);
  return lineas;
}

const NIVEL_LABEL = { primaria: 'Primaria', secundaria: 'Secundaria' };

async function dibujarCredencial(estudiante) {
  const canvas = document.getElementById('canvas-credencial');
  canvas.width = CRED_W;
  canvas.height = CRED_H;
  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CRED_W, CRED_H);
  ctx.strokeStyle = '#F5E6A8';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, CRED_W - 10, CRED_H - 10);

  // Encabezado
  ctx.fillStyle = '#3959A2';
  ctx.fillRect(0, 0, CRED_W, 160);
  ctx.fillStyle = '#F5E6A8';
  ctx.font = 'bold 40px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BANDA ESTUDIANTIL', CRED_W / 2, 75);
  ctx.font = '22px Segoe UI, Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Credencial de Estudiante', CRED_W / 2, 115);

  // Foto (circular)
  const centroX = CRED_W / 2;
  const centroFotoY = 320;
  const radioFoto = 120;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centroX, centroFotoY, radioFoto, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#FAF8F5';
  ctx.fill();
  ctx.clip();

  const img = estudiante.foto_url ? await cargarImagen(estudiante.foto_url) : null;
  if (img) {
    // Cubrir el círculo manteniendo proporción (cover)
    const escala = Math.max((radioFoto * 2) / img.width, (radioFoto * 2) / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, centroX - w / 2, centroFotoY - h / 2, w, h);
  } else {
    ctx.fillStyle = '#3959A2';
    ctx.font = 'bold 70px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const iniciales = (estudiante.nombre_completo || '?').trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
    ctx.fillText(iniciales, centroX, centroFotoY);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(centroX, centroFotoY, radioFoto, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#3959A2';
  ctx.stroke();

  // Nombre
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 34px Segoe UI, Arial';
  ctx.textAlign = 'center';
  const lineasNombre = envolverTexto(ctx, estudiante.nombre_completo || '', CRED_W - 80);
  let yNombre = 500;
  lineasNombre.slice(0, 2).forEach(linea => {
    ctx.fillText(linea, centroX, yNombre);
    yNombre += 40;
  });

  // Curso / Nivel / Sección
  ctx.font = '24px Segoe UI, Arial';
  ctx.fillStyle = '#4b5563';
  const nivelTxt = NIVEL_LABEL[estudiante.nivel] || estudiante.nivel || '';
  ctx.fillText(`${estudiante.curso || ''} · ${nivelTxt} · Sección ${estudiante.seccion || ''}`, centroX, yNombre + 15);

  // QR (librería qrcode-generator: API síncrona, no usa promesas)
  const qr = qrcode(0, 'M'); // 0 = detectar tamaño automáticamente, 'M' = corrección de errores media
  qr.addData(estudiante.codigo_qr);
  qr.make();
  const qrDataUrl = qr.createDataURL(6, 4); // cellSize, margin
  const qrImg = await cargarImagen(qrDataUrl);
  const qrSize = 260;
  const qrY = yNombre + 60;
  if (qrImg) ctx.drawImage(qrImg, centroX - qrSize / 2, qrY, qrSize, qrSize);

  // Pie
  ctx.font = '18px Segoe UI, Arial';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Escanea este código para marcar asistencia', centroX, qrY + qrSize + 40);

  return canvas;
}

async function generarCredencialPDF(estudiante) {
  const canvas = await dibujarCredencial(estudiante);
  const dataUrl = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [320, 480] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, 320, 480);
  const nombreArchivo = (estudiante.nombre_completo || 'estudiante').replace(/\s+/g, '_');
  pdf.save(`Credencial_${nombreArchivo}.pdf`);
}

async function generarTodasCredencialesPDF(listaEstudiantes) {
  if (!listaEstudiantes.length) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = 595, pageH = 842;
  const cardW = 260, cardH = 390;
  const cols = 2, rows = 2;
  const marginX = (pageW - cols * cardW) / (cols + 1);
  const marginY = (pageH - rows * cardH) / (rows + 1);

  let col = 0, row = 0;

  for (let i = 0; i < listaEstudiantes.length; i++) {
    const canvas = await dibujarCredencial(listaEstudiantes[i]);
    const dataUrl = canvas.toDataURL('image/png');

    const x = marginX + col * (cardW + marginX);
    const y = marginY + row * (cardH + marginY);
    pdf.addImage(dataUrl, 'PNG', x, y, cardW, cardH);

    col++;
    if (col >= cols) { col = 0; row++; }
    if (row >= rows && i < listaEstudiantes.length - 1) {
      pdf.addPage();
      row = 0; col = 0;
    }
  }

  pdf.save('Credenciales_Banda_Estudiantil.pdf');
}
