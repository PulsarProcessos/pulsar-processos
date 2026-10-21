import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Finanças pessoais (aba Pessoal). Tabelas pessoal_* no Supabase, separadas das da empresa.

// ============ TIPOS ============
export type TipoMov = "Receita" | "Despesa";
export type StatusPag = "Pago" | "Pendente";

export type CategoriaPessoal = { id: string; nome: string; tipo: TipoMov };

export type Renda = {
  id: string;
  descricao: string;
  valor: number;
  diaRecebimento?: number;
  ativa: boolean;
};

export type ContaFixa = {
  id: string;
  descricao: string;
  valor: number;
  diaVencimento: number;
  categoriaId?: string;
  inicio: string; // 1º dia do primeiro mês em que a conta vale (AAAA-MM-01)
  ativa: boolean;
};

export type Divida = {
  id: string;
  descricao: string;
  credor?: string;
  valorParcela: number;
  totalParcelas: number;
  primeiraParcela: string;
  categoriaId?: string;
  obs?: string;
};
export type DividaInput = Omit<Divida, "id"> & { parcelasPagas?: number };

export type LancamentoPessoal = {
  id: string;
  data: string;
  descricao: string;
  tipo: TipoMov;
  valor: number;
  status: StatusPag;
  categoriaId?: string;
  dividaId?: string;
  parcelaNumero?: number;
  contaFixaId?: string;
  competencia?: string;
  obs?: string;
};

// ============ DATAS E VALORES ============
export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const pad = (n: number) => String(n).padStart(2, "0");

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "AAAA-MM", usado para saber se uma data cai em um mês. */
export function chaveMes(ano: number, mes: number) {
  return `${ano}-${pad(mes)}`;
}

/** 1º dia do mês (AAAA-MM-01), formato das competências de contas fixas. */
export function competenciaDe(ano: number, mes: number) {
  return `${chaveMes(ano, mes)}-01`;
}

/** Data do dia informado no mês; dia 31 em um mês de 30 dias vira o último dia. */
export function dataNoMes(ano: number, mes: number, dia: number) {
  const ultimo = new Date(ano, mes, 0).getDate();
  return `${chaveMes(ano, mes)}-${pad(Math.min(dia, ultimo))}`;
}

