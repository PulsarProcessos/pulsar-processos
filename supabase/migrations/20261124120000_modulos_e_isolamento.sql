-- Sistema com várias pessoas: módulos liberados por usuário e isolamento total entre usuários.
--
-- 1. modulos_usuario: quais módulos (empreendedor, pessoal) cada pessoa pode usar. Só o
--    administrador altera, pela Edge Function "usuarios"; a pessoa só lê os próprios.
-- 2. private.tem_modulo(): usada nas regras de acesso. Usuário bloqueado perde o acesso na hora,
--    sem esperar o login vencer.
-- 3. Regras de acesso refeitas em todas as tabelas: só os próprios registros e só do módulo
--    liberado. Visitante sem login não tem nenhuma permissão.
-- 4. Ligações entre tabelas passam a incluir o dono (id, user_id): o banco recusa apontar para
--    um registro de outra pessoa.
-- 5. user_id ligado a auth.users com cascade: excluir uma pessoa apaga tudo dela.

-- ============ 1. MÓDULOS ============
create table public.modulos_usuario (
  user_id uuid not null references auth.users(id) on delete cascade,
  modulo text not null check (modulo in ('empreendedor', 'pessoal')),
  created_at timestamptz not null default now(),
  primary key (user_id, modulo)
);
alter table public.modulos_usuario enable row level security;
revoke all on public.modulos_usuario from anon, authenticated, public;
grant select on public.modulos_usuario to authenticated;
grant all on public.modulos_usuario to service_role;
create policy dono_le on public.modulos_usuario for select to authenticated
  using ((select auth.uid()) = user_id);

-- ============ 2. CHECAGEM DE MÓDULO ============
-- Fica fora do schema public (não é exposta pela API). Security definer para poder ler
-- modulos_usuario e auth.users; só responde sobre o próprio usuário que está chamando.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.tem_modulo(p_modulo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.modulos_usuario m
      join auth.users u on u.id = m.user_id
     where m.user_id = (select auth.uid())
       and m.modulo = p_modulo
       and (u.banned_until is null or u.banned_until <= now())
  );
$$;
revoke all on function private.tem_modulo(text) from public, anon;
grant execute on function private.tem_modulo(text) to authenticated, service_role;

-- Quem já é administrador continua com tudo.
insert into public.modulos_usuario (user_id, modulo)
select u.id, m.modulo
  from auth.users u
 cross join (values ('empreendedor'), ('pessoal')) as m(modulo)
 where u.raw_app_meta_data ->> 'role' = 'admin'
on conflict do nothing;

-- ============ 3. DADOS SEM DONO, ÍNDICES E LIGAÇÃO COM O USUÁRIO ============
do $$
declare
  t text;
begin
  foreach t in array array[
    'bancos', 'campanhas', 'categorias', 'clientes', 'contatos', 'deals', 'etapas_pipeline',
    'eventos', 'fornecedores', 'grupos_categoria', 'lancamento_rateios', 'lancamentos', 'leads',
    'pagamentos_fatura', 'produtos', 'profiles', 'transferencias'
  ] loop
    -- Registros de usuários que já foram excluídos (ninguém mais consegue vê-los).
    execute format('delete from public.%I x where not exists (select 1 from auth.users u where u.id = x.user_id)', t);
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
      t, t || '_user_id_fkey');
  end loop;
end $$;

create index if not exists idx_bancos_user on public.bancos (user_id);
create index if not exists idx_grupos_categoria_user on public.grupos_categoria (user_id);
create index if not exists idx_produtos_user on public.produtos (user_id);
create index if not exists idx_transferencias_user on public.transferencias (user_id);

-- ============ 4. LIGAÇÕES SÓ ENTRE REGISTROS DO MESMO DONO ============
do $$
declare
  t text;
begin
  foreach t in array array[
    'bancos', 'categorias', 'clientes', 'contatos', 'fornecedores', 'grupos_categoria',
    'lancamentos', 'produtos', 'pessoal_categorias', 'pessoal_contas_fixas', 'pessoal_dividas'
  ] loop
    execute format('alter table public.%I add constraint %I unique (id, user_id)', t, t || '_id_user_id_key');
  end loop;
end $$;

do $$
declare
  r record;
  antiga text;
