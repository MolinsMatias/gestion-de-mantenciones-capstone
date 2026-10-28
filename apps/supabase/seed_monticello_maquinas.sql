-- =============================================================================
-- Seed / ETL Inicial: Local Strike Zone Monticello (Local 2) y sus 46 máquinas
-- Fuente: Estructura de mantenimiento maquinas (2).xlsx + Bitácora N°2026.xlsx
-- =============================================================================

begin;

-- 1. Local: Strike Zone Monticello (Local 2)
-- Busca dinámicamente la comuna "San Francisco de Mostazal" o "Mostazal" ya poblada en public.comuna.
insert into public.local (id, nombre, direccion, activo, comuna_id)
values (
  '00000000-0000-4000-8000-000000000010',
  'Strike Zone Monticello',
  'Ruta 5 Sur, Km 57',
  true,
  coalesce(
    (
      select c.id
      from public.comuna c
      where c.nombre ilike '%Mostazal%'
      order by length(c.nombre) asc
      limit 1
    ),
    (select c.id from public.comuna c limit 1)
  )
)
on conflict (id) do update
  set nombre = excluded.nombre,
      direccion = excluded.direccion,
      activo = excluded.activo,
      comuna_id = excluded.comuna_id;

-- 2. Categorías de máquinas recreativas (Alcance MVP sin Bowling)
insert into public.categoria_maquina (nombre, descripcion, activo)
values
  ('Ticket', 'Máquinas de redención y dispensación de tickets', true),
  ('Simulador', 'Simuladores de conducción, baile y disparo', true),
  ('Flipper', 'Máquinas de pinball (Stern Pinball)', true),
  ('Mesa de aire', 'Mesas de Air Hockey', true),
  ('Peluchera', 'Grúas de peluches y máquinas de premios directos', true),
  ('Atraccion infantil', 'Juegos mecánicos infantiles (Kiddie rides)', true)
on conflict (nombre) do update
  set descripcion = excluded.descripcion,
      activo = excluded.activo;

-- 3. Marcas normalizadas del inventario
insert into public.marca (nombre)
values
  ('Andamiro'),
  ('BayTek'),
  ('Chino'),
  ('Coastal'),
  ('Ice Game'),
  ('Lai Game'),
  ('Raw Thrills'),
  ('Skee Ball'),
  ('Stern'),
  ('Zamperla')
on conflict (nombre) do nothing;

