begin;

-- La restricción también evita dos altas simultáneas con el mismo RUN.
create unique index if not exists rf15_usuario_run_unico on public.usuario(run);

create or replace function public.listar_tecnicos_panel(
  p_busqueda text default '',
  p_activo boolean default null,
  p_pagina integer default 1
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_busqueda text := lower(btrim(left(coalesce(p_busqueda,''),100)));
  v_total bigint;
  v_pagina integer;
  v_filas jsonb;
begin
  perform private.exigir_admin_catalogo();
  with filtrados as materialized (
    select u.id, concat_ws(' ',nullif(btrim(u.nombre),''),nullif(btrim(u.segundo_nombre),''),
        nullif(btrim(u.apellido_paterno),''),nullif(btrim(u.apellido_materno),'')) as nombre,
      u.nombre as primer_nombre, u.segundo_nombre, u.apellido_paterno, u.apellido_materno, u.activo, u.created_at
    from public.usuario u
    left join public.rol r on r.id=u.rol_id
    where lower(r.nombre) in ('tecnico','técnico')
      and (p_activo is null or u.activo=p_activo)
      and (v_busqueda='' or strpos(lower(concat_ws(' ',nullif(btrim(u.nombre),''),nullif(btrim(u.segundo_nombre),''),
        nullif(btrim(u.apellido_paterno),''),nullif(btrim(u.apellido_materno),''))),v_busqueda)>0)
  ), conteo as (
    select count(*) as total from filtrados
  ), pagina as (
    select total, least(greatest(coalesce(p_pagina,1),1),greatest((total+19)/20,1))::integer as numero from conteo
  )
  select p.total,p.numero,coalesce((
      select jsonb_agg(to_jsonb(f) order by f.nombre,f.id)
      from (select * from filtrados order by nombre,id limit 20 offset ((p.numero-1)::bigint*20)) f
    ),'[]'::jsonb)
  into v_total,v_pagina,v_filas
  from pagina p;

  return jsonb_build_object('filas',v_filas,'total',v_total,'pagina',v_pagina);
end;
$$;

revoke all on function public.listar_tecnicos_panel(text,boolean,integer) from public,anon;
grant execute on function public.listar_tecnicos_panel(text,boolean,integer) to authenticated;

create function public.gestionar_perfil_tecnico(p_id uuid, p_accion text, p_datos jsonb default '{}')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text := nullif(btrim(p_datos->>'nombre'),'');
  v_segundo text := nullif(btrim(p_datos->>'segundo_nombre'),'');
  v_paterno text := nullif(btrim(p_datos->>'apellido_paterno'),'');
  v_materno text := nullif(btrim(p_datos->>'apellido_materno'),'');
begin
  perform private.exigir_admin_catalogo();
  if p_accion = 'editar' then
    if v_nombre is null or v_paterno is null or greatest(length(v_nombre),length(v_segundo),length(v_paterno),length(v_materno)) > 80 then
      raise exception 'Completa nombre y apellido paterno. Usa hasta 80 caracteres por campo.';
    end if;
    update public.usuario u set nombre=v_nombre, segundo_nombre=v_segundo,
      apellido_paterno=v_paterno, apellido_materno=v_materno
      from public.rol r where u.id=p_id and u.rol_id=r.id and lower(r.nombre) in ('tecnico','técnico')
      returning u.id into v_id;
  elsif p_accion = 'deshabilitar' then
    update public.usuario u set activo=false
      from public.rol r where u.id=p_id and u.rol_id=r.id and lower(r.nombre) in ('tecnico','técnico')
      returning u.id into v_id;
  else
    raise exception 'Acción no válida.';
  end if;
  if v_id is null then raise exception 'El perfil técnico no está disponible.'; end if;
  return v_id;
end;
$$;
revoke all on function public.gestionar_perfil_tecnico(uuid,text,jsonb) from public,anon;
grant execute on function public.gestionar_perfil_tecnico(uuid,text,jsonb) to authenticated;

-- Evalúa el estado vigente en la BD, no un dato almacenado en el JWT.
create function public.perfil_operativo_habilitado()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.usuario u
    where u.id=(select auth.uid()) and u.activo is true
  );
$$;
revoke all on function public.perfil_operativo_habilitado() from public,anon;
grant execute on function public.perfil_operativo_habilitado() to authenticated;

-- Las políticas restrictivas se suman a las políticas permisivas existentes.
-- Si una tabla operativa no usa RLS, no habilitarlo a ciegas.
do $$
declare v_tabla text;
begin
  foreach v_tabla in array array['mantencion','respuesta_item','evidencia','maquina','local','pauta','seccion_pauta','item_pauta'] loop
    if not exists (
      select 1 from pg_catalog.pg_class c where c.oid=to_regclass(format('public.%I',v_tabla)) and c.relrowsecurity
    ) then
      raise exception 'Revisa el esquema y las políticas RLS de public.% antes de aplicar RF-15.', v_tabla;
    end if;
    execute format(
      'create policy rf15_perfil_operativo_activo on public.%I as restrictive for all to authenticated using ((select public.perfil_operativo_habilitado())) with check ((select public.perfil_operativo_habilitado()))',
      v_tabla
    );
  end loop;
end;
$$;

commit;
