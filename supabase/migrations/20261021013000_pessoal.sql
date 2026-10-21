-- Módulo Pessoal: finanças pessoais, separadas das tabelas da empresa.
-- Cada usuário vê e altera apenas os próprios registros (RLS por user_id).
-- Parcelas de dívidas são linhas em pessoal_lancamentos (divida_id + parcela_numero);
-- contas fixas pagas também (conta_fixa_id + competencia, o 1º dia do mês pago).

-- ============ CATEGORIAS ============
create table public.pessoal_categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('Receita', 'Despesa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tipo, nome)
);

-- ============ RENDAS (quanto entra por mês) ============
create table public.pessoal_rendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null check (length(trim(descricao)) > 0),
  valor numeric(14,2) not null check (valor >= 0),
  dia_recebimento smallint check (dia_recebimento between 1 and 31),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pessoal_rendas_user on public.pessoal_rendas (user_id);

-- ============ CONTAS FIXAS (repetem todo mês) ============
create table public.pessoal_contas_fixas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null check (length(trim(descricao)) > 0),
  valor numeric(14,2) not null check (valor > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  categoria_id uuid references public.pessoal_categorias(id) on delete set null,
  -- Primeiro mês em que a conta aparece nas movimentações.
  inicio date not null default date_trunc('month', current_date)::date
    check (extract(day from inicio) = 1),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pessoal_contas_fixas_user on public.pessoal_contas_fixas (user_id);
create index idx_pessoal_contas_fixas_categoria on public.pessoal_contas_fixas (categoria_id);

-- ============ DÍVIDAS ============
create table public.pessoal_dividas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null check (length(trim(descricao)) > 0),
  credor text,
  valor_parcela numeric(14,2) not null check (valor_parcela > 0),
  total_parcelas smallint not null check (total_parcelas between 1 and 600),
  primeira_parcela date not null,
  categoria_id uuid references public.pessoal_categorias(id) on delete set null,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pessoal_dividas_user on public.pessoal_dividas (user_id);
create index idx_pessoal_dividas_categoria on public.pessoal_dividas (categoria_id);

-- ============ LANÇAMENTOS ============
create table public.pessoal_lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  descricao text not null check (length(trim(descricao)) > 0),
  tipo text not null default 'Despesa' check (tipo in ('Receita', 'Despesa')),
  valor numeric(14,2) not null check (valor > 0),
  status text not null default 'Pendente' check (status in ('Pago', 'Pendente')),
  categoria_id uuid references public.pessoal_categorias(id) on delete set null,
  divida_id uuid references public.pessoal_dividas(id) on delete cascade,
  parcela_numero smallint check (parcela_numero > 0),
  conta_fixa_id uuid references public.pessoal_contas_fixas(id) on delete set null,
  competencia date,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((divida_id is null) = (parcela_numero is null)),
  check (conta_fixa_id is null or competencia is not null),
  unique (divida_id, parcela_numero),
  unique (conta_fixa_id, competencia)
);
create index idx_pessoal_lancamentos_user_data on public.pessoal_lancamentos (user_id, data);
create index idx_pessoal_lancamentos_categoria on public.pessoal_lancamentos (categoria_id);

-- ============ updated_at ============
create trigger trg_pessoal_categorias_updated before update on public.pessoal_categorias
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_rendas_updated before update on public.pessoal_rendas
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_contas_fixas_updated before update on public.pessoal_contas_fixas
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_dividas_updated before update on public.pessoal_dividas
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_lancamentos_updated before update on public.pessoal_lancamentos
  for each row execute function public.update_updated_at_column();

-- ============ ACESSO (RLS) ============
do $$
declare
  t text;
begin
  foreach t in array array[
    'pessoal_categorias', 'pessoal_rendas', 'pessoal_contas_fixas',
    'pessoal_dividas', 'pessoal_lancamentos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy own_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy own_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy own_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy own_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ============ SALVAR DÍVIDA (cria ou edita e gera as parcelas) ============
-- Roda com as permissões de quem chama (security invoker), então o RLS vale normalmente.
-- Na edição, as parcelas já pagas ficam como estão e as pendentes são recriadas
-- com o novo valor, a nova data e a nova quantidade.
create or replace function public.pessoal_salvar_divida(
  p_id uuid,
  p_descricao text,
  p_credor text,
  p_valor_parcela numeric,
  p_total_parcelas integer,
  p_primeira_parcela date,
  p_categoria_id uuid,
  p_obs text,
  p_parcelas_pagas integer default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida.';
  end if;

  if v_id is null then
    if coalesce(p_parcelas_pagas, 0) < 0 or coalesce(p_parcelas_pagas, 0) > p_total_parcelas then
      raise exception 'A quantidade de parcelas pagas precisa estar entre 0 e %.', p_total_parcelas;
    end if;
    insert into public.pessoal_dividas
      (descricao, credor, valor_parcela, total_parcelas, primeira_parcela, categoria_id, obs)
    values
      (p_descricao, nullif(trim(p_credor), ''), p_valor_parcela, p_total_parcelas,
       p_primeira_parcela, p_categoria_id, nullif(trim(p_obs), ''))
    returning id into v_id;
  else
    update public.pessoal_dividas
       set descricao = p_descricao,
           credor = nullif(trim(p_credor), ''),
           valor_parcela = p_valor_parcela,
           total_parcelas = p_total_parcelas,
           primeira_parcela = p_primeira_parcela,
           categoria_id = p_categoria_id,
           obs = nullif(trim(p_obs), '')
     where id = v_id;
    if not found then
      raise exception 'Dívida não encontrada.';
    end if;

    if exists (
      select 1 from public.pessoal_lancamentos
       where divida_id = v_id and status = 'Pago' and parcela_numero > p_total_parcelas
    ) then
      raise exception 'Há parcelas pagas além do novo total de parcelas.';
    end if;

    delete from public.pessoal_lancamentos where divida_id = v_id and status = 'Pendente';
    update public.pessoal_lancamentos
       set descricao = p_descricao, categoria_id = p_categoria_id
     where divida_id = v_id;
  end if;

  insert into public.pessoal_lancamentos
    (data, descricao, tipo, valor, status, categoria_id, divida_id, parcela_numero)
  select
    (p_primeira_parcela + make_interval(months => n - 1))::date,
    p_descricao,
    'Despesa',
    p_valor_parcela,
    case when p_id is null and n <= coalesce(p_parcelas_pagas, 0) then 'Pago' else 'Pendente' end,
    p_categoria_id,
    v_id,
    n
  from generate_series(1, p_total_parcelas) as n
  where not exists (
    select 1 from public.pessoal_lancamentos l
     where l.divida_id = v_id and l.parcela_numero = n
  );

  return v_id;
end;
$$;

revoke execute on function public.pessoal_salvar_divida(uuid, text, text, numeric, integer, date, uuid, text, integer)
  from public, anon;
grant execute on function public.pessoal_salvar_divida(uuid, text, text, numeric, integer, date, uuid, text, integer)
  to authenticated;
