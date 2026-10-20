begin;

create schema if not exists private;

create table if not exists private.login_attempt (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1 check (attempts > 0)
);

create index if not exists login_attempt_window_idx
  on private.login_attempt (window_started_at);

alter table private.login_attempt enable row level security;
revoke all on private.login_attempt from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.login_attempt to service_role;

-- Solo el backend puede consumir intentos. No se almacenan RUN ni contraseñas.
create or replace function public.consume_login_attempt(p_bucket text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_allowed boolean;
begin
  if p_bucket = 'global' then
    v_limit := 300;
  elsif p_bucket ~ '^run:[a-f0-9]{64}$' then
    v_limit := 8;
  else
    raise exception 'Invalid login bucket';
  end if;

  delete from private.login_attempt
    where window_started_at < now() - interval '1 day';

  insert into private.login_attempt as current_bucket (bucket)
  values (p_bucket)
  on conflict (bucket) do update set
    attempts = case
      when current_bucket.window_started_at <= now() - interval '15 minutes' then 1
      else current_bucket.attempts + 1
    end,
    window_started_at = case
      when current_bucket.window_started_at <= now() - interval '15 minutes' then now()
      else current_bucket.window_started_at
    end
  where current_bucket.attempts < v_limit
     or current_bucket.window_started_at <= now() - interval '15 minutes'
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_login_attempt(text)
  from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;

commit;