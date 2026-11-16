begin;

do $$
declare
  categoria_id_pauta public.categoria_maquina.id%type;
  pauta_id_nueva public.pauta.id%type;
  nombre_pauta constant text := 'Pauta Técnica de Mantenimiento Integral – Atracciones infantiles';
begin
  select id into strict categoria_id_pauta
  from public.categoria_maquina
  where nombre = 'Atraccion infantil';

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
    raise exception 'La categoría % ya tiene otra pauta en la versión 1.', 'Atraccion infantil';
  end if;

  insert into public.pauta (categoria_id, nombre, descripcion, version, activo)
  values (
    categoria_id_pauta,
    nombre_pauta,
    'Equipo: atracciones infantiles. Servicio: mantenimiento preventivo / correctivo. Frecuencia sugerida: mensual / bimensual.',
    1,
    true
  )
  returning id into pauta_id_nueva;

  with secciones_insertadas as (
    insert into public.seccion_pauta (pauta_id, orden, nombre, descripcion)
    values
      (pauta_id_nueva, 1, 'Motores y Transmisión Mecánica', 'Inspección de motores, lubricación y ajuste de correas y poleas.'),
      (pauta_id_nueva, 2, 'Seguridad Eléctrica y Estructura', 'Continuidad de la puesta a tierra, protecciones y nivelación.'),
      (pauta_id_nueva, 3, 'Precauciones de Limpieza y Electrónica', 'Limpieza exterior, desconexión eléctrica y manipulación de placas lógicas.')
    returning id, orden
  )
  insert into public.item_pauta (seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
  select seccion.id, item.orden, item.descripcion, item.instrucciones, true, item.permite_no_aplica
  from (
    values
      (1, 1, 'Inspección de motores',
       'Inspeccionar el estado de carbones, escobillas y engranajes reductores, y comprobar la temperatura de operación de los motores.', false),
      (1, 2, 'Lubricación de piñonería plástica',
       'Lubricar la piñonería plástica con grasa sintética de teflón o silicona. Evitar estrictamente el uso de WD-40 estándar.', true),
      (1, 3, 'Ajuste de correas y poleas',
       'En sistemas de movimiento continuo como carruseles, ajustar la tensión de las correas de distribución, verificar el desgaste de los dientes y alinear las poleas.', true),
      (2, 1, 'Continuidad de la puesta a tierra',
       'Comprobar la continuidad de la toma de tierra (GND físico) en todas las partes metálicas accesibles para evitar riesgos eléctricos al usuario.', false),
      (2, 2, 'Protectores de dedos y redes de contención',
       'Inspeccionar que los protectores de dedos y las redes de contención estén firmes y que no exista riesgo de atrapamiento o corte.', false),
      (2, 3, 'Nivelación y apriete de patas',
       'Calibrar y apretar las patas niveladoras para evitar que la estructura quede descuadrada.', false),
      (3, 1, 'Limpieza de superficies exteriores y gráficos',
       'Limpiar las superficies exteriores y los gráficos únicamente con una solución jabonosa suave y un paño limpio. No usar solventes, gasolina ni diluyentes.', false),
      (3, 2, 'Desconexión eléctrica antes de intervenir',
       'Apagar la máquina y desconectarla de la red eléctrica antes de cualquier trabajo de limpieza interior o mantenimiento.', false),
      (3, 3, 'Manipulación de placas lógicas',
       'Nunca conectar ni desconectar placas lógicas de circuitos integrados mientras el equipo esté encendido.', false)
  ) as item(seccion_orden, orden, descripcion, instrucciones, permite_no_aplica)
  join secciones_insertadas as seccion on seccion.orden = item.seccion_orden;
end;
$$;

commit;
