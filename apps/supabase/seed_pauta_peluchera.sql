begin;

do $$
declare
  categoria_id_pauta public.categoria_maquina.id%type;
  pauta_id_nueva public.pauta.id%type;
  nombre_pauta constant text := 'Pauta Técnica de Mantenimiento Integral – Peluchera';
begin
  select id into strict categoria_id_pauta
  from public.categoria_maquina
  where nombre = 'Peluchera';

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
    raise exception 'La categoría % ya tiene otra pauta en la versión 1.', 'Peluchera';
  end if;

  insert into public.pauta (categoria_id, nombre, descripcion, version, activo)
  values (
    categoria_id_pauta,
    nombre_pauta,
    'Equipo: grúas o pelucheras. Servicio: mantenimiento preventivo / correctivo. Frecuencia sugerida: mensual / bimensual.',
    1,
    true
  )
  returning id into pauta_id_nueva;

  with secciones_insertadas as (
    insert into public.seccion_pauta (pauta_id, orden, nombre, descripcion)
    values
      (pauta_id_nueva, 1, 'Mecanismos y Motores (Movimiento de la Garra)', 'Inspección de motores y lubricación de la piñonería plástica.'),
      (pauta_id_nueva, 2, 'Cableado y Electrónica', 'Inspección de arneses, voltajes bajo carga y continuidad de tierra.'),
      (pauta_id_nueva, 3, 'Sensores y Switches', 'Revisión de sensores mecánicos y limpieza de barreras ópticas.'),
      (pauta_id_nueva, 4, 'Gabinete, Acrílicos y Monederos', 'Limpieza de acrílicos, revisión del monedero, nivelación y cerraduras.')
    returning id, orden
  )
  insert into public.item_pauta (seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
  select seccion.id, item.orden, item.descripcion, item.instrucciones, true, item.permite_no_aplica
  from (
    values
      (1, 1, 'Inspección de motores DC o paso a paso',
       'Inspeccionar el estado de los carbones, escobillas y engranajes reductores, y comprobar la temperatura de operación de los motores DC o paso a paso.', true),
      (1, 2, 'Lubricación de piñonería plástica',
       'Lubricar la piñonería plástica con grasa sintética de teflón o silicona. Está estrictamente prohibido usar WD-40 estándar en estos componentes.', true),
      (2, 1, 'Arneses y cableado en partes móviles',
       'Inspeccionar los arneses y juegos de cables en las partes con movimiento mecánico para prevenir y detectar cables pellizcados o quebrados internamente.', true),
      (2, 2, 'Voltajes de las fuentes de poder bajo carga',
       'Medir los voltajes de las fuentes de poder bajo carga y ajustar los rieles críticos a +5.0 V DC exactos para la lógica y +12 V DC para motores o dispensadores.', false),
      (2, 3, 'Continuidad de la puesta a tierra',
       'Medir la continuidad de la línea de tierra física (GND) entre el chasis metálico y la toma principal para evitar fallas por descargas electrostáticas.', false),
      (3, 1, 'Microswitches y sensores mecánicos',
       'Comprobar el clic audible, el retorno mecánico de la palanca y el posible desgaste por fatiga.', true),
      (3, 2, 'Limpieza de barreras ópticas',
       'Si existen barreras ópticas, limpiar los lentes y reflectores para mantenerlos libres de polvo y grasa.', true),
      (4, 1, 'Limpieza de acrílicos y ventanas protectoras',
       'Limpiar los acrílicos y ventanas protectoras con un paño de microfibra y un limpiador antiestático no corrosivo. Evitar productos con alcohol que puedan rajar el policarbonato.', false),
      (4, 2, 'Limpieza y ajuste del monedero',
       'Limpiar el canal de paso del monedero, ajustar el rechazo y revisar el microswitch de crédito. Ocasionalmente se puede retirar el mecanismo de monedas para lavarlo con agua jabonosa. Secarlo completamente antes de reinstalarlo.', true),
      (4, 3, 'Patas niveladoras y cerraduras de recaudación',
       'Calibrar y apretar las patas niveladoras del mueble y lubricar los cilindros de las cerraduras de recaudación.', false)
  ) as item(seccion_orden, orden, descripcion, instrucciones, permite_no_aplica)
  join secciones_insertadas as seccion on seccion.orden = item.seccion_orden;
end;
$$;

commit;
