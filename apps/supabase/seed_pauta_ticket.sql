-- =============================================================================
-- Seed: Pauta Técnica de Mantenimiento Preventivo para Categoría 'Ticket'
-- Estructura: 7 Secciones y 24 Ítems de verificación técnica (Redención / Arcade)
-- Idempotente: Utiliza UUIDs fijos y ON CONFLICT DO UPDATE para re-ejecución segura
-- =============================================================================

begin;

-- 1. Cabecera de la Pauta (Versión 1, Categoría Ticket)
insert into public.pauta (
  id,
  categoria_id,
  nombre,
  descripcion,
  version,
  activo
)
values (
  '00000000-0000-4000-9000-000000000001',
  (select id from public.categoria_maquina where nombre = 'Ticket' limit 1),
  'Pauta de Mantenimiento Preventivo: Máquinas de Tickets',
  'Pauta técnica de 7 secciones: Premios/Cobro, Sensores, Electrónica, Mecanismos, Pantallas/Audio, Mueble/Seguridad y Test Mode.',
  1,
  true
)
on conflict (id) do update
  set nombre = excluded.nombre,
      descripcion = excluded.descripcion,
      activo = excluded.activo;

-- 2. Secciones de la Pauta
insert into public.seccion_pauta (id, pauta_id, orden, nombre, descripcion)
values
  (
    '00000000-0000-4000-9001-000000000001',
    '00000000-0000-4000-9000-000000000001',
    1,
    'Sistema de Premios, Dispensación y Cobro',
    'Dispensadores de tickets, lectores de tarjetas RFID, monederos y validadores de crédito.'
  ),
  (
    '00000000-0000-4000-9001-000000000002',
    '00000000-0000-4000-9000-000000000001',
    2,
    'Sensores, Detección y Sistema de Puntuación',
    'Sensores ópticos/fotoeléctricos, microswitches de paso y transductores de impacto.'
  ),
  (
    '00000000-0000-4000-9001-000000000003',
    '00000000-0000-4000-9000-000000000001',
    3,
    'Electrónica, Fuentes de Poder y Placas de Control',
    'Placa madre PCB, rieles de voltaje DC (+5V, +12V, +24V), arneses y tierra física (GND).'
  ),
  (
    '00000000-0000-4000-9001-000000000004',
    '00000000-0000-4000-9000-000000000001',
    4,
    'Mecanismos de Juego, Motores y Actuadores',
    'Motores paso a paso/DC, bobinas/solenoides, correas, engranajes y bolas/discos.'
  ),
  (
    '00000000-0000-4000-9001-000000000005',
    '00000000-0000-4000-9000-000000000001',
    5,
    'Pantallas, Marcadores, Iluminación y Audio',
    'Displays de 7 segmentos de bonus/tickets, paneles LCD, iluminación LED RGB y sonido.'
  ),
  (
    '00000000-0000-4000-9001-000000000006',
    '00000000-0000-4000-9000-000000000001',
    6,
    'Mueble, Seguridad, Acrílicos y Protección al Usuario',
    'Acrílicos de protección, nivelación de patas, cerraduras y redes/barreras anti-trampa.'
  ),
  (
    '00000000-0000-4000-9001-000000000007',
    '00000000-0000-4000-9000-000000000001',
    7,
    'Software, Calibración y Rutina de Cierre (Test Mode)',
    'Prueba de I/O test en menú de servicio, calibración de tiro/cero, verificación de payout y log de errores.'
  )
on conflict (id) do update
  set nombre = excluded.nombre,
      descripcion = excluded.descripcion,
      orden = excluded.orden;