-- 4. Las 46 máquinas recreativas de Strike Zone Monticello (Local 2)
-- Se asigna foto_path = 'VOLVER-AL-FUTURO-PINBALL-3.jpg' en el bucket privado 'img_maquinas'.
-- Se extrae el modelo cuando corresponde y se deja NULL en las 3 máquinas sin marca informada.
with datos_maquinas (
  codigo_interno,
  nombre,
  categoria_nombre,
  marca_nombre,
  modelo,
  foto_path
) as (
  values
    ('SZM-001', 'Alien', 'Simulador', 'Chino', 'Alien Arcade', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-002', 'Pump It Up', 'Simulador', 'Andamiro', 'Pump It Up', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-003', 'Scat Cats P2', 'Ticket', 'Skee Ball', 'Scat Cats', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-004', 'Scat Cats P4', 'Ticket', 'Skee Ball', 'Scat Cats', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-005', 'Hoop Fever 2', 'Ticket', 'Ice Game', 'Hoop Fever', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-006', 'Super Bikes 1', 'Simulador', 'Raw Thrills', 'Super Bikes', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-007', 'Super Bikes 2', 'Simulador', 'Raw Thrills', 'Super Bikes', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-008', 'Fast And Furious Drift 1', 'Simulador', 'Raw Thrills', 'Fast & Furious Drift', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-009', 'Fast And Furious Drift 2', 'Simulador', 'Raw Thrills', 'Fast & Furious Drift', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-010', 'Deal or no Deal', 'Ticket', 'Ice Game', 'Deal or No Deal', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-011', 'Mini Dunxx basket', 'Ticket', 'Ice Game', 'Mini Dunxx', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-012', 'Feeding Time', 'Ticket', 'Lai Game', 'Feeding Time', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-013', 'Hoop Fever 1', 'Ticket', 'Ice Game', 'Hoop Fever', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-014', 'King of Hammer', 'Simulador', 'Andamiro', 'King of Hammer', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-015', 'Air Hockey 1', 'Mesa de aire', 'Ice Game', 'Air Hockey', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-016', 'Air Hockey 2', 'Mesa de aire', 'Ice Game', 'Air Hockey', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-017', 'Pinball CSI', 'Flipper', 'Stern', 'CSI', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-018', 'Pinball Piratas del Caribe', 'Flipper', 'Stern', 'Pirates of the Caribbean', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-019', 'Pinball Indiana Jones', 'Flipper', 'Stern', 'Indiana Jones', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-020', 'Pinball Batman', 'Flipper', 'Stern', 'Batman', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-021', 'Plush Palace 4 (Peluchera)', 'Peluchera', 'Ice Game', 'Plush Palace', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-022', 'Plush Palace 5 (Peluchera)', 'Peluchera', 'Ice Game', 'Plush Palace', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-023', 'Stand Stacker', 'Peluchera', 'Lai Game', 'Stacker Standard', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-024', 'Camaleon Paradise 1', 'Ticket', 'BayTek', 'Chameleon Paradise', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-025', 'Camaleon Paradise 2', 'Ticket', 'BayTek', 'Chameleon Paradise', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-026', 'Crazy Clow', 'Ticket', 'Coastal', 'Down the Clown', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-027', 'Colorama 1', 'Ticket', null, 'Colorama', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-028', 'Colorama 2', 'Ticket', null, 'Colorama', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-029', 'Ripper Ribbit', 'Ticket', 'Coastal', 'Ripper Ribbit', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-030', 'Fishing Time', 'Ticket', 'Ice Game', 'Fishing Time', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-031', 'Tiburones', 'Ticket', 'Ice Game', 'Sharks', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-032', 'Speed Demon', 'Ticket', 'BayTek', 'Speed Demon', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-033', 'Zofari 1', 'Ticket', 'Ice Game', 'Zoofari', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-034', 'Zofari 2', 'Ticket', 'Ice Game', 'Zoofari', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-035', 'Pop Corn', 'Ticket', 'BayTek', 'Pop It For Gold', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-036', 'Hammer off road 1', 'Ticket', 'BayTek', 'Off Road', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-037', 'Hammer off road 2', 'Ticket', 'BayTek', 'Off Road', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-038', 'Bee Bee Boppin', 'Ticket', 'Lai Game', 'Bee Bee Boppin', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-039', 'Chiken Farm', 'Ticket', 'Lai Game', 'Chicken Farm', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-040', 'Free Fallin', 'Ticket', 'Ice Game', 'Free Fallin', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-041', 'Little Hoops', 'Ticket', 'Lai Game', 'Little Hoops', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-042', 'Kiddie Tren el Paso', 'Atraccion infantil', 'Zamperla', 'Tren El Paso', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-043', 'Kiddie Fun Dozer', 'Atraccion infantil', 'Zamperla', 'Fun Dozer', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-044', 'Kiddie Pony blanco', 'Atraccion infantil', null, 'Kiddie Pony', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-045', 'Kiddie Elefante', 'Atraccion infantil', 'Zamperla', 'Kiddie Elefante', 'VOLVER-AL-FUTURO-PINBALL-3.jpg'),
    ('SZM-046', 'Kiddie pony', 'Atraccion infantil', 'Zamperla', 'Kiddie Pony', 'VOLVER-AL-FUTURO-PINBALL-3.jpg')
)
insert into public.maquina (
  local_id,
  categoria_id,
  codigo_interno,
  nombre,
  marca_id,
  modelo,
  foto_path,
  activo
)
select
  '00000000-0000-4000-8000-000000000010'::uuid as local_id,
  cat.id as categoria_id,
  dm.codigo_interno,
  dm.nombre,
  mar.id as marca_id,
  dm.modelo,
  dm.foto_path,
  true as activo
from datos_maquinas dm
join public.categoria_maquina cat
  on cat.nombre = dm.categoria_nombre
left join public.marca mar
  on mar.nombre = dm.marca_nombre
on conflict (codigo_interno) do update
  set local_id = excluded.local_id,
      categoria_id = excluded.categoria_id,
      nombre = excluded.nombre,
      marca_id = excluded.marca_id,
      modelo = excluded.modelo,
      foto_path = excluded.foto_path,
      activo = excluded.activo;

-- 5. Políticas RLS para el bucket privado 'img_maquinas'
drop policy if exists machine_photo_read on storage.objects;
create policy machine_photo_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'img_maquinas'
    and (select private.current_app_role()) in ('administrador', 'técnico')
  );

commit;
