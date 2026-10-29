begin;

-- Registra también la columna que ya se agregó manualmente.
alter table public.local add column if not exists prefijo varchar;

-- Bloquea escrituras durante la instalación y la lectura inicial de códigos.
lock table public.local in share row exclusive mode;
lock table public.maquina in share row exclusive mode;

-- NULL/blanco sigue permitido en locales antiguos, pero no podrán recibir máquinas.
alter table public.local add constraint local_prefijo_formato
  check (prefijo is null or btrim(prefijo) = '' or upper(btrim(prefijo)) ~ '^[A-Z0-9]+$');
create unique index local_prefijo_normalizado_codigo_unico
  on public.local (upper(btrim(prefijo)))
  where prefijo is not null and btrim(prefijo) <> '';

create schema if not exists private;
create table private.contador_codigo_maquina (
  local_id uuid primary key references public.local(id) on delete cascade,
  ultimo_numero bigint not null check (ultimo_numero >= 0)
);
alter table private.contador_codigo_maquina enable row level security;
revoke all on table private.contador_codigo_maquina from public, anon, authenticated;

-- Continúa sobre el mayor sufijo existente de ese local; no renumera registros.
insert into private.contador_codigo_maquina(local_id, ultimo_numero)
select l.id, coalesce(max(substring(m.codigo_interno from length(upper(btrim(l.prefijo))) + 2)::bigint), 0)
from public.local l
left join public.maquina m on m.local_id = l.id
  and m.codigo_interno ~ ('^' || upper(btrim(l.prefijo)) || '-[0-9]+$')
where l.prefijo is not null and btrim(l.prefijo) <> ''
group by l.id;

create function private.generar_codigo_maquina_por_local()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  prefijo_local text;
  numero bigint;
  codigo text;
begin
  select upper(btrim(l.prefijo)) into prefijo_local
  from public.local l where l.id = new.local_id and l.activo = true
  for share;
  if prefijo_local is null or prefijo_local !~ '^[A-Z0-9]+$' then
    raise exception 'El local debe estar activo y tener un prefijo válido.';
  end if;

  loop
    -- ON CONFLICT bloquea la fila del contador: dos INSERT no usan el mismo número.
    insert into private.contador_codigo_maquina as contador(local_id, ultimo_numero)
    values (new.local_id, 1)
    on conflict (local_id) do update
      set ultimo_numero = contador.ultimo_numero + 1
    returning ultimo_numero into numero;

    -- No usar lpad(..., 2): truncaría los números de tres dígitos.
    codigo := prefijo_local || '-' || case when numero < 10 then '0' else '' end || numero::text;
    exit when not exists (select 1 from public.maquina m where m.codigo_interno = codigo);
  end loop;

  -- Ignora un código enviado por cualquier cliente: el servidor es la autoridad.
  new.codigo_interno := codigo;
  return new;
end;
$$;
revoke all on function private.generar_codigo_maquina_por_local() from public, anon, authenticated;
create trigger generar_codigo_maquina_por_local
  before insert on public.maquina for each row
  execute function private.generar_codigo_maquina_por_local();

-- Una vez usada la numeración, el prefijo permanece estable, incluso tras borrar equipos.
create function private.proteger_prefijo_local_con_codigos()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if upper(btrim(new.prefijo)) is distinct from upper(btrim(old.prefijo))
    and exists (select 1 from private.contador_codigo_maquina c
                where c.local_id = old.id and c.ultimo_numero > 0) then
    raise exception 'No puedes cambiar el prefijo de un local que ya tiene códigos asignados.';
  end if;
  return new;
end;
$$;
revoke all on function private.proteger_prefijo_local_con_codigos() from public, anon, authenticated;
create trigger proteger_prefijo_local_con_codigos
  before update of prefijo on public.local for each row
  execute function private.proteger_prefijo_local_con_codigos();

-- Se conserva la restricción UNIQUE existente de maquina.codigo_interno y las RLS.
commit;
