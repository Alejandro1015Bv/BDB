-- ============================================================
-- MÓDULO DE ASISTENCIA - Banda Estudiantil
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Tabla de estudiantes
create table if not exists public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  curso text not null,
  nivel text not null check (nivel in ('primaria', 'secundaria')),
  seccion text not null,
  foto_url text,
  codigo_qr text unique not null default replace(gen_random_uuid()::text, '-', ''),
  pin char(4) not null default lpad(floor(random() * 10000)::text, 4, '0'),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Tabla de asistencias (un registro por estudiante por día, no se puede duplicar)
create table if not exists public.asistencias (
  id bigint generated always as identity primary key,
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  fecha date not null default current_date,
  hora timestamptz not null default now(),
  metodo text not null check (metodo in ('qr', 'pin')),
  unique (estudiante_id, fecha)
);

-- 3. Row Level Security: por defecto NADIE tiene acceso directo a las tablas.
--    Solo el profesor autenticado puede leer/escribir estudiantes y leer asistencias.
--    El marcado de asistencia NO usa acceso directo a la tabla: pasa por las
--    funciones seguras del punto 4, que validan el QR o el PIN antes de insertar.
alter table public.estudiantes enable row level security;
alter table public.asistencias enable row level security;

create policy "profesor_lee_estudiantes" on public.estudiantes
  for select using (auth.role() = 'authenticated');
create policy "profesor_crea_estudiantes" on public.estudiantes
  for insert with check (auth.role() = 'authenticated');
create policy "profesor_actualiza_estudiantes" on public.estudiantes
  for update using (auth.role() = 'authenticated');
create policy "profesor_borra_estudiantes" on public.estudiantes
  for delete using (auth.role() = 'authenticated');

create policy "profesor_lee_asistencias" on public.asistencias
  for select using (auth.role() = 'authenticated');

-- 4. Funciones seguras (SECURITY DEFINER): son la ÚNICA puerta de entrada
--    pública para marcar asistencia. Nunca devuelven el PIN ni el código QR.

-- 4a. Lista básica de estudiantes (solo nombre/curso, sin foto/pin/qr) para el
--     buscador de respaldo del kiosko cuando alguien olvida su credencial.
create or replace function public.rpc_lista_estudiantes_basico()
returns table (id uuid, nombre_completo text, curso text, nivel text, seccion text)
language sql
security definer
set search_path = public
as $$
  select id, nombre_completo, curso, nivel, seccion
  from public.estudiantes
  where activo = true
  order by nombre_completo;
$$;

-- 4b. Marcar asistencia escaneando el QR de la credencial (método principal)
create or replace function public.rpc_marcar_por_qr(p_codigo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estudiante record;
  v_ya_marcado boolean := false;
  v_hora timestamptz;
begin
  select * into v_estudiante from public.estudiantes
    where codigo_qr = p_codigo and activo = true;

  if not found then
    return json_build_object('ok', false, 'error', 'Credencial no reconocida.');
  end if;

  begin
    insert into public.asistencias (estudiante_id, metodo)
      values (v_estudiante.id, 'qr')
      returning hora into v_hora;
  exception when unique_violation then
    v_ya_marcado := true;
    select hora into v_hora from public.asistencias
      where estudiante_id = v_estudiante.id and fecha = current_date;
  end;

  return json_build_object(
    'ok', true,
    'ya_marcado', v_ya_marcado,
    'nombre_completo', v_estudiante.nombre_completo,
    'curso', v_estudiante.curso,
    'nivel', v_estudiante.nivel,
    'seccion', v_estudiante.seccion,
    'foto_url', v_estudiante.foto_url,
    'hora', v_hora
  );
end;
$$;

-- 4c. Marcar asistencia con PIN de respaldo (cuando olvidó la credencial)
create or replace function public.rpc_marcar_por_pin(p_estudiante_id uuid, p_pin text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estudiante record;
  v_ya_marcado boolean := false;
  v_hora timestamptz;
begin
  select * into v_estudiante from public.estudiantes
    where id = p_estudiante_id and activo = true;

  if not found then
    return json_build_object('ok', false, 'error', 'Estudiante no encontrado.');
  end if;

  if v_estudiante.pin is distinct from p_pin then
    return json_build_object('ok', false, 'error', 'PIN incorrecto.');
  end if;

  begin
    insert into public.asistencias (estudiante_id, metodo)
      values (v_estudiante.id, 'pin')
      returning hora into v_hora;
  exception when unique_violation then
    v_ya_marcado := true;
    select hora into v_hora from public.asistencias
      where estudiante_id = v_estudiante.id and fecha = current_date;
  end;

  return json_build_object(
    'ok', true,
    'ya_marcado', v_ya_marcado,
    'nombre_completo', v_estudiante.nombre_completo,
    'curso', v_estudiante.curso,
    'nivel', v_estudiante.nivel,
    'seccion', v_estudiante.seccion,
    'foto_url', v_estudiante.foto_url,
    'hora', v_hora
  );
end;
$$;

-- 5. Permitir que cualquiera (incluso sin login) pueda EJECUTAR estas 3
--    funciones puntuales -- es lo único público, nunca las tablas en sí.
grant execute on function public.rpc_lista_estudiantes_basico() to anon, authenticated;
grant execute on function public.rpc_marcar_por_qr(text) to anon, authenticated;
grant execute on function public.rpc_marcar_por_pin(uuid, text) to anon, authenticated;

-- ============================================================
-- PASOS MANUALES QUE FALTAN (no se pueden hacer por SQL):
--
-- A) Storage > New bucket > nombre "estudiantes" > Public bucket: SI
--    (las fotos deben poder mostrarse en el kiosko sin necesitar login)
--
-- B) Después de crear el bucket, vuelve al SQL Editor y ejecuta esto para
--    que solo tú puedas subir/borrar fotos (la lectura sí es pública):
--
-- create policy "profesor_sube_fotos" on storage.objects
--   for insert with check (bucket_id = 'estudiantes' and auth.role() = 'authenticated');
-- create policy "profesor_borra_fotos" on storage.objects
--   for delete using (bucket_id = 'estudiantes' and auth.role() = 'authenticated');
-- create policy "lectura_publica_fotos" on storage.objects
--   for select using (bucket_id = 'estudiantes');
--
-- C) Authentication > Users > Add User: crea tu propio usuario (tu email +
--    una contraseña) para poder iniciar sesión como profesor.
--
-- D) Authentication > Settings > desactiva "Allow new users to sign up"
--    para que nadie más pueda crear una cuenta de profesor por su cuenta.
-- ============================================================
