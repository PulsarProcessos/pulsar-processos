import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Finanças pessoais (aba Pessoal). Tabelas pessoal_* no Supabase, separadas das da empresa.

// ============ TIPOS ============
export type TipoMov = "Receita" | "Despesa";
export type StatusPag = "Pago" | "Pendente";

/** destinoId: para qual destino da divisão da renda os gastos desta categoria contam. */
export type CategoriaPessoal = { id: string; nome: string; tipo: TipoMov; destinoId?: string };

/** Parte da renda do mês reservada para um fim (ex.: Investir 15%). */
export type Destino = {
  id: string;
  nome: string;
  percentual: number;
  /** Recebe os gastos cuja categoria não aponta para outro destino (contas e dia a dia). */
  padrao: boolean;
  ordem: number;
};
export type DestinoInput = Omit<Destino, "id"> & { id?: string };

export type TipoBem = "investimento" | "rende" | "uso";
export type Bem = {
  id: string;
  nome: string;
  tipo: TipoBem;
  valor: number;
  rentabilidadeAnual?: number;
  obs?: string;
  /** Data (AAAA-MM-DD) da última alteração, para a pessoa saber se o valor está atualizado. */
  atualizadoEm: string;
};

export type TipoMeta = "sonho" | "renda" | "patrimonio";
export type MetaPessoal = {
  id: string;
  tipo: TipoMeta;
  titulo: string;
  valorAlvo: number;
  prazo: string;
  /** Quanto já foi juntado (só sonhos). */
  guardado: number;
  concluida: boolean;
  obs?: string;
};
export type PassoMeta = {
  id: string;
  metaId: string;
  descricao: string;
  quando?: string;
  feito: boolean;
  ordem: number;
};

