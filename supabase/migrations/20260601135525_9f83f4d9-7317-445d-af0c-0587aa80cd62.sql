
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS parcela_grupo_id uuid,
  ADD COLUMN IF NOT EXISTS parcela_numero integer,
  ADD COLUMN IF NOT EXISTS parcela_total integer;

CREATE INDEX IF NOT EXISTS idx_lancamentos_parcela_grupo ON public.lancamentos(parcela_grupo_id);

CREATE TABLE IF NOT EXISTS public.lancamento_rateios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  percentual numeric(7,4),
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_rateios TO authenticated;
GRANT ALL ON public.lancamento_rateios TO service_role;

ALTER TABLE public.lancamento_rateios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.lancamento_rateios FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.lancamento_rateios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.lancamento_rateios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.lancamento_rateios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rateios_lanc ON public.lancamento_rateios(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_rateios_user ON public.lancamento_rateios(user_id);
