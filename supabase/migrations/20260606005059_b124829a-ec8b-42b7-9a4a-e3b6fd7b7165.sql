
ALTER TABLE public.transferencias ADD COLUMN IF NOT EXISTS afeta_fatura boolean NOT NULL DEFAULT false;
UPDATE public.transferencias SET afeta_fatura = true;
ALTER TABLE public.transferencias ALTER COLUMN afeta_fatura SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.pagamentos_fatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cartao_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE RESTRICT,
  conta_origem_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE RESTRICT,
  data date NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  descricao text,
  competencia_ref date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cartao_id <> conta_origem_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_fatura TO authenticated;
GRANT ALL ON public.pagamentos_fatura TO service_role;

ALTER TABLE public.pagamentos_fatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.pagamentos_fatura FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.pagamentos_fatura FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.pagamentos_fatura FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.pagamentos_fatura FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER pagamentos_fatura_updated_at
  BEFORE UPDATE ON public.pagamentos_fatura
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura_cartao ON public.pagamentos_fatura(cartao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura_user ON public.pagamentos_fatura(user_id);
