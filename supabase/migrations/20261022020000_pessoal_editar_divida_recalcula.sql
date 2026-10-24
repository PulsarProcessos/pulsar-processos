-- Ao editar uma dívida, todas as parcelas passam a seguir o novo valor e as novas datas.
-- Antes, as parcelas já pagas ficavam com o valor e a data antigos, o que deixava o total
-- errado quando a edição era para corrigir um valor digitado errado.
-- O que já foi pago continua marcado como pago (pelo número da parcela).
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

    delete from public.pessoal_lancamentos
     where divida_id = v_id and parcela_numero > p_total_parcelas;

    update public.pessoal_lancamentos l
       set data = (p_primeira_parcela + make_interval(months => l.parcela_numero - 1))::date,
           valor = p_valor_parcela,
           descricao = p_descricao,
           categoria_id = p_categoria_id
     where l.divida_id = v_id;
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
