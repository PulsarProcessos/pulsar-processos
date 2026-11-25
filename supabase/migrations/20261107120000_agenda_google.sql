-- Agenda ligada ao Google Agenda. Os compromissos ficam no próprio Google (duas agendas
-- criadas pelo Pulsar: Pessoal e Empreendedor); aqui fica só a conexão de cada usuário.
-- O refresh token é guardado cifrado pela Edge Function "agenda" (chave AGENDA_CHAVE nos
-- segredos das funções), e a tabela não tem políticas: o navegador não lê nem grava nela,
-- só a função (service role).
create table public.agenda_google (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token_cifrado text not null,
  agenda_pessoal_id text,
  agenda_empreendedor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_agenda_google_updated before update on public.agenda_google
  for each row execute function public.update_updated_at_column();

alter table public.agenda_google enable row level security;
revoke all on public.agenda_google from anon, authenticated, public;
grant all on public.agenda_google to service_role;
