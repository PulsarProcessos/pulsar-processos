-- Enums
CREATE TYPE public.contato_tipo AS ENUM ('Cliente', 'Fornecedor');
CREATE TYPE public.movimento_tipo AS ENUM ('Receita', 'Despesa');
CREATE TYPE public.lancamento_status AS ENUM ('Pago', 'Pendente');
CREATE TYPE public.deal_stage AS ENUM ('Lead', 'Qualificado', 'Proposta Enviada', 'Negociação', 'Ganho', 'Perdido');
CREATE TYPE public.lead_status AS ENUM ('Novo', 'Contatado', 'Qualificado', 'Convertido', 'Perdido');
CREATE TYPE public.campanha_status AS ENUM ('Ativa', 'Pausada', 'Encerrada');
CREATE TYPE public.evento_tipo AS ENUM ('Postagem', 'Atividade', 'Reunião');

-- Trigger function para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ CONTATOS (Clientes e Fornecedores) ============
CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo public.contato_tipo NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  obs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.contatos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.contatos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.contatos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.contatos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_contatos_updated BEFORE UPDATE ON public.contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_contatos_user ON public.contatos(user_id);
CREATE INDEX idx_contatos_tipo ON public.contatos(tipo);

-- ============ CATEGORIAS (Plano de contas) ============
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo public.movimento_tipo NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.categorias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.categorias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.categorias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.categorias FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_categorias_user ON public.categorias(user_id);

-- ============ LANCAMENTOS (Movimentações financeiras) ============
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  tipo public.movimento_tipo NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  status public.lancamento_status NOT NULL DEFAULT 'Pendente',
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.lancamentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.lancamentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.lancamentos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.lancamentos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_lancamentos_user ON public.lancamentos(user_id);
CREATE INDEX idx_lancamentos_tipo ON public.lancamentos(tipo);
CREATE INDEX idx_lancamentos_data ON public.lancamentos(data);

-- ============ DEALS (Pipeline comercial) ============
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente TEXT NOT NULL,
  titulo TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  dias INTEGER NOT NULL DEFAULT 0,
  probabilidade INTEGER NOT NULL DEFAULT 0,
  stage public.deal_stage NOT NULL DEFAULT 'Lead',
  contato TEXT,
  email TEXT,
  obs TEXT,
  origem_lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.deals FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deals_user ON public.deals(user_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);

-- ============ LEADS (Marketing) ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  origem TEXT,
  status public.lead_status NOT NULL DEFAULT 'Novo',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  obs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.leads FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(status);

-- ============ CAMPANHAS (Marketing) ============
CREATE TABLE public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  canal TEXT NOT NULL,
  orcamento NUMERIC(14,2) NOT NULL DEFAULT 0,
  inicio DATE,
  fim DATE,
  leads INTEGER NOT NULL DEFAULT 0,
  status public.campanha_status NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.campanhas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.campanhas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.campanhas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.campanhas FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_campanhas_updated BEFORE UPDATE ON public.campanhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_campanhas_user ON public.campanhas(user_id);

-- ============ EVENTOS (Calendário de marketing) ============
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  tipo public.evento_tipo NOT NULL,
  canal TEXT,
  obs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.eventos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.eventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.eventos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.eventos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_eventos_updated BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_eventos_user ON public.eventos(user_id);
CREATE INDEX idx_eventos_data ON public.eventos(data);