
-- Add credit card support to bancos
ALTER TABLE public.bancos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Conta',
  ADD COLUMN IF NOT EXISTS fechamento_dia INTEGER,
  ADD COLUMN IF NOT EXISTS vencimento_dia INTEGER,
  ADD COLUMN IF NOT EXISTS limite NUMERIC;

-- Metas mensais por categoria
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, categoria_id, mes, ano)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own metas" ON public.metas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own metas" ON public.metas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own metas" ON public.metas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own metas" ON public.metas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
