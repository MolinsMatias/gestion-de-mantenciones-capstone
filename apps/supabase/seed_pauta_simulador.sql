begin;

do $$
declare
  categoria_id_pauta public.categoria_maquina.id%type;
  pauta_id_nueva public.pauta.id%type;
  nombre_pauta constant text := 'Pauta Técnica de Mantenimiento Integral – Simuladores';
begin
  select id into strict categoria_id_pauta
  from public.categoria_maquina
  where nombre = 'Simulador';

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
    raise exception 'La categoría % ya tiene otra pauta en la versión 1.', 'Simulador';
  end if;

  insert into public.pauta (categoria_id, nombre, descripcion, version, activo)
  values (
    categoria_id_pauta,
    nombre_pauta,
    'Equipo: simuladores de autos y motos. Servicio: mantenimiento preventivo / correctivo. Frecuencia sugerida: mensual / bimensual.',
    1,
    true
  )
  returning id into pauta_id_nueva;

  with secciones_insertadas as (
    insert into public.seccion_pauta (pauta_id, orden, nombre, descripcion)
    values
      (pauta_id_nueva, 1, 'Controles de Conducción y Calibración', 'Calibración programada de volante y pedales.'),
      (pauta_id_nueva, 2, 'Motores de Movimiento y Actuadores', 'Inspección de motores de cabina y lubricación de piñonería plástica.'),
      (pauta_id_nueva, 3, 'Seguridad Eléctrica y Estructura', 'Continuidad de tierra, voltajes bajo carga y fijaciones.'),
      (pauta_id_nueva, 4, 'Placas (PCBs) y Refrigeración', 'Limpieza del gabinete interior y revisión del sistema de ventilación.'),
      (pauta_id_nueva, 5, 'Monitores y Limpieza Exterior', 'Limpieza de pantallas, acrílicos y gabinete, y desconexión previa a la limpieza interior.')
    returning id, orden
  )
  insert into public.item_pauta (seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
  select seccion.id, item.orden, item.descripcion, item.instrucciones, true, item.permite_no_aplica
  from (
    values
      (1, 1, 'Calibración de volante y pedales',
       'Calibrar el volante y los pedales como parte del mantenimiento programado por el desgaste mecánico normal. Desde el menú de prueba, calibrar el volante en las posiciones centro, izquierda y derecha. Pulsar y soltar el pedal del acelerador para registrar sus valores de recorrido.', true),
      (2, 1, 'Inspección de motores de movimiento',
       'Revisar el estado de carbones, escobillas y engranajes reductores, y comprobar la temperatura de operación de los motores DC o servomotores encargados del movimiento de la cabina.', true),
      (2, 2, 'Lubricación de piñonería plástica',
       'Aplicar grasa sintética de teflón o silicona en la piñonería plástica. Está estrictamente prohibido usar WD-40 estándar en estas piezas.', true),
      (3, 1, 'Continuidad de la puesta a tierra',
       'Confirmar la continuidad de la toma de tierra (GND) en todas las partes metálicas accesibles del gabinete para proteger al usuario.', false),
      (3, 2, 'Voltajes de la fuente bajo carga',
       'Verificar los voltajes de operación de la fuente (+5.0 V DC y +12 V DC) mediante medición bajo carga.', false),
      (3, 3, 'Herrajes y pernos de fijación',
       'Comprobar y reapretar todos los herrajes y pernos de fijación sometidos a la vibración del equipo.', false),
      (4, 1, 'Limpieza interior del gabinete',
       'Con la máquina apagada y desconectada de la red eléctrica, aspirar el polvo del interior del gabinete y retirar cualquier objeto que haya caído sobre las placas base.', false),
      (4, 2, 'Rejillas, filtros y ventiladores',
       'Limpiar las rejillas de ventilación y los filtros de aire, y comprobar el estado de los ventiladores para evitar sobrecalentamientos. Apagar y desconectar la máquina antes de cualquier limpieza interior.', false),
      (5, 1, 'Limpieza de monitores y superficies exteriores',
       'Limpiar las pantallas y los paneles acrílicos con un paño suave. Para los gráficos y el mueble exterior, usar solo soluciones jabonosas suaves. No usar solventes, ya que pueden dañar el arte de la máquina.', false),
      (5, 2, 'Desconexión eléctrica antes de la limpieza interior',
       'Apagar y desconectar la máquina de la red eléctrica antes de cualquier limpieza interior.', false)
  ) as item(seccion_orden, orden, descripcion, instrucciones, permite_no_aplica)
  join secciones_insertadas as seccion on seccion.orden = item.seccion_orden;
end;
$$;

commit;