export function formatarData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "mar/2026" */
export function formatarMesAno(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MESES_ABREV[m - 1]}/${y}`;
}

// ============ MAPEAMENTO ============
const num = (v: unknown) => Number(v ?? 0);
const opt = <T,>(v: T | null | undefined) => (v === null ? undefined : v);

const mapCategoria = (r: any): CategoriaPessoal => ({ id: r.id, nome: r.nome, tipo: r.tipo });
const mapRenda = (r: any): Renda => ({
  id: r.id, descricao: r.descricao, valor: num(r.valor),
  diaRecebimento: opt(r.dia_recebimento), ativa: r.ativa,
});
const mapContaFixa = (r: any): ContaFixa => ({
  id: r.id, descricao: r.descricao, valor: num(r.valor), diaVencimento: r.dia_vencimento,
  categoriaId: opt(r.categoria_id), inicio: r.inicio, ativa: r.ativa,
});
const mapDivida = (r: any): Divida => ({
  id: r.id, descricao: r.descricao, credor: opt(r.credor), valorParcela: num(r.valor_parcela),
  totalParcelas: r.total_parcelas, primeiraParcela: r.primeira_parcela,
  categoriaId: opt(r.categoria_id), obs: opt(r.obs),
});
const mapLanc = (r: any): LancamentoPessoal => ({
  id: r.id, data: r.data, descricao: r.descricao, tipo: r.tipo, valor: num(r.valor),
  status: r.status, categoriaId: opt(r.categoria_id), dividaId: opt(r.divida_id),
  parcelaNumero: opt(r.parcela_numero), contaFixaId: opt(r.conta_fixa_id),
  competencia: opt(r.competencia), obs: opt(r.obs),
});

const rendaToDb = (r: Partial<Renda>) => ({
  ...(r.descricao !== undefined && { descricao: r.descricao }),
  ...(r.valor !== undefined && { valor: r.valor }),
  ...(r.diaRecebimento !== undefined && { dia_recebimento: r.diaRecebimento || null }),
  ...(r.ativa !== undefined && { ativa: r.ativa }),
});
const contaFixaToDb = (c: Partial<ContaFixa>) => ({
  ...(c.descricao !== undefined && { descricao: c.descricao }),
  ...(c.valor !== undefined && { valor: c.valor }),
  ...(c.diaVencimento !== undefined && { dia_vencimento: c.diaVencimento }),
  ...(c.categoriaId !== undefined && { categoria_id: c.categoriaId || null }),
  ...(c.inicio !== undefined && { inicio: c.inicio }),
  ...(c.ativa !== undefined && { ativa: c.ativa }),
});
const lancToDb = (l: Partial<LancamentoPessoal>) => ({
  ...(l.data !== undefined && { data: l.data }),
  ...(l.descricao !== undefined && { descricao: l.descricao }),
  ...(l.tipo !== undefined && { tipo: l.tipo }),
  ...(l.valor !== undefined && { valor: l.valor }),
  ...(l.status !== undefined && { status: l.status }),
  ...(l.categoriaId !== undefined && { categoria_id: l.categoriaId || null }),
  ...(l.contaFixaId !== undefined && { conta_fixa_id: l.contaFixaId || null }),
  ...(l.competencia !== undefined && { competencia: l.competencia || null }),
  ...(l.obs !== undefined && { obs: l.obs || null }),
});

// ============ ESTADO ============
type Estado = {
  categorias: CategoriaPessoal[];
  rendas: Renda[];
  contasFixas: ContaFixa[];
  dividas: Divida[];
  lancamentos: LancamentoPessoal[];
  carregando: boolean;
};

type Ctx = Estado & {
  addCategoria: (c: Omit<CategoriaPessoal, "id">) => Promise<CategoriaPessoal | null>;
  updateCategoria: (id: string, nome: string) => Promise<boolean>;
  removeCategoria: (id: string) => Promise<void>;
  addRenda: (r: Omit<Renda, "id">) => Promise<Renda | null>;
  updateRenda: (id: string, r: Partial<Renda>) => Promise<boolean>;
  removeRenda: (id: string) => Promise<void>;
  addContaFixa: (c: Omit<ContaFixa, "id">) => Promise<ContaFixa | null>;
  updateContaFixa: (id: string, c: Partial<ContaFixa>) => Promise<boolean>;
  removeContaFixa: (id: string) => Promise<void>;
  pagarContaFixa: (c: ContaFixa, ano: number, mes: number) => Promise<boolean>;
  salvarDivida: (d: DividaInput, id?: string) => Promise<boolean>;
  removeDivida: (id: string) => Promise<void>;
  addLancamento: (l: Omit<LancamentoPessoal, "id">) => Promise<LancamentoPessoal | null>;
  updateLancamento: (id: string, l: Partial<LancamentoPessoal>) => Promise<boolean>;
  removeLancamento: (id: string) => Promise<void>;
};

const vazio: Estado = {
  categorias: [], rendas: [], contasFixas: [], dividas: [], lancamentos: [], carregando: true,
};

const PessoalContext = createContext<Ctx | null>(null);

function showError(prefix: string, err: any) {
  console.error(prefix, err);
  const mensagem = err?.code === "23505"
    ? "já existe um cadastro com esse nome"
    : (err?.message ?? "erro desconhecido");
  toast.error(`${prefix}: ${mensagem}`);
}

const ordenarLanc = (a: LancamentoPessoal, b: LancamentoPessoal) => b.data.localeCompare(a.data);

export function PessoalProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(vazio);
  // undefined = ainda não recebeu o primeiro evento de sessão.
  const usuarioAtual = useRef<string | null | undefined>(undefined);

  const buscarDividasELancamentos = async () => {
    const [div, lan] = await Promise.all([
      (supabase.from as any)("pessoal_dividas").select("*").order("created_at"),
      (supabase.from as any)("pessoal_lancamentos").select("*").order("data", { ascending: false }),
    ]);
    if (div.error || lan.error) showError("Erro ao carregar dívidas", div.error ?? lan.error);
    return {
      dividas: (div.data ?? []).map(mapDivida),
      lancamentos: (lan.data ?? []).map(mapLanc),
    };
  };

  const recarregar = useCallback(async (logado: boolean) => {
    if (!logado) { setEstado({ ...vazio, carregando: false }); return; }
    const [cat, ren, cf, resto] = await Promise.all([
      (supabase.from as any)("pessoal_categorias").select("*").order("nome"),
      (supabase.from as any)("pessoal_rendas").select("*").order("created_at"),
      (supabase.from as any)("pessoal_contas_fixas").select("*").order("dia_vencimento"),
      buscarDividasELancamentos(),
    ]);
    const erro = cat.error ?? ren.error ?? cf.error;
    if (erro) showError("Erro ao carregar dados pessoais", erro);
    setEstado({
      categorias: (cat.data ?? []).map(mapCategoria),
      rendas: (ren.data ?? []).map(mapRenda),
      contasFixas: (cf.data ?? []).map(mapContaFixa),
      ...resto,
      carregando: false,
    });
  }, []);

  useEffect(() => {
    // Recarrega só quando o usuário muda (a renovação do token a cada hora não precisa).
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      const id = session?.user.id ?? null;
      if (id === usuarioAtual.current) return;
      usuarioAtual.current = id;
      // Fora do callback: chamar o Supabase dentro dele pode travar a sessão.
      setTimeout(() => recarregar(id !== null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [recarregar]);

  // ---- Auxiliares genéricos ----
  async function inserir<T>(tabela: string, payload: any, map: (r: any) => T): Promise<T | null> {
    const { data, error } = await (supabase.from as any)(tabela).insert(payload).select().single();
    if (error) { showError("Erro ao salvar", error); return null; }
    return map(data);
  }
  async function atualizar<T>(tabela: string, id: string, payload: any, map: (r: any) => T): Promise<T | null> {
    const { data, error } = await (supabase.from as any)(tabela).update(payload).eq("id", id).select().single();
    if (error) { showError("Erro ao atualizar", error); return null; }
    return map(data);
  }
  async function excluir(tabela: string, id: string): Promise<boolean> {
    const { error } = await (supabase.from as any)(tabela).delete().eq("id", id);
    if (error) { showError("Erro ao excluir", error); return false; }
    return true;
  }
  const trocar = <T extends { id: string }>(lista: T[], novo: T) =>
    lista.map((x) => (x.id === novo.id ? novo : x));

  // ----- Categorias -----
  const addCategoria = useCallback(async (c: Omit<CategoriaPessoal, "id">) => {
    const nova = await inserir("pessoal_categorias", { nome: c.nome.trim(), tipo: c.tipo }, mapCategoria);
    if (nova) {
      setEstado((p) => ({
        ...p, categorias: [...p.categorias, nova].sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
    }
    return nova;
  }, []);
  const updateCategoria = useCallback(async (id: string, nome: string) => {
    const nova = await atualizar("pessoal_categorias", id, { nome: nome.trim() }, mapCategoria);
    if (nova) setEstado((p) => ({ ...p, categorias: trocar(p.categorias, nova) }));
    return !!nova;
  }, []);
  const removeCategoria = useCallback(async (id: string) => {
    if (!(await excluir("pessoal_categorias", id))) return;
    // No banco, quem usava a categoria fica sem categoria (on delete set null).
    const limpar = <T extends { categoriaId?: string }>(x: T) =>
      x.categoriaId === id ? { ...x, categoriaId: undefined } : x;
    setEstado((p) => ({
      ...p,
      categorias: p.categorias.filter((c) => c.id !== id),
      contasFixas: p.contasFixas.map(limpar),
      dividas: p.dividas.map(limpar),
      lancamentos: p.lancamentos.map(limpar),
    }));
  }, []);

  // ----- Rendas -----
  const addRenda = useCallback(async (r: Omit<Renda, "id">) => {
    const nova = await inserir("pessoal_rendas", rendaToDb(r), mapRenda);
    if (nova) setEstado((p) => ({ ...p, rendas: [...p.rendas, nova] }));
    return nova;
  }, []);
  const updateRenda = useCallback(async (id: string, r: Partial<Renda>) => {
    const nova = await atualizar("pessoal_rendas", id, rendaToDb(r), mapRenda);
    if (nova) setEstado((p) => ({ ...p, rendas: trocar(p.rendas, nova) }));
    return !!nova;
  }, []);
  const removeRenda = useCallback(async (id: string) => {
    if (await excluir("pessoal_rendas", id)) {
      setEstado((p) => ({ ...p, rendas: p.rendas.filter((r) => r.id !== id) }));
    }
  }, []);

  // ----- Contas fixas -----
  const addContaFixa = useCallback(async (c: Omit<ContaFixa, "id">) => {
    const nova = await inserir("pessoal_contas_fixas", contaFixaToDb(c), mapContaFixa);
    if (nova) {
      setEstado((p) => ({
        ...p, contasFixas: [...p.contasFixas, nova].sort((a, b) => a.diaVencimento - b.diaVencimento),
      }));
    }
    return nova;
  }, []);
  const updateContaFixa = useCallback(async (id: string, c: Partial<ContaFixa>) => {
    const nova = await atualizar("pessoal_contas_fixas", id, contaFixaToDb(c), mapContaFixa);
    if (nova) setEstado((p) => ({ ...p, contasFixas: trocar(p.contasFixas, nova) }));
    return !!nova;
  }, []);
  const removeContaFixa = useCallback(async (id: string) => {
    if (!(await excluir("pessoal_contas_fixas", id))) return;
    // Os meses já pagos continuam como lançamentos comuns (on delete set null).
    setEstado((p) => ({
      ...p,
      contasFixas: p.contasFixas.filter((c) => c.id !== id),
      lancamentos: p.lancamentos.map((l) => (l.contaFixaId === id ? { ...l, contaFixaId: undefined } : l)),
    }));
  }, []);
  const pagarContaFixa = useCallback(async (c: ContaFixa, ano: number, mes: number) => {
    const novo = await inserir("pessoal_lancamentos", lancToDb({
      data: dataNoMes(ano, mes, c.diaVencimento),
      descricao: c.descricao,
      tipo: "Despesa",
      valor: c.valor,
      status: "Pago",
      categoriaId: c.categoriaId,
      contaFixaId: c.id,
      competencia: competenciaDe(ano, mes),
    }), mapLanc);
    if (novo) setEstado((p) => ({ ...p, lancamentos: [novo, ...p.lancamentos].sort(ordenarLanc) }));
    return !!novo;
  }, []);

  // ----- Dívidas -----
  const salvarDivida = useCallback(async (d: DividaInput, id?: string) => {
    // A função no banco cria/atualiza a dívida e gera as parcelas numa transação só.
    const { error } = await (supabase.rpc as any)("pessoal_salvar_divida", {
      p_id: id ?? null,
      p_descricao: d.descricao.trim(),
      p_credor: d.credor ?? null,
      p_valor_parcela: d.valorParcela,
      p_total_parcelas: d.totalParcelas,
      p_primeira_parcela: d.primeiraParcela,
      p_categoria_id: d.categoriaId || null,
      p_obs: d.obs ?? null,
      p_parcelas_pagas: id ? 0 : (d.parcelasPagas ?? 0),
    });
    if (error) { showError("Erro ao salvar dívida", error); return false; }
    const resto = await buscarDividasELancamentos();
    setEstado((p) => ({ ...p, ...resto }));
    return true;
  }, []);
  const removeDivida = useCallback(async (id: string) => {
    // As parcelas são apagadas junto (on delete cascade).
    if (!(await excluir("pessoal_dividas", id))) return;
    setEstado((p) => ({
      ...p,
      dividas: p.dividas.filter((d) => d.id !== id),
      lancamentos: p.lancamentos.filter((l) => l.dividaId !== id),
    }));
  }, []);

  // ----- Lançamentos -----
  const addLancamento = useCallback(async (l: Omit<LancamentoPessoal, "id">) => {
    const novo = await inserir("pessoal_lancamentos", lancToDb(l), mapLanc);
    if (novo) setEstado((p) => ({ ...p, lancamentos: [novo, ...p.lancamentos].sort(ordenarLanc) }));
    return novo;
  }, []);
  const updateLancamento = useCallback(async (id: string, l: Partial<LancamentoPessoal>) => {
    const novo = await atualizar("pessoal_lancamentos", id, lancToDb(l), mapLanc);
    if (novo) {
      setEstado((p) => ({ ...p, lancamentos: trocar(p.lancamentos, novo).sort(ordenarLanc) }));
    }
    return !!novo;
  }, []);
  const removeLancamento = useCallback(async (id: string) => {
    if (await excluir("pessoal_lancamentos", id)) {
      setEstado((p) => ({ ...p, lancamentos: p.lancamentos.filter((l) => l.id !== id) }));
    }
  }, []);

  return (
    <PessoalContext.Provider
      value={{
        ...estado,
        addCategoria, updateCategoria, removeCategoria,
        addRenda, updateRenda, removeRenda,
        addContaFixa, updateContaFixa, removeContaFixa, pagarContaFixa,
        salvarDivida, removeDivida,
        addLancamento, updateLancamento, removeLancamento,
      }}
    >
      {children}
    </PessoalContext.Provider>
  );
}

export function usePessoal() {
  const ctx = useContext(PessoalContext);
  if (!ctx) throw new Error("usePessoal precisa estar dentro de PessoalProvider");
  return ctx;
}

// ============ RESUMO DAS DÍVIDAS ============
export type ResumoDivida = {
  parcelas: LancamentoPessoal[];
  pagas: number;
  total: number;
  percentual: number;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  proxima?: LancamentoPessoal;
  ultimaData?: string;
  emAtraso: boolean;
  quitada: boolean;
};

export function resumirDivida(d: Divida, lancamentos: LancamentoPessoal[]): ResumoDivida {
  const parcelas = lancamentos
    .filter((l) => l.dividaId === d.id)
    .sort((a, b) => (a.parcelaNumero ?? 0) - (b.parcelaNumero ?? 0));
  const pagas = parcelas.filter((p) => p.status === "Pago");
  const pendentes = parcelas.filter((p) => p.status === "Pendente");
  const total = d.totalParcelas;
  const valorTotal = parcelas.reduce((s, p) => s + p.valor, 0);
  const valorPago = pagas.reduce((s, p) => s + p.valor, 0);
  const hoje = hojeISO();
  return {
    parcelas,
    pagas: pagas.length,
    total,
    percentual: total > 0 ? Math.round((pagas.length / total) * 100) : 0,
    valorTotal,
    valorPago,
    valorRestante: valorTotal - valorPago,
    proxima: pendentes[0],
    ultimaData: parcelas[parcelas.length - 1]?.data,
    emAtraso: pendentes.some((p) => p.data < hoje),
    quitada: total > 0 && pagas.length >= total,
  };
}