export type Renda = {
  id: string;
  descricao: string;
  valor: number;
  diaRecebimento?: number;
  inicio: string; // 1º dia do primeiro mês em que a renda conta (AAAA-MM-01)
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

const mapCategoria = (r: any): CategoriaPessoal => ({
  id: r.id, nome: r.nome, tipo: r.tipo, destinoId: opt(r.destino_id),
});
const mapDestino = (r: any): Destino => ({
  id: r.id, nome: r.nome, percentual: num(r.percentual), padrao: r.padrao, ordem: r.ordem,
});
const dataLocal = (ts: string) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const mapBem = (r: any): Bem => ({
  id: r.id, nome: r.nome, tipo: r.tipo, valor: num(r.valor),
  rentabilidadeAnual: r.rentabilidade_anual === null ? undefined : num(r.rentabilidade_anual),
  obs: opt(r.obs), atualizadoEm: dataLocal(r.updated_at),
});
const mapMeta = (r: any): MetaPessoal => ({
  id: r.id, tipo: r.tipo, titulo: r.titulo, valorAlvo: num(r.valor_alvo), prazo: r.prazo,
  guardado: num(r.guardado), concluida: r.concluida, obs: opt(r.obs),
});
const mapPasso = (r: any): PassoMeta => ({
  id: r.id, metaId: r.meta_id, descricao: r.descricao, quando: opt(r.quando), feito: r.feito, ordem: r.ordem,
});

const bemToDb = (b: Partial<Bem>) => ({
  ...(b.nome !== undefined && { nome: b.nome.trim() }),
  ...(b.tipo !== undefined && { tipo: b.tipo }),
  ...(b.valor !== undefined && { valor: b.valor }),
  ...("rentabilidadeAnual" in b && { rentabilidade_anual: b.rentabilidadeAnual ?? null }),
  ...(b.obs !== undefined && { obs: b.obs.trim() || null }),
});
const metaToDb = (m: Partial<MetaPessoal>) => ({
  ...(m.tipo !== undefined && { tipo: m.tipo }),
  ...(m.titulo !== undefined && { titulo: m.titulo.trim() }),
  ...(m.valorAlvo !== undefined && { valor_alvo: m.valorAlvo }),
  ...(m.prazo !== undefined && { prazo: m.prazo }),
  ...(m.guardado !== undefined && { guardado: m.guardado }),
  ...(m.concluida !== undefined && { concluida: m.concluida }),
  ...(m.obs !== undefined && { obs: m.obs.trim() || null }),
});
const passoToDb = (p: Partial<PassoMeta>) => ({
  ...(p.metaId !== undefined && { meta_id: p.metaId }),
  ...(p.descricao !== undefined && { descricao: p.descricao.trim() }),
  ...("quando" in p && { quando: p.quando || null }),
  ...(p.feito !== undefined && { feito: p.feito }),
  ...(p.ordem !== undefined && { ordem: p.ordem }),
});
const mapRenda = (r: any): Renda => ({
  id: r.id, descricao: r.descricao, valor: num(r.valor),
  diaRecebimento: opt(r.dia_recebimento), inicio: r.inicio, ativa: r.ativa,
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
  ...(r.inicio !== undefined && { inicio: r.inicio }),
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
  destinos: Destino[];
  bens: Bem[];
  metas: MetaPessoal[];
  passos: PassoMeta[];
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
  usarDivisaoSugerida: () => Promise<boolean>;
  salvarDestinos: (lista: DestinoInput[], removidos: string[]) => Promise<boolean>;
  ligarCategoriaDestino: (categoriaId: string, destinoId: string | null) => Promise<boolean>;
  addBem: (b: Omit<Bem, "id" | "atualizadoEm">) => Promise<boolean>;
  updateBem: (id: string, b: Partial<Bem>) => Promise<boolean>;
  removeBem: (id: string) => Promise<void>;
  addMeta: (m: Omit<MetaPessoal, "id">) => Promise<MetaPessoal | null>;
  updateMeta: (id: string, m: Partial<MetaPessoal>) => Promise<boolean>;
  removeMeta: (id: string) => Promise<void>;
  addPasso: (p: Omit<PassoMeta, "id">) => Promise<boolean>;
  updatePasso: (id: string, p: Partial<PassoMeta>) => Promise<boolean>;
  removePasso: (id: string) => Promise<void>;
};

const vazio: Estado = {
  categorias: [], rendas: [], contasFixas: [], dividas: [], lancamentos: [],
  destinos: [], bens: [], metas: [], passos: [], carregando: true,
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

  // Destinos e categorias andam juntos: apagar um destino solta as categorias ligadas a ele.
  const buscarDestinosECategorias = async () => {
    const [des, cat] = await Promise.all([
      (supabase.from as any)("pessoal_destinos").select("*").order("ordem").order("created_at"),
      (supabase.from as any)("pessoal_categorias").select("*").order("nome"),
    ]);
    if (des.error || cat.error) showError("Erro ao carregar a divisão da renda", des.error ?? cat.error);
    return {
      destinos: (des.data ?? []).map(mapDestino),
      categorias: (cat.data ?? []).map(mapCategoria),
    };
  };

  const recarregar = useCallback(async (logado: boolean) => {
    if (!logado) { setEstado({ ...vazio, carregando: false }); return; }
    const [ren, cf, ben, met, pas, desCat, resto] = await Promise.all([
      (supabase.from as any)("pessoal_rendas").select("*").order("created_at"),
      (supabase.from as any)("pessoal_contas_fixas").select("*").order("dia_vencimento"),
      (supabase.from as any)("pessoal_bens").select("*").order("created_at"),
      (supabase.from as any)("pessoal_metas").select("*").order("prazo"),
      (supabase.from as any)("pessoal_meta_passos").select("*").order("ordem").order("created_at"),
      buscarDestinosECategorias(),
      buscarDividasELancamentos(),
    ]);
    const erro = ren.error ?? cf.error ?? ben.error ?? met.error ?? pas.error;
    if (erro) showError("Erro ao carregar dados pessoais", erro);
    setEstado({
      rendas: (ren.data ?? []).map(mapRenda),
      contasFixas: (cf.data ?? []).map(mapContaFixa),
      bens: (ben.data ?? []).map(mapBem),
      metas: (met.data ?? []).map(mapMeta),
      passos: (pas.data ?? []).map(mapPasso),
      ...desCat,
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

  // ----- Divisão da renda -----
  const usarDivisaoSugerida = useCallback(async () => {
    // A função no banco cria os destinos e as categorias ligadas a eles numa transação só.
    const { error } = await (supabase.rpc as any)("pessoal_usar_divisao_sugerida");
    if (error) { showError("Erro ao criar a divisão", error); return false; }
    const desCat = await buscarDestinosECategorias();
    setEstado((p) => ({ ...p, ...desCat }));
    return true;
  }, []);
  const salvarDestinos = useCallback(async (lista: DestinoInput[], removidos: string[]) => {
    let ok = true;
    for (const id of removidos) ok = (await excluir("pessoal_destinos", id)) && ok;
    // O banco aceita um só destino padrão: quem deixa de ser padrão é gravado antes.
    for (const d of [...lista].sort((a, b) => Number(a.padrao) - Number(b.padrao))) {
      const dados = { nome: d.nome.trim(), percentual: d.percentual, padrao: d.padrao, ordem: d.ordem };
      const { error } = d.id
        ? await (supabase.from as any)("pessoal_destinos").update(dados).eq("id", d.id)
        : await (supabase.from as any)("pessoal_destinos").insert(dados);
      if (error) { showError(`Erro ao salvar "${dados.nome}"`, error); ok = false; }
    }
    // Recarrega tudo: apagar um destino solta as categorias que apontavam para ele.
    const desCat = await buscarDestinosECategorias();
    setEstado((p) => ({ ...p, ...desCat }));
    return ok;
  }, []);
  const ligarCategoriaDestino = useCallback(async (categoriaId: string, destinoId: string | null) => {
    const nova = await atualizar("pessoal_categorias", categoriaId, { destino_id: destinoId }, mapCategoria);
    if (nova) setEstado((p) => ({ ...p, categorias: trocar(p.categorias, nova) }));
    return !!nova;
  }, []);

  // ----- Bens -----
  const addBem = useCallback(async (b: Omit<Bem, "id" | "atualizadoEm">) => {
    const novo = await inserir("pessoal_bens", bemToDb(b), mapBem);
    if (novo) setEstado((p) => ({ ...p, bens: [...p.bens, novo] }));
    return !!novo;
  }, []);
  const updateBem = useCallback(async (id: string, b: Partial<Bem>) => {
    const novo = await atualizar("pessoal_bens", id, bemToDb(b), mapBem);
    if (novo) setEstado((p) => ({ ...p, bens: trocar(p.bens, novo) }));
    return !!novo;
  }, []);
  const removeBem = useCallback(async (id: string) => {
    if (await excluir("pessoal_bens", id)) setEstado((p) => ({ ...p, bens: p.bens.filter((b) => b.id !== id) }));
  }, []);

  // ----- Metas, sonhos e plano de ação -----
  const ordenarMetas = (a: MetaPessoal, b: MetaPessoal) => a.prazo.localeCompare(b.prazo);
  const addMeta = useCallback(async (m: Omit<MetaPessoal, "id">) => {
    const nova = await inserir("pessoal_metas", metaToDb(m), mapMeta);
    if (nova) setEstado((p) => ({ ...p, metas: [...p.metas, nova].sort(ordenarMetas) }));
    return nova;
  }, []);
  const updateMeta = useCallback(async (id: string, m: Partial<MetaPessoal>) => {
    const nova = await atualizar("pessoal_metas", id, metaToDb(m), mapMeta);
    if (nova) setEstado((p) => ({ ...p, metas: trocar(p.metas, nova).sort(ordenarMetas) }));
    return !!nova;
  }, []);
  const removeMeta = useCallback(async (id: string) => {
    // Os passos são apagados junto (on delete cascade).
    if (!(await excluir("pessoal_metas", id))) return;
    setEstado((p) => ({
      ...p, metas: p.metas.filter((m) => m.id !== id), passos: p.passos.filter((x) => x.metaId !== id),
    }));
  }, []);
  const addPasso = useCallback(async (x: Omit<PassoMeta, "id">) => {
    const novo = await inserir("pessoal_meta_passos", passoToDb(x), mapPasso);
    if (novo) setEstado((p) => ({ ...p, passos: [...p.passos, novo] }));
    return !!novo;
  }, []);
  const updatePasso = useCallback(async (id: string, x: Partial<PassoMeta>) => {
    const novo = await atualizar("pessoal_meta_passos", id, passoToDb(x), mapPasso);
    if (novo) setEstado((p) => ({ ...p, passos: trocar(p.passos, novo) }));
    return !!novo;
  }, []);
  const removePasso = useCallback(async (id: string) => {
    if (await excluir("pessoal_meta_passos", id)) setEstado((p) => ({ ...p, passos: p.passos.filter((x) => x.id !== id) }));
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
        usarDivisaoSugerida, salvarDestinos, ligarCategoriaDestino,
        addBem, updateBem, removeBem,
        addMeta, updateMeta, removeMeta, addPasso, updatePasso, removePasso,
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

// ============ O MÊS (Dia a dia, Resultado do ano e Meu caminho usam a mesma regra) ============
export type LinhaMes = {
  chave: string;
  data: string;
  descricao: string;
  detalhe?: string;
  categoriaId?: string;
  tipo: TipoMov;
  valor: number;
  status: StatusPag;
  origem: "lancamento" | "parcela" | "conta_fixa";
  lancamento?: LancamentoPessoal;
  /** Conta fixa que ainda não foi paga neste mês (não existe lançamento para ela). */
  contaFixa?: ContaFixa;
};

/**
 * Tudo o que entra e sai num mês: os lançamentos com data no mês (inclusive parcelas de dívida e
 * contas fixas já pagas) e as contas fixas que valem no mês e ainda não foram pagas.
 */
export function linhasDoMes(
  dados: { lancamentos: LancamentoPessoal[]; contasFixas: ContaFixa[]; dividas: Divida[] },
  ano: number,
  mes: number,
): LinhaMes[] {
  const chave = chaveMes(ano, mes);
  const competencia = competenciaDe(ano, mes);
  const lista: LinhaMes[] = dados.lancamentos
    .filter((l) => l.data.startsWith(chave))
    .map((l) => {
      const divida = l.dividaId ? dados.dividas.find((d) => d.id === l.dividaId) : undefined;
      return {
        chave: l.id,
        data: l.data,
        descricao: l.descricao,
        detalhe: divida
          ? `Parcela ${l.parcelaNumero}/${divida.totalParcelas}`
          : l.contaFixaId ? "Conta fixa" : undefined,
        categoriaId: l.categoriaId,
        tipo: l.tipo,
        valor: l.valor,
        status: l.status,
        origem: l.dividaId ? "parcela" : l.contaFixaId ? "conta_fixa" : "lancamento",
        lancamento: l,
      };
    });
  // Contas fixas: aparecem todo mês a partir do início, até serem pagas.
  const pagas = new Set(
    dados.lancamentos.filter((l) => l.contaFixaId && l.competencia === competencia).map((l) => l.contaFixaId),
  );
  for (const c of dados.contasFixas) {
    if (!c.ativa || c.inicio > competencia || pagas.has(c.id)) continue;
    lista.push({
      chave: `cf-${c.id}`,
      data: dataNoMes(ano, mes, c.diaVencimento),
      descricao: c.descricao,
      detalhe: "Conta fixa",
      categoriaId: c.categoriaId,
      tipo: "Despesa",
      valor: c.valor,
      status: "Pendente",
      origem: "conta_fixa",
      contaFixa: c,
    });
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao));
}

/** Soma das rendas ativas que já valiam no mês. */
export function rendaDoMes(rendas: Renda[], ano: number, mes: number) {
  const competencia = competenciaDe(ano, mes);
  return rendas.filter((r) => r.ativa && r.inicio <= competencia).reduce((s, r) => s + r.valor, 0);
}

// ============ PATRIMÔNIO (Bens, Metas e Meu caminho) ============
/** Tudo o que tenho (bens e investimentos) menos o que ainda falta pagar das dívidas. */
export function patrimonio(dados: { bens: Bem[]; dividas: Divida[]; lancamentos: LancamentoPessoal[] }) {
  const tenho = dados.bens.reduce((s, b) => s + b.valor, 0);
  const devo = dados.dividas.reduce((s, d) => s + resumirDivida(d, dados.lancamentos).valorRestante, 0);
  return { tenho, devo, liquido: tenho - devo };
}

/** Quanto um investimento rende por mês, a partir da rentabilidade ao ano. */
export function rendimentoMensal(valor: number, rentabilidadeAnual?: number) {
  if (!rentabilidadeAnual) return 0;
  return valor * (Math.pow(1 + rentabilidadeAnual / 100, 1 / 12) - 1);
}

// ============ DIVISÃO DA RENDA ============
export type ItemDivisao = { destino: Destino; planejado: number; usado: number };

/**
 * Planejado × usado de cada destino num mês. Planejado = tudo o que entra no mês × percentual.
 * Usado = gastos do mês (pagos ou a pagar) cuja categoria aponta para o destino; o resto vai para
 * o destino padrão (contas e dia a dia).
 */
export function divisaoDoMes(
  dados: {
    destinos: Destino[]; categorias: CategoriaPessoal[]; rendas: Renda[];
    lancamentos: LancamentoPessoal[]; contasFixas: ContaFixa[]; dividas: Divida[];
  },
  ano: number,
  mes: number,
) {
  const linhas = linhasDoMes(dados, ano, mes);
  const entradas = rendaDoMes(dados.rendas, ano, mes)
    + linhas.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0);
  const existe = new Set(dados.destinos.map((d) => d.id));
  const destinoDaCategoria = new Map(dados.categorias.map((c) => [c.id, c.destinoId]));
  const padrao = dados.destinos.find((d) => d.padrao);
  const usado = new Map<string, number>();
  let semDestino = 0;
  for (const l of linhas) {
    if (l.tipo !== "Despesa") continue;
    const ligado = l.categoriaId ? destinoDaCategoria.get(l.categoriaId) : undefined;
    const destinoId = ligado && existe.has(ligado) ? ligado : padrao?.id;
    if (destinoId) usado.set(destinoId, (usado.get(destinoId) ?? 0) + l.valor);
    else semDestino += l.valor;
  }
  const itens: ItemDivisao[] = [...dados.destinos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((d) => ({ destino: d, planejado: (entradas * d.percentual) / 100, usado: usado.get(d.id) ?? 0 }));
  return {
    entradas,
    itens,
    semDestino,
    totalPercentual: dados.destinos.reduce((s, d) => s + d.percentual, 0),
  };
}

// ============ PRAZOS ============
/** Meses inteiros de hoje até a data (negativo se já passou). */
export function mesesAte(data: string, hoje = hojeISO()) {
  const [y1, m1, d1] = hoje.split("-").map(Number);
  const [y2, m2, d2] = data.split("-").map(Number);
  let meses = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) meses--;
  return meses;
}

/** Data daqui a N meses (AAAA-MM-DD), para os atalhos de prazo. */
export function daquiAMeses(n: number, hoje = hojeISO()) {
  const [y, m, d] = hoje.split("-").map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  return dataNoMes(alvo.getFullYear(), alvo.getMonth() + 1, d);
}
