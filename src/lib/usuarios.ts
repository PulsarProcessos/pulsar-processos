import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Módulo Administração. Criar contas, trocar senha de outras pessoas, bloquear e excluir
// precisam da chave secreta do Supabase, por isso passam pela Edge Function "usuarios".

export type ModuloLiberavel = "empreendedor" | "pessoal";
export const MODULOS_LIBERAVEIS: ModuloLiberavel[] = ["empreendedor", "pessoal"];

export type Usuario = {
  id: string;
  email: string;
  nome: string | null;
  ultimo_acesso: string | null;
  criado_em: string;
  admin: boolean;
  bloqueado: boolean;
  modulos: ModuloLiberavel[];
};

export const SENHA_MIN = 8;

export async function chamarUsuarios<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("usuarios", { body });
  if (error) {
    let mensagem = "Não foi possível falar com o servidor. Tente novamente.";
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (corpo?.erro) mensagem = corpo.erro;
    }
    throw new Error(mensagem);
  }
  return data as T;
}

export function mensagemErroSenha(codigo: string | undefined) {
  if (codigo === "same_password") return "A nova senha precisa ser diferente da atual.";
  if (codigo === "weak_password") return "Senha fraca. Use letras, números e símbolos.";
  return "Não foi possível alterar a senha.";
}

/** Senha forte e fácil de ditar: sem letras que se confundem (l, I, O, 0). */
export function gerarSenha() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "Pulsar-" + Array.from(bytes, (b) => letras[b % letras.length]).join("");
}

const CHAVE = ["usuarios"];

export function useUsuarios() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => chamarUsuarios<{ admin: boolean; usuarios: Usuario[] }>({ acao: "listar" }),
  });
}

function useAcaoAdmin<E>(montar: (e: E) => Record<string, unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (e: E) => chamarUsuarios<{ ok: true }>(montar(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export const useCriarUsuario = () =>
  useAcaoAdmin((e: { nome: string; email: string; senha: string; modulos: ModuloLiberavel[] }) => ({ acao: "criar", ...e }));

export const useAlterarModulos = () =>
  useAcaoAdmin((e: { user_id: string; modulos: ModuloLiberavel[] }) => ({ acao: "modulos", ...e }));

export const useBloquearUsuario = () =>
  useAcaoAdmin((e: { user_id: string; bloquear: boolean }) => ({ acao: "bloquear", ...e }));

export const useExcluirUsuario = () =>
  useAcaoAdmin((e: { user_id: string }) => ({ acao: "excluir", ...e }));
