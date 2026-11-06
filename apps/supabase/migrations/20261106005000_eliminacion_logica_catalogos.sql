begin;

alter table public.local add column if not exists eliminado_at timestamptz;
alter table public.maquina add column if not exists eliminado_at timestamptz;
alter table public.pauta add column if not exists eliminado_at timestamptz;

alter table public.local add constraint local_retirado_inactivo
  check (eliminado_at is null or activo is false);
alter table public.maquina add constraint maquina_retirada_inactiva
  check (eliminado_at is null or activo is false);
alter table public.pauta add constraint pauta_retirada_inactiva
  check (eliminado_at is null or activo is false);

create index if not exists maquina_local_vigente_idx on public.maquina(local_id)
  where eliminado_at is null;

create schema if not exists private;

create or replace function private.proteger_local_retirado()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.eliminado_at is null and new.eliminado_at is not null
     and exists (
       select 1 from public.maquina
       where local_id = old.id and eliminado_at is null
     ) then
    raise exception 'El local tiene máquinas vigentes. Reasígnalas o retíralas antes de retirar el local.';
  end if;
  return new;
end;
$$;

create or replace function private.validar_destino_maquina_vigente()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.eliminado_at is null then
    -- Serializa asignación/restauración frente al retiro del local.
    perform 1 from public.local
    where id = new.local_id and eliminado_at is null
    for share;
    if not found then
      raise exception 'El local de destino no está disponible.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.impedir_borrado_fisico_catalogo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Este catálogo usa eliminación lógica. Retira el registro en vez de borrarlo.';
end;
$$;

create trigger proteger_local_retirado
  before update of eliminado_at on public.local for each row
  execute function private.proteger_local_retirado();

create trigger validar_destino_maquina_vigente
  before insert or update of local_id, eliminado_at on public.maquina for each row
  execute function private.validar_destino_maquina_vigente();

create trigger impedir_borrado_fisico_local before delete on public.local
  for each row execute function private.impedir_borrado_fisico_catalogo();
create trigger impedir_borrado_fisico_maquina before delete on public.maquina
  for each row execute function private.impedir_borrado_fisico_catalogo();
create trigger impedir_borrado_fisico_pauta before delete on public.pauta
  for each row execute function private.impedir_borrado_fisico_catalogo();

revoke all on function private.proteger_local_retirado() from public, anon, authenticated;
revoke all on function private.validar_destino_maquina_vigente() from public, anon, authenticated;
revoke all on function private.impedir_borrado_fisico_catalogo() from public, anon, authenticated;

create or replace function public.retirar_registro_catalogo(p_tipo text, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.usuario u
    join public.rol r on r.id = u.rol_id
    where u.id = auth.uid() and u.activo = true and r.nombre = 'administrador'
  ) then
    raise exception 'Solo un administrador activo puede retirar registros.' using errcode = '42501';
  end if;

  case p_tipo
    when 'local' then
      update public.local set eliminado_at = now(), activo = false
      where id = p_id and eliminado_at is null returning id into v_id;
    when 'maquina' then
      update public.maquina set eliminado_at = now(), activo = false
      where id = p_id and eliminado_at is null returning id into v_id;
    else raise exception 'Tipo de registro no válido.';
  end case;

  if v_id is null then raise exception 'El registro no existe o ya fue retirado.'; end if;
  return v_id;
end;
$$;

revoke all on function public.retirar_registro_catalogo(text, uuid) from public, anon;
grant execute on function public.retirar_registro_catalogo(text, uuid) to authenticated;


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

  if p_accion = 'eliminar' then
    update public.pauta set eliminado_at = now(), activo = false
    where id = p_id and eliminado_at is null returning id into v_id;
    if not found then raise exception 'La pauta no existe o ya fue retirada.'; end if;
    return v_id;
  end if;

  if p_accion = 'editar' then
    -- Impide una nueva referencia al historial entre la comprobación y el cambio.
    lock table public.mantencion, public.respuesta_item in share mode;
    select id into v_id from public.pauta where id = p_id and eliminado_at is null for update;
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



create or replace function public.obtener_volumen_monitor()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  mes_local timestamp := date_trunc('month', now() at time zone 'America/Santiago');
  inicio_mes timestamptz := mes_local at time zone 'America/Santiago';
  fin_mes timestamptz := (mes_local + interval '1 month') at time zone 'America/Santiago';
begin
  if not exists (
    select 1 from public.usuario u
    join public.rol r on r.id = u.rol_id
    where u.id = auth.uid() and u.activo = true and r.nombre = 'administrador'
  ) then
    raise exception 'Acceso no autorizado' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_recintos', (select count(*) from public.local where eliminado_at is null),
    'total_equipos', (select count(*) from public.maquina where eliminado_at is null),
    'mantenciones_mes', (
      select count(*) from public.mantencion
      where recibida_at >= inicio_mes and recibida_at < fin_mes
    ),
    'mes_chile', to_char(mes_local, 'YYYY-MM')
  );
end;
$$;

revoke execute on function public.obtener_volumen_monitor() from public, anon;
grant execute on function public.obtener_volumen_monitor() to authenticated;


-- RF-09: conserva la última recepción histórica de cada local vigente.
create or replace function public.obtener_locales_monitor()
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.usuario u
    join public.rol r on r.id = u.rol_id
    where u.id = auth.uid() and u.activo = true and r.nombre = 'administrador'
  ) then
    raise exception 'Acceso no autorizado' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'nombre', l.nombre, 'direccion', l.direccion, 'activo', l.activo,
      'ultima_recibida_at', m.ultima_recibida_at
    ) order by l.nombre, l.id), '[]'::jsonb)
    from public.local l
    left join (
      select local_id, max(recibida_at) as ultima_recibida_at
      from public.mantencion where recibida_at is not null group by local_id
    ) m on m.local_id = l.id
    where l.eliminado_at is null
  );
end;
$$;
revoke execute on function public.obtener_locales_monitor() from public, anon;
grant execute on function public.obtener_locales_monitor() to authenticated;

commit;
