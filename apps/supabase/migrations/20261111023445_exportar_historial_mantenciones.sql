begin;

create function public.exportar_historial_mantenciones(
  p_local uuid default null, p_maquina uuid default null,
  p_tipo text default '', p_estado text default '', p_tecnico uuid default null, p_mes date default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_exportacion jsonb; v_cantidad bigint;
begin
  perform private.exigir_admin_catalogo();
  -- Una única sentencia genera datos y conteo desde la misma instantánea.
  with filtradas as materialized (
    select m.* from public.mantencion m
    where m.estado='enviada' and m.finalizada_at is not null
      and (p_local is null or m.local_id=p_local)
      and (p_maquina is null or m.maquina_id=p_maquina)
      and (coalesce(p_tipo,'')='' or m.tipo::text=p_tipo)
      and (coalesce(p_estado,'')='' or m.estado_equipo_final::text=p_estado)
      and (p_tecnico is null or m.tecnico_id=p_tecnico)
      and (p_mes is null or (
        m.finalizada_at >= (date_trunc('month',p_mes::timestamp) at time zone 'America/Santiago')
        and m.finalizada_at < ((date_trunc('month',p_mes::timestamp)+interval '1 month') at time zone 'America/Santiago')
      ))
  ), datos as (
    select jsonb_build_object(
      'id', m.id, 'local_id',m.local_id,'maquina_id',m.maquina_id,'tecnico_id',m.tecnico_id,
      'local',l.nombre,'direccion',l.direccion,'comuna',c.nombre,
      'maquina',q.nombre,'codigo',q.codigo_interno,
      'tecnico',nullif(btrim(concat_ws(' ',u.nombre,u.segundo_nombre,u.apellido_paterno,u.apellido_materno)),''),
      'pauta_id',m.pauta_id,'pauta',p.nombre,'version',p.version,
      'tipo',m.tipo,'estado',m.estado_equipo_final,'iniciada_at',m.iniciada_at,
      'finalizada_at',m.finalizada_at,'enviada_at',m.enviada_at,'recibida_at',m.recibida_at,
      'falla_reportada',m.falla_reportada,'trabajos_realizados',m.trabajos_realizados,
      'requiere_repuestos',m.requiere_repuestos,'detalle_repuestos',m.detalle_repuestos,
      'pendientes',m.pendientes,'observaciones',m.observaciones,
      'respuestas',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',r.id,'item_id',r.item_id,'seccion',s.nombre,'item',i.descripcion,
          'instrucciones',i.instrucciones,'resultado',r.resultado,'observaciones',r.observaciones
        ) order by s.orden,s.id,i.orden,i.id,r.id)
        from public.respuesta_item r
        left join public.item_pauta i on i.id=r.item_id
        left join public.seccion_pauta s on s.id=i.seccion_id
        where r.mantencion_id=m.id
      ),'[]'::jsonb)
    ) as registro, m.finalizada_at, m.id
    from filtradas m
    left join public.local l on l.id=m.local_id
    left join public.comuna c on c.id=l.comuna_id
    left join public.maquina q on q.id=m.maquina_id
    left join public.usuario u on u.id=m.tecnico_id
    left join public.pauta p on p.id=m.pauta_id
    where (select count(*) from filtradas)<=5000
  )
  select (select count(*) from filtradas),
    jsonb_build_object('generado_at',now(),'registros',coalesce((
      select jsonb_agg(d.registro order by d.finalizada_at,d.id) from datos d
    ),'[]'::jsonb))
  into v_cantidad,v_exportacion;
  if v_cantidad>5000 then raise exception 'La exportación supera 5000 registros. Acota los filtros; no se generó un archivo parcial.'; end if;
  return v_exportacion;
end;
$$;

revoke all on function public.exportar_historial_mantenciones(uuid,uuid,text,text,uuid,date) from public,anon;
grant execute on function public.exportar_historial_mantenciones(uuid,uuid,text,text,uuid,date) to authenticated;
commit;
