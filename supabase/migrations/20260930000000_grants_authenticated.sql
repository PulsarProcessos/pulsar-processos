-- As tabelas das primeiras migrations foram criadas sem GRANT explícito e dependiam
-- dos privilégios padrão do projeto Lovable. Em projetos Supabase novos isso não é
-- garantido; o acesso continua restrito ao próprio usuário pelas políticas de RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.contatos,
  public.categorias,
  public.lancamentos,
  public.deals,
  public.leads,
  public.campanhas,
  public.eventos,
  public.clientes,
  public.fornecedores,
  public.profiles,
  public.bancos,
  public.produtos,
  public.etapas_pipeline,
  public.transferencias
TO authenticated;

GRANT ALL ON
  public.contatos,
  public.categorias,
  public.lancamentos,
  public.deals,
  public.leads,
  public.campanhas,
  public.eventos,
  public.clientes,
  public.fornecedores,
  public.profiles,
  public.bancos,
  public.produtos,
  public.etapas_pipeline,
  public.transferencias
TO service_role;
