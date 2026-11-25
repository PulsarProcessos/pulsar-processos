-- Notificações do próprio Pulsar (Web Push).
-- push_assinaturas: cada aparelho onde a pessoa ligou as notificações. Só a própria pessoa vê,
-- cria e apaga as suas; o envio é feito pela Edge Function "notificacoes" (service role).
-- Todo dia às 8h (Brasília) o pg_cron chama a função, que avisa o que vence no dia.
-- O token que autoriza essa chamada fica no Vault (pulsar_notificacoes_token) e nos segredos
-- das funções (NOTIFICACOES_TOKEN); não fica neste arquivo.

create table public.push_assinaturas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  created_at timestamptz not null default now(),
  ultimo_envio timestamptz
);
create index idx_push_assinaturas_user on public.push_assinaturas (user_id);

alter table public.push_assinaturas enable row level security;
revoke all on public.push_assinaturas from anon, public;
grant select, insert, delete on public.push_assinaturas to authenticated;
grant all on public.push_assinaturas to service_role;
create policy dono_le on public.push_assinaturas for select to authenticated
  using ((select auth.uid()) = user_id);
create policy dono_cria on public.push_assinaturas for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy dono_apaga on public.push_assinaturas for delete to authenticated
  using ((select auth.uid()) = user_id);

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 11h UTC = 8h em Brasília (sem horário de verão desde 2019).
select cron.schedule(
  'pulsar-notificacoes-diarias',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://bhugzynquxcmkvfvenla.supabase.co/functions/v1/notificacoes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-pulsar-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'pulsar_notificacoes_token')
    ),
    body := '{"acao":"diario"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
