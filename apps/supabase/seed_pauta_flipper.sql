begin;

do $$
declare
  categoria_id_pauta public.categoria_maquina.id%type;
  pauta_id_nueva public.pauta.id%type;
  nombre_pauta constant text := 'Pauta Técnica de Mantenimiento Integral – Stern Pinball';
begin
  select id into strict categoria_id_pauta
  from public.categoria_maquina
  where nombre = 'Flipper';

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
    raise exception 'La categoría % ya tiene otra pauta en la versión 1.', 'Flipper';
  end if;

  insert into public.pauta (categoria_id, nombre, descripcion, version, activo)
  values (
    categoria_id_pauta,
    nombre_pauta,
    'Equipo: Stern Pinball (Spike / Spike 2 / SAM). Servicio: mantenimiento preventivo / correctivo. Frecuencia sugerida: mensual / bimensual, según volumen de partidas en ruta o sala.',
    1,
    true
  )
  returning id into pauta_id_nueva;

  with secciones_insertadas as (
    insert into public.seccion_pauta (pauta_id, orden, nombre, descripcion)
    values
      (pauta_id_nueva, 1, 'Sistema de Diagnóstico y Electrónica (Service Menu)', 'Bobinas, iluminación, sensores y electrónica de control.'),
      (pauta_id_nueva, 2, 'Mecánica de Alto Desgaste y Ensamble Bajo Playfield', 'Flippers, sistema de bolas, lanzador y mecanismos especiales.'),
      (pauta_id_nueva, 3, 'Superficie de Juego (Playfield) y Componentes Superiores', 'Gomas, postes, plásticos, rampas y limpieza del playfield.'),
      (pauta_id_nueva, 4, 'Gabinete, Monedero y Seguridad', 'Nivelación, sujeciones, puerta de monedero y dispositivos de seguridad.'),
      (pauta_id_nueva, 5, 'Control Final de Calidad (Prueba Operativa)', 'Prueba de juego, puntuación y guardado de configuración.')
    returning id, orden
  )
  insert into public.item_pauta (seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
  select seccion.id, item.orden, item.descripcion, item.instrucciones, true, item.permite_no_aplica
  from (
    values
      (1, 1, 'Test de Bobinas y Solenoides',
       'Comprobar disparo y fuerza de los flippers inferiores y superiores si aplica. Probar slingshots, jet bumpers, kickers, trough eject y desviadores/gates.', false),
      (1, 2, 'Inspección de Iluminación',
       'Probar la iluminación general (GI) y los LEDs controlados/inserts. Verificar secuencias RGB y matrices de nodos Node Board (Spike).', false),
      (1, 3, 'Test de Switches y Sensores',
       'Comprobar microswitches mecánicos (rollovers, targets), sensores optoelectrónicos (opto-boards en rampas/trough) y switches magnéticos/reed. Probar el switch de tilt (plomada y slam tilt en puerta).', false),
      (1, 4, 'Electrónica de Control y Nodos',
       'Inspeccionar cables RJ45 y comunicación Node Bus (Spike 2). Revisar voltajes de la fuente de poder (PSU de 48V / 12V / 5V) y estado de ventiladores de la fuente y del backbox. Actualizar código/firmware y comprobar la conexión Insider Connected si aplica.', false),
      (2, 1, 'Mecanismo de Flippers (Revisión Crítica)',
       'Revisar estado y desgaste de émbolos (plungers), topes (coil stops) y resortes de retorno. Inspeccionar bujes (bushings) por holguras o fisuras. Ajustar switches de fin de carrera (E.O.S. - End of Stroke) y altura o espacio libre de la aleta respecto al playfield.', false),
      (2, 2, 'Sistema de Bolas y Lanzador (Ball Trough & Shooter)',
       'Limpiar el canal de bolas (trough) y verificar micros de conteo. Alinear el plunger manual y el autoplunger con el centro de la bola. Desmagnetizar o reemplazar bolas picadas, desgastadas o magnetizadas.', false),
      (2, 3, 'Mecanismos Especiales / Toys y Motores',
       'Revisar desgaste de engranajes y usar lubricación seca solo en piezas que lo requieran según el manual. Nunca usar WD-40. Verificar switches de posición en mecanismos móviles como rampas, figuras animadas y elevadores.', true),
      (3, 1, 'Gomas, Postes y Plásticos',
       'Inspeccionar y reemplazar gomas desgastadas, agrietadas o sucias para mantener rebote y consistencia. Apretar postes, torres y tornillería floja por vibración. Revisar protectores de playfield (cliffys y arandelas bajo plásticos) para evitar que se astillen los acrílicos.', false),
      (3, 2, 'Rampas y Guías Metálicas',
       'Limpiar trazas de goma y polvo en rampas plásticas y alambres (wireforms). Ajustar los flaps de entrada de rampa al ras del playfield para evitar que desvíen el tiro. Verificar compuertas unidireccionales (one-way gates).', false),
      (3, 3, 'Limpieza y Encerado del Playfield',
       'Retirar polvo y residuos de carbón y goma con un limpiador adecuado no abrasivo (por ejemplo, Novus 2 para manchas y Novus 1 para plásticos). Aplicar cera 100% carnauba líquida o en pasta en playfields con laca original, evitando sensores ópticos y ranuras de switches. Limpiar el vidrio por ambas caras con limpiador sin amoníaco.', false),
      (4, 1, 'Caja y Patas',
       'Comprobar nivelación transversal (0°) e inclinación longitudinal (típica de 6.5° a 7.0°) con nivel digital o burbuja de fábrica. Comprobar y apretar pernos de patas y regatones niveladores. Revisar ajuste y estado del seguro del lockbar y del cristal.', false),
      (4, 2, 'Puerta de Monedero (Coin Door)',
       'Probar botones de servicio (Up, Down, Enter, Back). Verificar el interlock switch de alta tensión (corte de 48V al abrir la puerta). Probar monedero, billetero o lector de tarjetas si aplica.', false),
      (5, 1, 'Partida de Prueba (Playtest)',
       'Comprobar flujo continuo de bola sin atascos en rampas o detrás de postes. Verificar sensibilidad y balance idénticos entre ambos flippers. Comprobar registro de puntuación, multibolas y guardado de configuración.', false)
  ) as item(seccion_orden, orden, descripcion, instrucciones, permite_no_aplica)
  join secciones_insertadas as seccion on seccion.orden = item.seccion_orden;
end;
$$;

commit;