-- 3. Ítems de Verificación por Sección
insert into public.item_pauta (id, seccion_id, orden, descripcion, instrucciones, obligatorio, permite_no_aplica)
values
  -- Sección 1: Sistema de Premios, Dispensación y Cobro
  (
    '00000000-0000-4000-9002-000000000101',
    '00000000-0000-4000-9001-000000000001',
    1,
    'Dispensadores de Tickets (Entrotec, Deltronic, etc.)',
    'Desmontar rodillos de arrastre, limpiar acumulación de polvo de papel y tinta con alcohol isopropílico. Calibrar tensión de resortes y cuchilla de corte. Limpiar y probar sensor óptico de conteo de muesca. Verificar guiado libre de atascos y switch de fin de papel.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000102',
    '00000000-0000-4000-9001-000000000001',
    2,
    'Sistemas de Lectura / Cobro (Intercard, Embed, Semnox, Monederos)',
    'Fijación del lector de tarjetas/RFID al mueble y estado del cableado de interfaz de red (RJ45/Molex). Comprobación del pulso de crédito y retorno de tickets virtuales (e-tickets) o físicos a la cuenta. Limpieza de canal de paso en monedero/fichas, ajuste de rechazo y microswitch.',
    true,
    true
  ),

  -- Sección 2: Sensores, Detección y Puntuación
  (
    '00000000-0000-4000-9002-000000000201',
    '00000000-0000-4000-9001-000000000002',
    1,
    'Sensores Ópticos / Fotoeléctricos (Barreras, Emisor-Receptor)',
    'Limpiar lentes y reflectores libres de polvo y grasa (crítico en juegos como Down the Clown, Skee-Ball, Crank It). Alineación física de emisores/receptores y regulación de sensibilidad si aplica.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000202',
    '00000000-0000-4000-9001-000000000002',
    2,
    'Microswitches y Sensores Mecánicos',
    'Comprobación de clic audible, retorno de palanca/actuador y desgaste por fatiga. Regulación de distancia de accionamiento en puntos de paso de bolas, monedas o dianas.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000203',
    '00000000-0000-4000-9001-000000000002',
    3,
    'Células de Carga / Sensores de Presión e Impacto',
    'Estado de topes de goma, amortiguadores mecánicos y fijación de transductores. Ejecutar prueba de rango mín/máx en Test Mode.',
    true,
    true
  ),

  -- Sección 3: Electrónica, Fuentes de Poder y Placas de Control
  (
    '00000000-0000-4000-9002-000000000301',
    '00000000-0000-4000-9001-000000000003',
    1,
    'Placas Madre / Main PCB / Controladoras I/O',
    'Inspección visual de pilas botón (CR2032), packs recargables o supercondensadores en busca de sulfatación, fugas ácidas o bajo voltaje (< 3.0V). Soplado de polvo estático con aire seco/brocha antiestática en disipadores y buses.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000302',
    '00000000-0000-4000-9001-000000000003',
    2,
    'Fuentes de Poder (Power Supplies)',
    'Medición de voltajes con carga: comprobar y ajustar rieles críticos (+5.0V DC exactos para lógica/sensores, +12V DC para dispensadores/motores, +24V/+48V si aplican). Inspección de condensadores electrolíticos hinchados y ventiladores.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000303',
    '00000000-0000-4000-9001-000000000003',
    3,
    'Cableado, Arneses y Tierras (GND)',
    'Inspección de arneses en bisagras y partes móviles para evitar cables pellizcados o quebrados. Detección de pines sulfatados o quemados en conectores Molex, JST, JAMMA. Medición de continuidad de tierra física entre chasis y toma principal.',
    true,
    true
  ),

  -- Sección 4: Mecanismos de Juego, Motores y Actuadores
  (
    '00000000-0000-4000-9002-000000000401',
    '00000000-0000-4000-9001-000000000004',
    1,
    'Motores DC / Paso a Paso / Servomotores',
    'Inspección de carbones, escobillas, engranajes reductores y temperatura de operación. Lubricación de piñonería plástica con grasa sintética (teflón/silicona, no WD-40) y metálica según fabricante.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000402',
    '00000000-0000-4000-9001-000000000004',
    2,
    'Solenoides / Bobinas / Relés',
    'Desgaste en émbolos (plungers), fundas plásticas (sleeves), resortes de retorno y topes de goma. Limpiar émbolos en seco (sin lubricantes grasos que peguen el polvo).',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000403',
    '00000000-0000-4000-9001-000000000004',
    3,
    'Correas, Cadenas y Poleas',
    'Tensión de correas de distribución, verificación de desgaste de dientes y alineación de poleas en elevadores de bolas, cintas transportadoras y carruseles.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000404',
    '00000000-0000-4000-9001-000000000004',
    4,
    'Elementos de Juego Físicos',
    'Conteo de stock de bolas/objetos de juego (ej. Skee-Ball, Hoop Fever, Space Invaders), limpieza y reemplazo por desgaste o deformación.',
    true,
    true
  ),

  -- Sección 5: Pantallas, Marcadores, Iluminación y Audio
  (
    '00000000-0000-4000-9002-000000000501',
    '00000000-0000-4000-9001-000000000005',
    1,
    'Displays y Marcadores de Dígitos (7 segmentos / LEDs)',
    'Comprobación de segmentos quemados, soldaduras frías en arneses de datos y limpieza de acrílicos frontales en displays de Bonus/Tickets.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000502',
    '00000000-0000-4000-9001-000000000005',
    2,
    'Monitores / Pantallas LCD / Proyectores',
    'Limpieza de paneles, verificación de backlight y estado de puertos HDMI/VGA.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000503',
    '00000000-0000-4000-9001-000000000005',
    3,
    'Iluminación General y Tiras LED RGB',
    'Detección de secciones de LED apagadas o con caída de voltaje; estado de controladores LED (DMX/WS2812B).',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000504',
    '00000000-0000-4000-9001-000000000005',
    4,
    'Sistema de Audio',
    'Balance de volumen (música de fondo vs. efectos de juego/premio), estado de conos de parlantes y potenciómetros.',
    true,
    true
  ),

  -- Sección 6: Mueble, Seguridad, Acrílicos y Protección
  (
    '00000000-0000-4000-9002-000000000601',
    '00000000-0000-4000-9001-000000000006',
    1,
    'Acrílicos, Protectores y Ventanas',
    'Limpieza con paño de microfibra y limpiador antiestático no corrosivo (sin alcoholes que rajen el policarbonato/acrílico).',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000602',
    '00000000-0000-4000-9001-000000000006',
    2,
    'Cerraduras, Bisagras y Nivelación',
    'Calibración y apriete de las patas niveladoras (evita descuadres en juegos de rodadura). Lubricación de cilindros de cerraduras y ajuste de pestillos en puertas de recaudación y tickets.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000603',
    '00000000-0000-4000-9001-000000000006',
    3,
    'Protecciones de Dedos y Redes',
    'Verificar que redes de contención, barreras anti-trampa (cheat-doors) y protectores de dedos estén firmes y sin riesgo de corte o atrapamiento.',
    true,
    true
  ),

  -- Sección 7: Software, Calibración y Rutina de Cierre (Test Mode)
  (
    '00000000-0000-4000-9002-000000000701',
    '00000000-0000-4000-9001-000000000007',
    1,
    'Pruebas de Entrada/Salida (I/O Test)',
    'Probar todos los botones, switches, sensores y actuadores uno a uno desde el menú de servicio.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000702',
    '00000000-0000-4000-9001-000000000007',
    2,
    'Calibración de Sensores y Motores',
    'Ejecutar rutina de homing / cero mecánico / calibración de tiro.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000703',
    '00000000-0000-4000-9001-000000000007',
    3,
    'Payout / Configuración de Porcentaje',
    'Verificar tabla de pagos, costo por partida, tickets por punto y dificultad según el payout meta del centro.',
    true,
    true
  ),
  (
    '00000000-0000-4000-9002-000000000704',
    '00000000-0000-4000-9001-000000000007',
    4,
    'Borrado de Errores / Log',
    'Revisar historial de errores (jam de tickets, fallas de motor, tilt) y limpiar el log antes de entregar la máquina operativa.',
    true,
    true
  )
on conflict (id) do update
  set seccion_id = excluded.seccion_id,
      orden = excluded.orden,
      descripcion = excluded.descripcion,
      instrucciones = excluded.instrucciones,
      obligatorio = excluded.obligatorio,
      permite_no_aplica = excluded.permite_no_aplica;

commit;
