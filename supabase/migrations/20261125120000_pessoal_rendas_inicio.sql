-- Rendas passam a ter "desde quando" (como as contas fixas), para o Painel do Pessoal não
-- contar uma renda em meses anteriores a ela. As já cadastradas começam no mês do cadastro.
alter table public.pessoal_rendas
  add column inicio date not null default date_trunc('month', current_date)::date
    check (extract(day from inicio) = 1);

update public.pessoal_rendas
   set inicio = date_trunc('month', created_at at time zone 'America/Sao_Paulo')::date;