begin
  for r in
    select * from (values
      ('categorias', 'grupo_id', 'grupos_categoria', 'set null'),
      ('deals', 'produto_id', 'produtos', 'set null'),
      ('lancamento_rateios', 'categoria_id', 'categorias', 'set null'),
      ('lancamento_rateios', 'lancamento_id', 'lancamentos', 'cascade'),
      ('lancamentos', 'banco_id', 'bancos', 'set null'),
      ('lancamentos', 'categoria_id', 'categorias', 'set null'),
      ('lancamentos', 'cliente_id', 'clientes', 'set null'),
      ('lancamentos', 'contato_id', 'contatos', 'set null'),
      ('lancamentos', 'fornecedor_id', 'fornecedores', 'set null'),
      ('metas', 'categoria_id', 'categorias', 'cascade'),
      ('pagamentos_fatura', 'cartao_id', 'bancos', 'restrict'),
      ('pagamentos_fatura', 'conta_origem_id', 'bancos', 'restrict'),
      ('pessoal_contas_fixas', 'categoria_id', 'pessoal_categorias', 'set null'),
      ('pessoal_dividas', 'categoria_id', 'pessoal_categorias', 'set null'),
      ('pessoal_lancamentos', 'categoria_id', 'pessoal_categorias', 'set null'),
      ('pessoal_lancamentos', 'conta_fixa_id', 'pessoal_contas_fixas', 'set null'),
      ('pessoal_lancamentos', 'divida_id', 'pessoal_dividas', 'cascade'),
      ('transferencias', 'banco_destino_id', 'bancos', 'restrict'),
      ('transferencias', 'banco_origem_id', 'bancos', 'restrict')
    ) as v(filho, coluna, pai, acao)
  loop
    select c.conname into antiga
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.conrelid = format('public.%I', r.filho)::regclass
       and array_length(c.conkey, 1) = 1
       and a.attname = r.coluna;
    if antiga is not null then
      execute format('alter table public.%I drop constraint %I', r.filho, antiga);
    end if;
    -- "set null (coluna)" apaga só a ligação e mantém o user_id.
    execute format(
      'alter table public.%I add constraint %I foreign key (%I, user_id) references public.%I (id, user_id) on delete %s',
      r.filho, r.filho || '_' || r.coluna || '_dono_fkey', r.coluna, r.pai,
      case r.acao when 'set null' then format('set null (%I)', r.coluna) else r.acao end);
  end loop;
end $$;

-- ============ 5. REGRAS DE ACESSO ============
do $$
declare
  r record;
  p record;
  condicao text;
begin
  for r in
    select * from (values
      ('bancos', 'empreendedor'), ('campanhas', 'empreendedor'), ('categorias', 'empreendedor'),
      ('clientes', 'empreendedor'), ('contatos', 'empreendedor'), ('deals', 'empreendedor'),
      ('etapas_pipeline', 'empreendedor'), ('eventos', 'empreendedor'), ('fornecedores', 'empreendedor'),
      ('grupos_categoria', 'empreendedor'), ('lancamento_rateios', 'empreendedor'),
      ('lancamentos', 'empreendedor'), ('leads', 'empreendedor'), ('metas', 'empreendedor'),
      ('pagamentos_fatura', 'empreendedor'), ('produtos', 'empreendedor'), ('transferencias', 'empreendedor'),
      ('pessoal_categorias', 'pessoal'), ('pessoal_contas_fixas', 'pessoal'), ('pessoal_dividas', 'pessoal'),
      ('pessoal_lancamentos', 'pessoal'), ('pessoal_rendas', 'pessoal'),
      ('profiles', null)
    ) as v(tabela, modulo)
  loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = r.tabela loop
      execute format('drop policy %I on public.%I', p.policyname, r.tabela);
    end loop;
    execute format('revoke all on public.%I from anon, public', r.tabela);
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.tabela);

    condicao := '(select auth.uid()) = user_id'
      || case when r.modulo is null then '' else format(' and (select private.tem_modulo(%L))', r.modulo) end;
    execute format('create policy dono_le on public.%I for select to authenticated using (%s)', r.tabela, condicao);
    execute format('create policy dono_cria on public.%I for insert to authenticated with check (%s)', r.tabela, condicao);
    execute format('create policy dono_altera on public.%I for update to authenticated using (%s) with check (%s)',
      r.tabela, condicao, condicao);
    execute format('create policy dono_apaga on public.%I for delete to authenticated using (%s)', r.tabela, condicao);
  end loop;
end $$;
