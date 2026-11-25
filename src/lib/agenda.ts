import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Agenda ligada ao Google Agenda. Os compromissos ficam no Google; o Pulsar lê e grava
// pela Edge Function "agenda" (supabase/functions/agenda), que guarda o acesso ao Google.

export type TipoCompromisso = "pessoal" | "empreendedor";

export const TIPOS_COMPROMISSO: { valor: TipoCompromisso; nome: string; ponto: string; cartao: string }[] = [
  {
    valor: "pessoal",
    nome: "Pessoal",
    ponto: "bg-blue-500",
    cartao: "border-l-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-100",
  },
  {
    valor: "empreendedor",
    nome: "Empreendedor",
    ponto: "bg-orange-500",
    cartao: "border-l-orange-500 bg-orange-500/10 text-orange-900 dark:text-orange-100",
  },
];
export const estiloTipo = (t: TipoCompromisso) => TIPOS_COMPROMISSO.find((x) => x.valor === t)!;

export type Compromisso = {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  diaInteiro: boolean;
  /** Dia inteiro: AAAA-MM-DD. Com horário: data e hora com fuso (ex.: 2026-11-07T14:00:00-03:00). */
  inicio: string;
  /** Dia inteiro: dia seguinte ao último dia (como o Google guarda). */
  fim: string;
  local: string | null;
  descricao: string | null;
  avisoMin: number | null;
  link: string | null;
  recorrente: boolean;
};

export type CompromissoEntrada = {
  id?: string;
  tipoAnterior?: TipoCompromisso;
  tipo: TipoCompromisso;
  titulo: string;
  diaInteiro: boolean;
  dataInicio: string;
  horaInicio?: string;
  dataFim: string;
  horaFim?: string;
  local?: string;
  descricao?: string;
  avisoMin: number | null;
};

export const AVISOS: { valor: string; nome: string }[] = [
  { valor: "nenhum", nome: "Sem aviso" },
  { valor: "0", nome: "Na hora" },
  { valor: "10", nome: "10 minutos antes" },
  { valor: "30", nome: "30 minutos antes" },
  { valor: "60", nome: "1 hora antes" },
  { valor: "1440", nome: "1 dia antes" },
];

export class ErroAgenda extends Error {
  constructor(mensagem: string, public reconectar = false) {
    super(mensagem);
  }
}

async function chamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("agenda", { body });
  if (error) {
    let mensagem = "Não foi possível falar com a agenda. Tente de novo.";
    let reconectar = false;
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (corpo?.erro) mensagem = corpo.erro;
      reconectar = !!corpo?.reconectar;
    }
    throw new ErroAgenda(mensagem, reconectar);
  }
  return data as T;
}

// ============ DATAS (fuso de São Paulo) ============
const FUSO = "America/Sao_Paulo";
const formatoPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Data (AAAA-MM-DD) e hora (HH:MM) de um horário, no fuso de São Paulo. */
export function partes(iso: string): { data: string; hora: string } {
  if (iso.length === 10) return { data: iso, hora: "00:00" };
  const p = Object.fromEntries(formatoPartes.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Primeiro e último dia (inclusive) em que o compromisso aparece. */
export function periodo(c: Compromisso): { de: string; ate: string } {
  if (c.diaInteiro) return { de: c.inicio, ate: somarDias(c.fim, -1) };
  const ini = partes(c.inicio);
  const fim = partes(c.fim);
  // Terminar exatamente à meia-noite não ocupa o dia seguinte.
  const ate = fim.hora === "00:00" && fim.data > ini.data ? somarDias(fim.data, -1) : fim.data;
  return { de: ini.data, ate };
}

export function textoAviso(min: number) {
  if (min === 0) return "aviso na hora";
  if (min % 1440 === 0) return min === 1440 ? "aviso 1 dia antes" : `aviso ${min / 1440} dias antes`;
  if (min % 60 === 0) return `aviso ${min / 60}h antes`;
  return `aviso ${min} min antes`;
}

export function horario(c: Compromisso) {
  if (c.diaInteiro) return "Dia inteiro";
  return `${partes(c.inicio).hora} – ${partes(c.fim).hora}`;
}

// ============ CONSULTAS ============
type Status = { configurado: boolean; conectado: boolean; email: string | null };

export function useStatusAgenda() {
  return useQuery({
    queryKey: ["agenda", "status"],
    queryFn: () => chamar<Status>({ acao: "status" }),
  });
}

export function useCompromissos(inicio: string, fim: string, ativo: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["agenda", "lista", inicio, fim],
    enabled: ativo,
    queryFn: async () => {
      try {
        return (await chamar<{ compromissos: Compromisso[] }>({ acao: "listar", inicio, fim })).compromissos;
      } catch (e) {
        if (e instanceof ErroAgenda && e.reconectar) qc.invalidateQueries({ queryKey: ["agenda", "status"] });
        throw e;
      }
    },
    // Atualiza ao voltar para a tela, para mostrar o que foi mudado direto no Google.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: false,
  });
}

export function useSalvarCompromisso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: CompromissoEntrada) => chamar<{ compromisso: Compromisso }>({ acao: "salvar", ...c }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
  });
}

export function useExcluirCompromisso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: Pick<Compromisso, "id" | "tipo">) => chamar({ acao: "excluir", id: c.id, tipo: c.tipo }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
  });
}

export async function urlConectarGoogle() {
  const { url } = await chamar<{ url: string }>({ acao: "conectar", origem: window.location.origin });
  return url;
}

export function useDesconectarGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chamar({ acao: "desconectar" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
  });
}
