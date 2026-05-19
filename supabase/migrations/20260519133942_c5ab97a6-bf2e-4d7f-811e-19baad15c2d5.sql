-- Tabela de Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  obs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.clientes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clientes_user ON public.clientes(user_id);

-- Tabela de Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  obs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.fornecedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.fornecedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.fornecedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.fornecedores FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fornecedores_user ON public.fornecedores(user_id);

-- Vincular lançamentos a cliente (receita) ou fornecedor (despesa)
ALTER TABLE public.lancamentos
  ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;

CREATE INDEX idx_lancamentos_cliente ON public.lancamentos(cliente_id);
CREATE INDEX idx_lancamentos_fornecedor ON public.lancamentos(fornecedor_id);