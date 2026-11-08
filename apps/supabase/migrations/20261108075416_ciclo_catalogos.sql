begin;

alter table public.pauta
  add column version_anterior_id uuid references public.pauta(id),
  add column borrador_version boolean not null default false,
  add constraint pauta_borrador_version_inactiva
    check (not borrador_version or (version_anterior_id is not null and activo is false));

create unique index pauta_borrador_vigente_idx
  on public.pauta(version_anterior_id)
  where borrador_version and eliminado_at is null;

create or replace function private.validar_destino_maquina_vigente()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.eliminado_at is null then
    if tg_op = 'UPDATE' then
      if new.local_id is not distinct from old.local_id and old.eliminado_at is null then
        return new;
      end if;
    end if;
    perform 1 from public.local
    where id = new.local_id and eliminado_at is null and activo is true
    for share;
    if not found then
      raise exception 'El local de destino debe estar abierto.';
    end if;
  end if;
  return new;
end;
$$;

create function private.exigir_admin_catalogo()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.usuario u join public.rol r on r.id = u.rol_id
    where u.id = auth.uid() and u.activo is true and r.nombre = 'administrador'
  ) then
    raise exception 'Solo un administrador activo puede realizar esta acción.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.exigir_admin_catalogo() from public, anon, authenticated;

create function public.gestionar_estado_local(p_accion text, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.exigir_admin_catalogo();
  if p_accion = 'cerrar' then
    return public.retirar_registro_catalogo('local', p_id);
  end if;
  if p_accion is null or p_accion not in ('suspender', 'reabrir') then
    raise exception 'Acción de local no válida.';
  end if;
  update public.local set activo = (p_accion = 'reabrir')
  where id = p_id and eliminado_at is null returning id into v_id;
  if v_id is null then raise exception 'El local no existe o ya está cerrado.'; end if;
  return v_id;
end;
$$;

create function public.maquinas_pendientes_cierre(p_id uuid)
returns table(id uuid, nombre text, codigo_interno text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.exigir_admin_catalogo();
  return query select m.id, m.nombre::text, m.codigo_interno::text
    from public.maquina m where m.local_id = p_id and m.eliminado_at is null
    order by m.nombre, m.id;
end;
$$;

create function public.gestionar_version_pauta(p_accion text, p_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_origen public.pauta%rowtype;
  v_borrador public.pauta%rowtype;
  v_seccion public.seccion_pauta%rowtype;
  v_id uuid;
  v_seccion_id uuid;
  v_version integer;
begin
  perform private.exigir_admin_catalogo();
  if p_accion = 'crear_borrador' then
    select * into v_origen from public.pauta
    where id = p_id and activo is true and eliminado_at is null and not borrador_version
    for update;
    if not found then raise exception 'Solo se puede versionar una pauta vigente.'; end if;
    select id into v_id from public.pauta
    where version_anterior_id = v_origen.id and borrador_version and eliminado_at is null;
    if found then return v_id; end if;
    select greatest(v_origen.version, coalesce(max(version), 0)) + 1 into v_version
    from public.pauta where version_anterior_id = v_origen.id;
    insert into public.pauta(id,categoria_id,nombre,descripcion,version,activo,created_at,version_anterior_id,borrador_version)
    values (gen_random_uuid(),v_origen.categoria_id,v_origen.nombre,v_origen.descripcion,v_version,false,now(),v_origen.id,true)
    returning id into v_id;
    for v_seccion in select * from public.seccion_pauta where pauta_id = v_origen.id order by orden,id loop
      insert into public.seccion_pauta(id,pauta_id,nombre,descripcion,orden)
      values (gen_random_uuid(),v_id,v_seccion.nombre,v_seccion.descripcion,v_seccion.orden)
      returning id into v_seccion_id;
      insert into public.item_pauta(id,seccion_id,descripcion,instrucciones,obligatorio,permite_no_aplica,orden)
      select gen_random_uuid(),v_seccion_id,i.descripcion,i.instrucciones,i.obligatorio,i.permite_no_aplica,i.orden
      from public.item_pauta i where i.seccion_id = v_seccion.id;
    end loop;
    return v_id;
  elsif p_accion = 'publicar' then
    select * into v_borrador from public.pauta
    where id = p_id and borrador_version and eliminado_at is null for update;
    if not found then raise exception 'El borrador no está disponible.'; end if;

    if not exists (select 1 from public.seccion_pauta where pauta_id = v_borrador.id)
       or exists (
         select 1 from public.seccion_pauta s where s.pauta_id = v_borrador.id
         and not exists (select 1 from public.item_pauta i where i.seccion_id = s.id)
       ) then
      raise exception 'La pauta debe tener secciones con ítems antes de publicarla.';
    end if;
    update public.pauta set activo = false, eliminado_at = now()
    where id = v_borrador.version_anterior_id and activo is true and eliminado_at is null
      and categoria_id = v_borrador.categoria_id;
    if not found then
      raise exception 'La versión anterior ya no está vigente o el borrador cambió de categoría.';
    end if;
    update public.pauta set activo = true, borrador_version = false where id = p_id;
    return p_id;
  end if;
  raise exception 'Acción de versión no válida.';
end;
$$;

revoke all on function public.gestionar_estado_local(text,uuid) from public, anon;
revoke all on function public.maquinas_pendientes_cierre(uuid) from public, anon;
revoke all on function public.gestionar_version_pauta(text,uuid) from public, anon;
grant execute on function public.gestionar_estado_local(text,uuid) to authenticated;
grant execute on function public.maquinas_pendientes_cierre(uuid) to authenticated;
grant execute on function public.gestionar_version_pauta(text,uuid) to authenticated;

commit;
