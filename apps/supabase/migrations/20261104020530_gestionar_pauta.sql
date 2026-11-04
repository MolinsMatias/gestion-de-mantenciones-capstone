begin;

create or replace function public.gestionar_pauta(
  p_accion text,
  p_id uuid,
  p_datos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_seccion_id uuid;
  v_categoria uuid;
  v_nombre text;
  v_seccion jsonb;
  v_item jsonb;
  v_orden_seccion integer;
  v_orden_item integer;
begin
  if not exists (
    select 1 from public.usuario u
    join public.rol r on r.id = u.rol_id
    where u.id = auth.uid() and u.activo = true and r.nombre = 'administrador'
  ) then
    raise exception 'Solo un administrador activo puede gestionar pautas.' using errcode = '42501';
  end if;

  if p_accion is null or p_accion not in ('crear', 'editar', 'eliminar') then
    raise exception 'Acción inválida.';
  end if;

  if p_accion <> 'crear' then
    -- Impide una nueva referencia al historial entre la comprobación y el cambio.
    lock table public.mantencion, public.respuesta_item in share mode;
    select id into v_id from public.pauta where id = p_id for update;
    if not found then raise exception 'La pauta ya no existe.'; end if;

    if exists (select 1 from public.mantencion where pauta_id = v_id)
       or exists (
         select 1 from public.respuesta_item r
         join public.item_pauta i on i.id = r.item_id
         join public.seccion_pauta s on s.id = i.seccion_id
         where s.pauta_id = v_id
       ) then
      raise exception 'Esta pauta ya tiene mantenciones o respuestas asociadas. Debes conservarla para proteger el historial.';
    end if;
  end if;

  if p_accion <> 'eliminar' then
    v_nombre := nullif(btrim(p_datos->>'nombre'), '');
    if v_nombre is null then raise exception 'Ingresa el nombre de la pauta.'; end if;
    v_categoria := nullif(p_datos->>'categoria_id', '')::uuid;
    if not exists (select 1 from public.categoria_maquina where id = v_categoria) then
      raise exception 'Selecciona una categoría existente.';
    end if;
    if jsonb_typeof(p_datos->'activo') is distinct from 'boolean' then
      raise exception 'Selecciona el estado de la pauta.';
    end if;
    if jsonb_typeof(p_datos->'secciones') is distinct from 'array' then
      raise exception 'Agrega al menos una sección.';
    end if;
    if jsonb_array_length(p_datos->'secciones') = 0 then
      raise exception 'Agrega al menos una sección.';
    end if;
  end if;

  if p_accion = 'crear' then
    v_id := gen_random_uuid();
    insert into public.pauta(id, categoria_id, nombre, descripcion, version, activo, created_at)
    values (
      v_id, v_categoria, v_nombre, nullif(btrim(p_datos->>'descripcion'), ''),
      1, (p_datos->>'activo')::boolean, now()
    );
  else
    delete from public.item_pauta i
    using public.seccion_pauta s
    where i.seccion_id = s.id and s.pauta_id = v_id;

    delete from public.seccion_pauta where pauta_id = v_id;

    if p_accion = 'eliminar' then
      delete from public.pauta where id = v_id;
      return v_id;
    end if;

    update public.pauta set
      categoria_id = v_categoria,
      nombre = v_nombre,
      descripcion = nullif(btrim(p_datos->>'descripcion'), ''),
      activo = (p_datos->>'activo')::boolean
    where id = v_id;
  end if;

  for v_seccion, v_orden_seccion in
    select value, ordinality::integer
    from jsonb_array_elements(p_datos->'secciones') with ordinality
  loop
    if nullif(btrim(v_seccion->>'nombre'), '') is null then
      raise exception 'Todas las secciones necesitan un nombre.';
    end if;
    if jsonb_typeof(v_seccion->'items') is distinct from 'array' then
      raise exception 'Cada sección necesita al menos un ítem.';
    end if;
    if jsonb_array_length(v_seccion->'items') = 0 then
      raise exception 'Cada sección necesita al menos un ítem.';
    end if;

    v_seccion_id := gen_random_uuid();
    insert into public.seccion_pauta(id, pauta_id, nombre, descripcion, orden)
    values (
      v_seccion_id, v_id, btrim(v_seccion->>'nombre'),
      nullif(btrim(v_seccion->>'descripcion'), ''), v_orden_seccion
    );

    for v_item, v_orden_item in
      select value, ordinality::integer
      from jsonb_array_elements(v_seccion->'items') with ordinality
    loop
      if nullif(btrim(v_item->>'descripcion'), '') is null then
        raise exception 'Todos los ítems necesitan una descripción.';
      end if;
      if jsonb_typeof(v_item->'obligatorio') is distinct from 'boolean'
         or jsonb_typeof(v_item->'permite_no_aplica') is distinct from 'boolean' then
        raise exception 'Las reglas del ítem deben ser valores booleanos.';
      end if;
      insert into public.item_pauta(id, seccion_id, descripcion, instrucciones, obligatorio, permite_no_aplica, orden)
      values (
        gen_random_uuid(), v_seccion_id, btrim(v_item->>'descripcion'),
        nullif(btrim(v_item->>'instrucciones'), ''), (v_item->>'obligatorio')::boolean,
        (v_item->>'permite_no_aplica')::boolean, v_orden_item
      );
    end loop;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.gestionar_pauta(text, uuid, jsonb) from public, anon;
grant execute on function public.gestionar_pauta(text, uuid, jsonb) to authenticated;

commit;
