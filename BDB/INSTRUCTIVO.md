# Instructivo: Módulo de Asistencia — Banda Estudiantil

Este documento cubre la configuración inicial en Supabase (una sola vez) y
cómo probar el sistema de punta a punta.

---

## Parte 1 — Configuración en Supabase (una sola vez)

### Paso 1: Ejecutar el SQL
1. Entra a [supabase.com](https://supabase.com) → tu proyecto.
2. Ve a **SQL Editor** → **New query**.
3. Abre el archivo `supabase/asistencia_schema.sql` (viene en el zip del proyecto) y copia **todo** su contenido.
4. Pégalo en el editor y presiona **Run**.
5. Debe aparecer "Success. No rows returned". Esto crea las tablas `estudiantes` y `asistencias`, las reglas de seguridad, y las funciones que validan el QR/PIN.

### Paso 2: Crear el bucket de fotos
1. Ve a **Storage** → **New bucket**.
2. Nombre exacto: `estudiantes` (en minúsculas, tal cual).
3. Marca **Public bucket: Sí**.
4. Presiona **Create bucket**.

### Paso 3: Aplicar las políticas de Storage
1. Vuelve a **SQL Editor** → **New query**.
2. Pega esto y presiona **Run**:
```sql
create policy "profesor_sube_fotos" on storage.objects
  for insert with check (bucket_id = 'estudiantes' and auth.role() = 'authenticated');
create policy "profesor_borra_fotos" on storage.objects
  for delete using (bucket_id = 'estudiantes' and auth.role() = 'authenticated');
create policy "lectura_publica_fotos" on storage.objects
  for select using (bucket_id = 'estudiantes');
```
(Estas 3 líneas también están al final del archivo SQL original, comentadas con `--`.)

### Paso 4: Crear tu usuario de profesor
1. Ve a **Authentication** → **Users** → **Add user** → **Create new user**.
2. Pon tu correo real y una contraseña que vayas a recordar.
3. Marca **Auto Confirm User** (así no dependes de un correo de confirmación).
4. **Este correo y contraseña son los que usarás para iniciar sesión** en "Gestionar Estudiantes" y "Ver Registro de Asistencias". El campo dice "Usuario" en la página, pero técnicamente es tu correo.

### Paso 5 (recomendado): Bloquear registro público
1. Ve a **Authentication** → **Settings** (o **Sign In / Providers**, según la versión del panel).
2. Desactiva **"Allow new users to sign up"** / **"Enable email signups"**.
3. Esto evita que cualquier persona pueda crearse una cuenta de profesor por su cuenta — solo existirán las cuentas que tú crees a mano en el Paso 4.

---

## Parte 2 — Probar el sistema

### Paso 6: Registrar tu primer estudiante
1. Sube el proyecto actualizado (`BDB-asistencia-v2.zip`) a tu repositorio / Cloudflare Pages.
2. Abre tu sitio → **Panel Profesor** → **🧑‍🎓 Gestionar Estudiantes**.
3. Inicia sesión con el correo/contraseña del Paso 4.
4. Llena el formulario: foto, nombre completo, curso, nivel, sección → **Registrar Estudiante**.

### Paso 7: Generar e imprimir la credencial
1. En la lista de estudiantes (debajo del formulario), busca al que acabas de registrar.
2. Haz clic en **🪪 Credencial** → se descarga un PDF individual con foto, datos y código QR, listo para imprimir.
3. (Opcional) **🪪 Descargar Todas las Credenciales (PDF)** genera una hoja con varias tarjetas para imprimir de una vez, cuando ya tengas más estudiantes cargados.

### Paso 8: Probar el kiosko de asistencia
1. Abre **Asistencia** desde el menú.
2. Permite el acceso a la cámara cuando el navegador lo pida.
3. Apunta la cámara al QR de la credencial impresa (o mostrada en la pantalla de otro celular).
4. Debería aparecer de inmediato la foto y el nombre del estudiante, con **"✅ Asistencia registrada a las [hora]"**.
5. Si vuelves a escanear el mismo QR el mismo día, debe decir **"⚠️ Ya se había marcado hoy"** en vez de duplicar el registro.
6. Prueba también el botón **"¿No tienes tu credencial?"** para el flujo de respaldo con nombre + PIN (el PIN de cada estudiante se genera automáticamente al registrarlo — por ahora no hay una pantalla que te lo muestre; si lo necesitas, dímelo y agrego una forma de consultarlo).

### Paso 9: Revisar el panel de asistencias
1. **Panel Profesor** → **📋 Ver Registro de Asistencias**.
2. Inicia sesión con la misma cuenta.
3. Deberías ver el registro que acabas de marcar en el Paso 8.
4. **📊 Exportar a Excel** descarga exactamente lo que se ve en la tabla (respeta los filtros de fecha y el buscador).

---

## Solución de problemas comunes

| Problema | Causa probable |
|---|---|
| "Usuario o contraseña incorrectos" | No se creó el usuario en el Paso 4, o falta marcar "Auto Confirm User" |
| La cámara no arranca | Revisa permisos del navegador. Debe ser HTTPS (Cloudflare Pages ya lo es; no funciona abriendo el archivo directo desde tu compu) |
| "Credencial no reconocida" al escanear | No se ejecutó el SQL completo del Paso 1 antes de registrar estudiantes |
| Página en blanco en "Gestionar Estudiantes" | Ya corregido — era un choque de nombres entre dos archivos JS |
| No aparece nada en "Ver Registro de Asistencias" | Revisa que el estudiante haya marcado asistencia en el Paso 8, y que el rango de fechas del filtro incluya hoy |

---

## Cómo funciona todo (resumen)

1. **Registras** al estudiante con su foto → el sistema genera solo, por dentro, un código QR único y un PIN de respaldo.
2. **Generas su credencial** — un PDF con foto + datos + QR, listo para imprimir.
3. **En el kiosko**, escanea su QR → aparece su foto en pantalla → tú confirmas de un vistazo que es él/ella.
4. Eso **guarda un registro en Supabase**, uno por estudiante por día (no se puede duplicar).
5. **Solo tú**, con tu cuenta, puedes ver y exportar esa lista para la nota final.
