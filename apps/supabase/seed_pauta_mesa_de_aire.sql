begin;

do $$
declare
  categoria_id_pauta public.categoria_maquina.id%type;
  pauta_id_nueva public.pauta.id%type;
  nombre_pauta constant text := 'Pauta Técnica de Mantenimiento Integral – Mesa de aire';
begin
  select id into strict categoria_id_pauta
  from public.categoria_maquina
  where nombre = 'Mesa de aire';

  lock table public.pauta in share row exclusive mode;

  if exists (
    select 1 from public.pauta
    where categoria_id = categoria_id_pauta and version = 1 and nombre = nombre_pauta
  ) then
    return;
  end if;

  if exists (
    select 1 from public.pauta
    where categoria_id = categoria_id_pauta and version = 1
  ) then
    raise exception 'La categoría % ya tiene otra pauta en la versión 1.', 'Mesa de aire';
  end if;

  insert into public.pauta (categoria_id, nombre, descripcion, version, activo)
  values (
    categoria_id_pauta,
    nombre_pauta,
    'Equipo: mesa de aire. Servicio: mantenimiento preventivo / correctivo. Frecuencia sugerida del servicio: mensual / bimensual. La limpieza de la superficie es diaria.',
    1,
    true
  )
  returning id into pauta_id_nueva;

  with secciones_insertadas as (
    insert into public.seccion_pauta (pauta_id, orden, nombre, descripcion)
    values
      (pauta_id_nueva, 1, 'Limpieza de la Superficie de Juego', 'Limpieza diaria para mantener el deslizamiento del disco.'),
      (pauta_id_nueva, 2, 'Ubicación y Condiciones Ambientales', 'Condiciones del local donde se instala la mesa.'),
      (pauta_id_nueva, 3, 'Conexión y Seguridad Eléctrica', 'Enchufe con toma de tierra y desconexión antes de intervenir zonas eléctricas.')
    returning id, orden
  )
  insert into public.item_pauta (seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
  select seccion.id, item.orden, item.descripcion, item.instrucciones, true, item.permite_no_aplica
  from (
    values
      (1, 1, 'Limpieza diaria de la superficie de deslizamiento',
       'Limpiar la superficie una vez al día con la turbina en marcha para conservar el correcto deslizamiento del disco. Usar alcohol u otro producto equivalente disponible en el mercado.', false),
      (2, 1, 'Condiciones de ubicación de la mesa',
       'Verificar que la mesa esté ubicada en un local sin humedad ni polvo y fuera del alcance de la luz solar directa.', false),
      (3, 1, 'Conexión a un enchufe con toma de tierra',
       'Verificar que la máquina esté conectada a un solo enchufe con toma de tierra, de acuerdo con la normativa del país.', false),
      (3, 2, 'Desconexión antes de intervenir zonas eléctricas',
       'Desconectar la máquina de la red eléctrica antes de manipular cualquiera de sus zonas eléctricas.', false)
  ) as item(seccion_orden, orden, descripcion, instrucciones, permite_no_aplica)
  join secciones_insertadas as seccion on seccion.orden = item.seccion_orden;
end;
$$;

commit;
