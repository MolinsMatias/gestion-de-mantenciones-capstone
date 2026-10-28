begin;

create or replace function public.obtener_indicadores_monitor()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fecha_chile date :=
    (now() at time zone 'America/Santiago')::date;

  inicio_dia timestamptz;
  fin_dia timestamptz;

  cantidad_operativas bigint;
  cantidad_inspecciones bigint;
begin
  -- Solo administradores activos pueden consultar este resumen.
  if not exists (
    select 1
    from public.usuario u
    join public.rol r on r.id = u.rol_id
    where u.id = auth.uid()
      and u.activo = true
      and r.nombre = 'administrador'
  ) then
    raise exception 'Acceso no autorizado'
      using errcode = '42501';
  end if;

  inicio_dia :=
    fecha_chile::timestamp at time zone 'America/Santiago';

  fin_dia :=
    (fecha_chile + 1)::timestamp at time zone 'America/Santiago';

  -- Último mantenimiento enviado y finalizado de cada máquina.
  -- Si ese registro no informa estado, no se recupera uno antiguo.
  with ultimo_reporte as (
    select distinct on (mt.maquina_id)
      mt.maquina_id,
      mt.estado_equipo_final
    from public.mantencion mt
    where mt.estado = 'enviada'
      and mt.finalizada_at is not null
    order by
      mt.maquina_id,
      mt.finalizada_at desc,
      mt.created_at desc,
      mt.id desc
  )
  select count(*)
  into cantidad_operativas
  from public.maquina m
  join ultimo_reporte ur on ur.maquina_id = m.id
  where m.activo = true
    and ur.estado_equipo_final = 'operativa';

  select count(*)
  into cantidad_inspecciones
  from public.mantencion mt
  where mt.tipo = 'inspeccion'
    and mt.estado = 'enviada'
    and mt.finalizada_at >= inicio_dia
    and mt.finalizada_at < fin_dia;

  return jsonb_build_object(
    'maquinas_operativas', cantidad_operativas,
    'inspecciones_hoy', cantidad_inspecciones,
    'fecha_chile', fecha_chile
  );
end;
$$;

revoke execute
  on function public.obtener_indicadores_monitor()
  from public, anon;

grant execute
  on function public.obtener_indicadores_monitor()
  to authenticated;

commit;