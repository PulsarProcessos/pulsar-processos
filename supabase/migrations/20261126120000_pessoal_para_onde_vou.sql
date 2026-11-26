-- Pessoal: bens (parte 1 "Onde estou") e a parte 3 "Para onde vou".
--
-- 1. pessoal_destinos: como a pessoa divide o que entra no mês (percentuais). O destino "padrão"
--    recebe todo gasto cuja categoria não aponta para outro destino (contas e dia a dia).
-- 2. pessoal_categorias.destino_id: liga uma categoria de gasto a um destino (ex.: "Lazer" →
--    "Aproveitar a vida"), para comparar o planejado com o usado no mês.
-- 3. pessoal_bens: bens e investimentos; patrimônio = bens − o que falta pagar das dívidas.
-- 4. pessoal_metas: sonhos (valor a juntar) e metas de renda mensal ou de patrimônio, com prazo.
-- 5. pessoal_meta_passos: plano de ação de cada meta (passos com data, marcados quando feitos).
-- 6. pessoal_usar_divisao_sugerida(): cria a divisão sugerida e as categorias ligadas a ela.
--
-- Mesmo modelo de isolamento das outras tabelas: cada pessoa só lê e altera o que é dela, só com o
-- módulo Pessoal liberado, e as ligações só aceitam registros do mesmo dono.

-- ============ 1. DESTINOS DA RENDA ============
create table public.pessoal_destinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 60),
  percentual numeric(5,2) not null default 0 check (percentual between 0 and 100),
  padrao boolean not null default false,
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome),
  unique (id, user_id)
);
-- No máximo um destino padrão por pessoa.
create unique index uq_pessoal_destinos_padrao on public.pessoal_destinos (user_id) where padrao;

-- ============ 2. CATEGORIA → DESTINO ============
alter table public.pessoal_categorias add column destino_id uuid;
alter table public.pessoal_categorias
  add constraint pessoal_categorias_destino_id_dono_fkey
  foreign key (destino_id, user_id) references public.pessoal_destinos (id, user_id)
  on delete set null (destino_id);
create index idx_pessoal_categorias_destino on public.pessoal_categorias (destino_id);

-- ============ 3. BENS E INVESTIMENTOS ============
create table public.pessoal_bens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 120),
  -- investimento: aplicação, poupança, ações... | rende: bem que traz dinheiro (imóvel alugado)
  -- uso: bem que a pessoa usa e que gera despesa (casa onde mora, carro)
  tipo text not null check (tipo in ('investimento', 'rende', 'uso')),
  valor numeric(14,2) not null check (valor >= 0),
  rentabilidade_anual numeric(6,2) check (rentabilidade_anual between -100 and 1000),
  obs text check (length(obs) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pessoal_bens_user on public.pessoal_bens (user_id);

-- ============ 4. METAS E SONHOS ============
create table public.pessoal_metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('sonho', 'renda', 'patrimonio')),
  titulo text not null check (length(trim(titulo)) between 1 and 120),
  valor_alvo numeric(14,2) not null check (valor_alvo > 0),
  prazo date not null,
  -- Quanto já foi juntado (só sonhos; renda e patrimônio são calculados dos cadastros).
  guardado numeric(14,2) not null default 0 check (guardado >= 0),
  concluida boolean not null default false,
  obs text check (length(obs) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index idx_pessoal_metas_user on public.pessoal_metas (user_id);

-- ============ 5. PLANO DE AÇÃO ============
create table public.pessoal_meta_passos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id uuid not null,
  descricao text not null check (length(trim(descricao)) between 1 and 200),
  quando date,
  feito boolean not null default false,
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pessoal_meta_passos_meta_id_dono_fkey
    foreign key (meta_id, user_id) references public.pessoal_metas (id, user_id) on delete cascade
);
create index idx_pessoal_meta_passos_user on public.pessoal_meta_passos (user_id);
create index idx_pessoal_meta_passos_meta on public.pessoal_meta_passos (meta_id);

-- ============ updated_at ============
create trigger trg_pessoal_destinos_updated before update on public.pessoal_destinos
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_bens_updated before update on public.pessoal_bens
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_metas_updated before update on public.pessoal_metas
  for each row execute function public.update_updated_at_column();
create trigger trg_pessoal_meta_passos_updated before update on public.pessoal_meta_passos
  for each row execute function public.update_updated_at_column();

-- ============ ACESSO (RLS) ============
do $$
declare
  t text;
  condicao constant text := '(select auth.uid()) = user_id and (select private.tem_modulo(''pessoal''))';
begin
  foreach t in array array['pessoal_destinos', 'pessoal_bens', 'pessoal_metas', 'pessoal_meta_passos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy dono_le on public.%I for select to authenticated using (%s)', t, condicao);
    execute format('create policy dono_cria on public.%I for insert to authenticated with check (%s)', t, condicao);
    execute format('create policy dono_altera on public.%I for update to authenticated using (%s) with check (%s)',
      t, condicao, condicao);
    execute format('create policy dono_apaga on public.%I for delete to authenticated using (%s)', t, condicao);
  end loop;
end $$;

-- ============ 6. DIVISÃO SUGERIDA ============
-- Roda com as permissões de quem chama (security invoker): as regras de acesso valem normalmente.
-- Cria os destinos e as categorias de gasto ligadas a eles; categoria com o mesmo nome que já
-- existe é só ligada ao destino.
create or replace function public.pessoal_usar_divisao_sugerida()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  d record;
  v_destino uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar conectado.';
  end if;
  if exists (select 1 from public.pessoal_destinos where user_id = v_user) then
    raise exception 'A divisão da renda já foi criada.';
  end if;
  for d in
    select * from (values
      (1, 'Contas e dia a dia', 60, true, null),
      (2, 'Investir', 15, false, 'Investimentos'),
      (3, 'Sonhos', 10, false, 'Guardado para sonhos'),
      (4, 'Aproveitar a vida', 10, false, 'Lazer'),
      (5, 'Reserva para imprevistos', 5, false, 'Reserva')
    ) as v(ordem, nome, percentual, padrao, categoria)
  loop
    insert into public.pessoal_destinos (user_id, nome, percentual, padrao, ordem)
    values (v_user, d.nome, d.percentual, d.padrao, d.ordem)
    returning id into v_destino;
    if d.categoria is not null then
      insert into public.pessoal_categorias (user_id, nome, tipo, destino_id)
      values (v_user, d.categoria, 'Despesa', v_destino)
      on conflict (user_id, tipo, nome) do update set destino_id = excluded.destino_id;
    end if;
  end loop;
end;
$$;
revoke all on function public.pessoal_usar_divisao_sugerida() from public, anon;
grant execute on function public.pessoal_usar_divisao_sugerida() to authenticated;
