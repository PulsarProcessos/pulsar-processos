
-- 1) PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
SELECT u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'avatar_url',
  u.email
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- 2) BANCOS
CREATE TABLE public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  agencia text,
  conta text,
  saldo_inicial numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.bancos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.bancos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.bancos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.bancos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER bancos_updated_at BEFORE UPDATE ON public.bancos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) PRODUTOS
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  preco numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.produtos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.produtos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.produtos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.produtos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) ETAPAS PIPELINE (per-user customizable stages)
CREATE TABLE public.etapas_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
ALTER TABLE public.etapas_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.etapas_pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.etapas_pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.etapas_pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.etapas_pipeline FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER etapas_pipeline_updated_at BEFORE UPDATE ON public.etapas_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Change deals.stage from enum to text so user can have custom stages
ALTER TABLE public.deals ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE public.deals ALTER COLUMN stage TYPE text USING stage::text;
ALTER TABLE public.deals ALTER COLUMN stage SET DEFAULT 'Lead';

-- 6) Add banco_id to lancamentos and produto_id to deals
ALTER TABLE public.lancamentos
  ADD COLUMN banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;

ALTER TABLE public.deals
  ADD COLUMN produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;

-- 7) TRANSFERENCIAS
CREATE TABLE public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  banco_origem_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE RESTRICT,
  banco_destino_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE RESTRICT,
  valor numeric NOT NULL CHECK (valor > 0),
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (banco_origem_id <> banco_destino_id)
);
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.transferencias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.transferencias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.transferencias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.transferencias FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER transferencias_updated_at BEFORE UPDATE ON public.transferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
