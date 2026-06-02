-- Grupos de categoria (Plano de Contas)
CREATE TABLE public.grupos_categoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Receita','Despesa')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_categoria TO authenticated;
GRANT ALL ON public.grupos_categoria TO service_role;

ALTER TABLE public.grupos_categoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_grupos" ON public.grupos_categoria FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_grupos" ON public.grupos_categoria FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_grupos" ON public.grupos_categoria FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_grupos" ON public.grupos_categoria FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_grupos_categoria_updated_at
BEFORE UPDATE ON public.grupos_categoria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular categoria ao grupo
ALTER TABLE public.categorias ADD COLUMN grupo_id UUID REFERENCES public.grupos_categoria(id) ON DELETE SET NULL;