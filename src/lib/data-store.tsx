import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ TIPOS ============
export type ContatoTipo = "Cliente" | "Fornecedor";
export type Contato = {
  id: string;
  nome: string;
  tipo: ContatoTipo;
  documento?: string;
  email?: string;
  telefone?: string;
  obs?: string;
};

export type Categoria = {
  id: string;
  nome: string;
  tipo: "Receita" | "Despesa";
  grupoId?: string;
};

export type GrupoCategoria = {
  id: string;
  nome: string;
  tipo: "Receita" | "Despesa";
  ordem: number;
};

export type Banco = {
  id: string;
  nome: string;
  agencia?: string;
  conta?: string;
  saldoInicial: number;
};

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
};

export type LancTipo = "Receita" | "Despesa";
export type LancStatus = "Pago" | "Pendente";
export type Rateio = {
  id?: string;
  lancamentoId?: string;
  categoriaId?: string;
  valor: number;
  percentual?: number;
  descricao?: string;
};
export type Lancamento = {
  id: string;
  data: string;
  desc: string;
  categoriaId: string;
  contatoId?: string;
  bancoId?: string;
  tipo: LancTipo;
  valor: number;
  status: LancStatus;
  parcelaGrupoId?: string;
  parcelaNumero?: number;
  parcelaTotal?: number;
  rateios?: Rateio[];
};

export type Transferencia = {
  id: string;
  data: string;
  bancoOrigemId: string;
  bancoDestinoId: string;
  valor: number;
  descricao?: string;
};

export type DealStage = string;
export type Deal = {
  id: string;
  cliente: string;
  titulo: string;
  valor: number;
  dias: number;
  prob: number;
  stage: DealStage;
  produtoId?: string;
  contato?: string;
  email?: string;
  obs?: string;
  origemLeadId?: string;
};

export const LEAD_STATUS = [
  "Novo",
  "Contatado",
  "Qualificado",
  "Convertido",
  "Perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];
export type Lead = {
  id: string;
  nome: string;
  email: string;
  tel: string;
  origem: string;
  status: LeadStatus;
  data: string;
  obs?: string;
};

export type CampStatus = "Ativa" | "Pausada" | "Encerrada";
export type Campanha = {
  id: string;
  nome: string;
  canal: string;
  orcamento: number;
  inicio: string;
  fim: string;
  leads: number;
  status: CampStatus;
};

export type EventoTipo = "Postagem" | "Atividade" | "Reunião";
export type Evento = {
  id: string;
  titulo: string;
  data: string;
  tipo: EventoTipo;
  canal?: string;
  obs?: string;
};

// ============ STATE ============
type State = {
  contatos: Contato[];
  categorias: Categoria[];
  grupos: GrupoCategoria[];
  bancos: Banco[];
  produtos: Produto[];
  etapas: DealStage[];
  lancamentos: Lancamento[];
  transferencias: Transferencia[];
  deals: Deal[];
  leads: Lead[];
  campanhas: Campanha[];
  eventos: Evento[];
  loading: boolean;
};

type Ctx = State & {
  addContato: (c: Omit<Contato, "id">) => Promise<Contato | null>;
  updateContato: (id: string, p: Partial<Contato>) => Promise<void>;
  removeContato: (id: string) => Promise<void>;

  addCategoria: (c: Omit<Categoria, "id">) => Promise<void>;
  updateCategoria: (id: string, p: Partial<Categoria>) => Promise<void>;
  removeCategoria: (id: string) => Promise<void>;

  addGrupo: (g: Omit<GrupoCategoria, "id" | "ordem">) => Promise<void>;
  updateGrupo: (id: string, p: Partial<GrupoCategoria>) => Promise<void>;
  removeGrupo: (id: string) => Promise<void>;

  addBanco: (b: Omit<Banco, "id">) => Promise<void>;
  updateBanco: (id: string, p: Partial<Banco>) => Promise<void>;
  removeBanco: (id: string) => Promise<void>;
  saldoBanco: (id: string) => number;

  addProduto: (p: Omit<Produto, "id">) => Promise<void>;
  updateProduto: (id: string, p: Partial<Produto>) => Promise<void>;
  removeProduto: (id: string) => Promise<void>;

  addEtapa: (nome: string) => Promise<void>;
  renameEtapa: (antigo: string, novo: string) => Promise<void>;
  removeEtapa: (nome: string) => Promise<void>;
  moveEtapa: (nome: string, dir: -1 | 1) => Promise<void>;

  addLancamento: (l: Omit<Lancamento, "id">) => Promise<Lancamento | null>;
  updateLancamento: (id: string, p: Partial<Lancamento>) => Promise<void>;
  removeLancamento: (id: string) => Promise<void>;
  addParcelamento: (
    base: Omit<Lancamento, "id" | "valor" | "data" | "rateios">,
    valorTotal: number,
    parcelas: number,
    primeiraData: string,
    rateios?: Rateio[],
  ) => Promise<void>;
  removeParcelamento: (grupoId: string) => Promise<void>;
  saveRateios: (lancamentoId: string, rateios: Rateio[]) => Promise<void>;

  addTransferencia: (t: Omit<Transferencia, "id">) => Promise<void>;
  removeTransferencia: (id: string) => Promise<void>;

  addDeal: (d: Omit<Deal, "id">) => Promise<void>;
  updateDeal: (id: string, p: Partial<Deal>) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;

  addLead: (l: Omit<Lead, "id">) => Promise<void>;
  updateLead: (id: string, p: Partial<Lead>) => Promise<void>;
  removeLead: (id: string) => Promise<void>;
  advanceLeadStatus: (id: string) => Promise<void>;

  addCampanha: (c: Omit<Campanha, "id">) => Promise<void>;
  updateCampanha: (id: string, p: Partial<Campanha>) => Promise<void>;
  removeCampanha: (id: string) => Promise<void>;

  addEvento: (e: Omit<Evento, "id">) => Promise<void>;
  updateEvento: (id: string, p: Partial<Evento>) => Promise<void>;
  removeEvento: (id: string) => Promise<void>;
};

const DataContext = createContext<Ctx | null>(null);

const DEFAULT_ETAPAS: DealStage[] = [
  "Lead",
  "Qualificado",
  "Proposta Enviada",
  "Negociação",
  "Ganho",
  "Perdido",
];

const emptyState: State = {
  contatos: [],
  categorias: [],
  grupos: [],
  bancos: [],
  produtos: [],
  etapas: DEFAULT_ETAPAS,
  lancamentos: [],
  transferencias: [],
  deals: [],
  leads: [],
  campanhas: [],
  eventos: [],
  loading: true,
};

// ===== Mappers DB <-> TS =====
const mapContato = (r: any): Contato => ({
  id: r.id, nome: r.nome, tipo: r.tipo,
  documento: r.documento ?? undefined, email: r.email ?? undefined,
  telefone: r.telefone ?? undefined, obs: r.obs ?? undefined,
});
const mapCategoria = (r: any): Categoria => ({
  id: r.id, nome: r.nome, tipo: r.tipo, grupoId: r.grupo_id ?? undefined,
});
const mapGrupo = (r: any): GrupoCategoria => ({
  id: r.id, nome: r.nome, tipo: r.tipo, ordem: r.ordem ?? 0,
});
const mapBanco = (r: any): Banco => ({
  id: r.id, nome: r.nome, agencia: r.agencia ?? undefined,
  conta: r.conta ?? undefined, saldoInicial: Number(r.saldo_inicial ?? 0),
});
const mapProduto = (r: any): Produto => ({
  id: r.id, nome: r.nome, preco: Number(r.preco ?? 0), descricao: r.descricao ?? undefined,
});
const mapLanc = (r: any): Lancamento => ({
  id: r.id, data: r.data, desc: r.descricao,
  categoriaId: r.categoria_id ?? "", contatoId: r.contato_id ?? undefined,
  bancoId: r.banco_id ?? undefined, tipo: r.tipo, valor: Number(r.valor),
  status: r.status,
  parcelaGrupoId: r.parcela_grupo_id ?? undefined,
  parcelaNumero: r.parcela_numero ?? undefined,
  parcelaTotal: r.parcela_total ?? undefined,
});
const mapRateio = (r: any): Rateio => ({
  id: r.id, lancamentoId: r.lancamento_id,
  categoriaId: r.categoria_id ?? undefined,
  valor: Number(r.valor ?? 0),
  percentual: r.percentual != null ? Number(r.percentual) : undefined,
  descricao: r.descricao ?? undefined,
});
const mapTransf = (r: any): Transferencia => ({
  id: r.id, data: r.data, bancoOrigemId: r.banco_origem_id,
  bancoDestinoId: r.banco_destino_id, valor: Number(r.valor),
  descricao: r.descricao ?? undefined,
});
const mapDeal = (r: any): Deal => ({
  id: r.id, cliente: r.cliente, titulo: r.titulo,
  valor: Number(r.valor), dias: r.dias, prob: r.probabilidade,
  stage: r.stage, produtoId: r.produto_id ?? undefined,
  contato: r.contato ?? undefined, email: r.email ?? undefined,
  obs: r.obs ?? undefined, origemLeadId: r.origem_lead_id ?? undefined,
});
const mapLead = (r: any): Lead => ({
  id: r.id, nome: r.nome, email: r.email ?? "", tel: r.telefone ?? "",
  origem: r.origem ?? "", status: r.status, data: r.data, obs: r.obs ?? undefined,
});
const mapCamp = (r: any): Campanha => ({
  id: r.id, nome: r.nome, canal: r.canal, orcamento: Number(r.orcamento),
  inicio: r.inicio ?? "", fim: r.fim ?? "", leads: r.leads, status: r.status,
});
const mapEvento = (r: any): Evento => ({
  id: r.id, titulo: r.titulo, data: r.data, tipo: r.tipo,
  canal: r.canal ?? undefined, obs: r.obs ?? undefined,
});

// TS -> DB payloads
const lancToDb = (l: Partial<Lancamento>) => ({
  ...(l.data !== undefined && { data: l.data }),
  ...(l.desc !== undefined && { descricao: l.desc }),
  ...(l.categoriaId !== undefined && { categoria_id: l.categoriaId || null }),
  ...(l.contatoId !== undefined && { contato_id: l.contatoId || null }),
  ...(l.bancoId !== undefined && { banco_id: l.bancoId || null }),
  ...(l.tipo !== undefined && { tipo: l.tipo }),
  ...(l.valor !== undefined && { valor: l.valor }),
  ...(l.status !== undefined && { status: l.status }),
  ...(l.parcelaGrupoId !== undefined && { parcela_grupo_id: l.parcelaGrupoId || null }),
  ...(l.parcelaNumero !== undefined && { parcela_numero: l.parcelaNumero ?? null }),
  ...(l.parcelaTotal !== undefined && { parcela_total: l.parcelaTotal ?? null }),
});
const dealToDb = (d: Partial<Deal>) => ({
  ...(d.cliente !== undefined && { cliente: d.cliente }),
  ...(d.titulo !== undefined && { titulo: d.titulo }),
  ...(d.valor !== undefined && { valor: d.valor }),
  ...(d.dias !== undefined && { dias: d.dias }),
  ...(d.prob !== undefined && { probabilidade: d.prob }),
  ...(d.stage !== undefined && { stage: d.stage }),
  ...(d.produtoId !== undefined && { produto_id: d.produtoId || null }),
  ...(d.contato !== undefined && { contato: d.contato }),
  ...(d.email !== undefined && { email: d.email }),
  ...(d.obs !== undefined && { obs: d.obs }),
  ...(d.origemLeadId !== undefined && { origem_lead_id: d.origemLeadId || null }),
});
const leadToDb = (l: Partial<Lead>) => ({
  ...(l.nome !== undefined && { nome: l.nome }),
  ...(l.email !== undefined && { email: l.email }),
  ...(l.tel !== undefined && { telefone: l.tel }),
  ...(l.origem !== undefined && { origem: l.origem }),
  ...(l.status !== undefined && { status: l.status }),
  ...(l.data !== undefined && { data: l.data }),
  ...(l.obs !== undefined && { obs: l.obs }),
});
const bancoToDb = (b: Partial<Banco>) => ({
  ...(b.nome !== undefined && { nome: b.nome }),
  ...(b.agencia !== undefined && { agencia: b.agencia }),
  ...(b.conta !== undefined && { conta: b.conta }),
  ...(b.saldoInicial !== undefined && { saldo_inicial: b.saldoInicial }),
});

function showError(prefix: string, err: any) {
  console.error(prefix, err);
  toast.error(`${prefix}: ${err?.message ?? "erro desconhecido"}`);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);

  const reload = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setState({ ...emptyState, loading: false }); return; }

    const [
      contatosR, categoriasR, bancosR, produtosR, etapasR,
      lancR, rateiosR, transfR, dealsR, leadsR, campsR, eventosR,
    ] = await Promise.all([
      supabase.from("contatos").select("*").order("created_at", { ascending: false }),
      supabase.from("categorias").select("*").order("nome"),
      supabase.from("bancos").select("*").order("nome"),
      supabase.from("produtos").select("*").order("nome"),
      supabase.from("etapas_pipeline").select("*").order("ordem"),
      supabase.from("lancamentos").select("*").order("data", { ascending: false }),
      (supabase.from as any)("lancamento_rateios").select("*"),
      supabase.from("transferencias").select("*").order("data", { ascending: false }),
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("*").order("data", { ascending: false }),
      supabase.from("campanhas").select("*").order("created_at", { ascending: false }),
      supabase.from("eventos").select("*").order("data", { ascending: false }),
    ]);

    const rateiosByLanc = new Map<string, Rateio[]>();
    for (const r of (rateiosR?.data ?? [])) {
      const m = mapRateio(r);
      const list = rateiosByLanc.get(m.lancamentoId!) ?? [];
      list.push(m);
      rateiosByLanc.set(m.lancamentoId!, list);
    }

    const etapasFromDb = (etapasR.data ?? []).map((e: any) => e.nome as string);
    let etapas = etapasFromDb;
    if (etapasFromDb.length === 0) {
      // Seed default stages for new user
      const seed = DEFAULT_ETAPAS.map((nome, i) => ({ user_id: user.id, nome, ordem: i }));
      await supabase.from("etapas_pipeline").insert(seed);
      etapas = DEFAULT_ETAPAS;
    }

    setState({
      contatos: (contatosR.data ?? []).map(mapContato),
      categorias: (categoriasR.data ?? []).map(mapCategoria),
      bancos: (bancosR.data ?? []).map(mapBanco),
      produtos: (produtosR.data ?? []).map(mapProduto),
      etapas,
      lancamentos: (lancR.data ?? []).map((r: any) => ({ ...mapLanc(r), rateios: rateiosByLanc.get(r.id) ?? [] })),
      transferencias: (transfR.data ?? []).map(mapTransf),
      deals: (dealsR.data ?? []).map(mapDeal),
      leads: (leadsR.data ?? []).map(mapLead),
      campanhas: (campsR.data ?? []).map(mapCamp),
      eventos: (eventosR.data ?? []).map(mapEvento),
      loading: false,
    });
  }, []);

  useEffect(() => {
    reload();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { reload(); });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  // ---- Generic helpers ----
  async function insertRow<T>(
    table: string, payload: any, map: (r: any) => T,
    key: keyof State,
  ): Promise<T | null> {
    const uid = await getUserId();
    if (!uid) return null;
    const { data, error } = await supabase.from(table as any).insert({ ...payload, user_id: uid }).select().single();
    if (error) { showError(`Erro ao salvar em ${table}`, error); return null; }
    const mapped = map(data);
    setState((p) => ({ ...p, [key]: [mapped as any, ...(p[key] as any[])] } as State));
    return mapped;
  }

  async function updateRow<T>(
    table: string, id: string, payload: any, map: (r: any) => T,
    key: keyof State,
  ) {
    const { data, error } = await supabase.from(table as any).update(payload).eq("id", id).select().single();
    if (error) { showError(`Erro ao atualizar ${table}`, error); return; }
    const mapped = map(data);
    setState((p) => ({
      ...p, [key]: (p[key] as any[]).map((x) => (x.id === id ? mapped : x)),
    } as State));
  }

  async function deleteRow(table: string, id: string, key: keyof State) {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { showError(`Erro ao excluir de ${table}`, error); return; }
    setState((p) => ({ ...p, [key]: (p[key] as any[]).filter((x) => x.id !== id) } as State));
  }

  // ----- Contatos -----
  const addContato = useCallback((c: Omit<Contato, "id">) =>
    insertRow("contatos", c, mapContato, "contatos"), []);
  const updateContato = useCallback(async (id: string, pa: Partial<Contato>) => {
    await updateRow("contatos", id, pa, mapContato, "contatos");
  }, []);
  const removeContato = useCallback((id: string) => deleteRow("contatos", id, "contatos"), []);

  // ----- Categorias -----
  const addCategoria = useCallback(async (c: Omit<Categoria, "id">) => {
    await insertRow("categorias", c, mapCategoria, "categorias");
  }, []);
  const updateCategoria = useCallback((id: string, pa: Partial<Categoria>) =>
    updateRow("categorias", id, pa, mapCategoria, "categorias"), []);
  const removeCategoria = useCallback((id: string) => deleteRow("categorias", id, "categorias"), []);

  // ----- Bancos -----
  const addBanco = useCallback(async (b: Omit<Banco, "id">) => {
    await insertRow("bancos", bancoToDb(b), mapBanco, "bancos");
  }, []);
  const updateBanco = useCallback((id: string, pa: Partial<Banco>) =>
    updateRow("bancos", id, bancoToDb(pa), mapBanco, "bancos"), []);
  const removeBanco = useCallback((id: string) => deleteRow("bancos", id, "bancos"), []);
  const saldoBanco = useCallback((id: string) => {
    const b = state.bancos.find((x) => x.id === id);
    if (!b) return 0;
    const movLanc = state.lancamentos
      .filter((l) => l.bancoId === id && l.status === "Pago")
      .reduce((s, l) => s + (l.tipo === "Receita" ? l.valor : -l.valor), 0);
    const movTransf = state.transferencias.reduce((s, t) => {
      if (t.bancoDestinoId === id) return s + t.valor;
      if (t.bancoOrigemId === id) return s - t.valor;
      return s;
    }, 0);
    return b.saldoInicial + movLanc + movTransf;
  }, [state.bancos, state.lancamentos, state.transferencias]);

  // ----- Produtos -----
  const addProduto = useCallback(async (pr: Omit<Produto, "id">) => {
    await insertRow("produtos", pr, mapProduto, "produtos");
  }, []);
  const updateProduto = useCallback((id: string, pa: Partial<Produto>) =>
    updateRow("produtos", id, pa, mapProduto, "produtos"), []);
  const removeProduto = useCallback((id: string) => deleteRow("produtos", id, "produtos"), []);

  // ----- Etapas -----
  const addEtapa = useCallback(async (nome: string) => {
    const uid = await getUserId();
    if (!uid) return;
    if (state.etapas.includes(nome)) return;
    const ordem = state.etapas.length;
    const { error } = await supabase.from("etapas_pipeline").insert({ user_id: uid, nome, ordem });
    if (error) { showError("Erro ao adicionar etapa", error); return; }
    setState((p) => ({ ...p, etapas: [...p.etapas, nome] }));
  }, [state.etapas]);

  const renameEtapa = useCallback(async (antigo: string, novo: string) => {
    const uid = await getUserId();
    if (!uid) return;
    const { error } = await supabase.from("etapas_pipeline").update({ nome: novo })
      .eq("user_id", uid).eq("nome", antigo);
    if (error) { showError("Erro ao renomear etapa", error); return; }
    await supabase.from("deals").update({ stage: novo }).eq("user_id", uid).eq("stage", antigo);
    setState((p) => ({
      ...p,
      etapas: p.etapas.map((e) => (e === antigo ? novo : e)),
      deals: p.deals.map((d) => (d.stage === antigo ? { ...d, stage: novo } : d)),
    }));
  }, []);

  const removeEtapa = useCallback(async (nome: string) => {
    if (state.etapas.length <= 1) return;
    const uid = await getUserId();
    if (!uid) return;
    const fallback = state.etapas.find((e) => e !== nome) ?? state.etapas[0];
    await supabase.from("deals").update({ stage: fallback }).eq("user_id", uid).eq("stage", nome);
    const { error } = await supabase.from("etapas_pipeline").delete()
      .eq("user_id", uid).eq("nome", nome);
    if (error) { showError("Erro ao excluir etapa", error); return; }
    setState((p) => ({
      ...p,
      etapas: p.etapas.filter((e) => e !== nome),
      deals: p.deals.map((d) => (d.stage === nome ? { ...d, stage: fallback } : d)),
    }));
  }, [state.etapas]);

  const moveEtapa = useCallback(async (nome: string, dir: -1 | 1) => {
    const uid = await getUserId();
    if (!uid) return;
    const i = state.etapas.indexOf(nome);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.etapas.length) return;
    const next = [...state.etapas];
    [next[i], next[j]] = [next[j], next[i]];
    // Persist new order
    await Promise.all(
      next.map((n, idx) =>
        supabase.from("etapas_pipeline").update({ ordem: idx })
          .eq("user_id", uid).eq("nome", n)
      )
    );
    setState((p) => ({ ...p, etapas: next }));
  }, [state.etapas]);

  // ----- Lançamentos -----
  const saveRateios = useCallback(async (lancamentoId: string, rateios: Rateio[]) => {
    const uid = await getUserId();
    if (!uid) return;
    // Replace all rateios for this lançamento
    await (supabase.from as any)("lancamento_rateios").delete().eq("lancamento_id", lancamentoId);
    let inserted: Rateio[] = [];
    if (rateios.length > 0) {
      const payload = rateios.map((r) => ({
        user_id: uid,
        lancamento_id: lancamentoId,
        categoria_id: r.categoriaId || null,
        valor: r.valor,
        percentual: r.percentual ?? null,
        descricao: r.descricao ?? null,
      }));
      const { data, error } = await (supabase.from as any)("lancamento_rateios").insert(payload).select();
      if (error) { showError("Erro ao salvar rateios", error); return; }
      inserted = (data ?? []).map(mapRateio);
    }
    setState((p) => ({
      ...p,
      lancamentos: p.lancamentos.map((l) =>
        l.id === lancamentoId ? { ...l, rateios: inserted } : l,
      ),
    }));
  }, []);

  const addLancamento = useCallback(async (l: Omit<Lancamento, "id">) => {
    const { rateios, ...rest } = l;
    const inserted = await insertRow("lancamentos", lancToDb(rest), mapLanc, "lancamentos");
    if (inserted && rateios && rateios.length > 0) {
      await saveRateios(inserted.id, rateios);
    }
    return inserted;
  }, [saveRateios]);
  const updateLancamento = useCallback(async (id: string, pa: Partial<Lancamento>) => {
    const { rateios, ...rest } = pa;
    if (Object.keys(rest).length > 0) {
      await updateRow("lancamentos", id, lancToDb(rest), mapLanc, "lancamentos");
    }
    if (rateios !== undefined) {
      await saveRateios(id, rateios);
    }
  }, [saveRateios]);
  const removeLancamento = useCallback((id: string) => deleteRow("lancamentos", id, "lancamentos"), []);

  const addParcelamento = useCallback(async (
    base: Omit<Lancamento, "id" | "valor" | "data" | "rateios">,
    valorTotal: number,
    parcelas: number,
    primeiraData: string,
    rateios?: Rateio[],
  ) => {
    const uid = await getUserId();
    if (!uid) return;
    const grupoId = (crypto as any).randomUUID();
    const valorParcela = Math.round((valorTotal / parcelas) * 100) / 100;
    const resto = Math.round((valorTotal - valorParcela * parcelas) * 100) / 100;
    const [y, m, d] = primeiraData.split("-").map(Number);
    const rows = Array.from({ length: parcelas }).map((_, i) => {
      const dt = new Date(y, (m - 1) + i, d);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const v = i === parcelas - 1 ? valorParcela + resto : valorParcela;
      return {
        user_id: uid,
        ...lancToDb({ ...base, valor: v, data: dateStr, parcelaGrupoId: grupoId, parcelaNumero: i + 1, parcelaTotal: parcelas }),
      };
    });
    const { data, error } = await (supabase.from as any)("lancamentos").insert(rows).select();
    if (error) { showError("Erro ao criar parcelamento", error); return; }
    const novos = (data ?? []).map(mapLanc);
    setState((p) => ({ ...p, lancamentos: [...novos, ...p.lancamentos] }));
    // Apply rateios proportionally to each parcel
    if (rateios && rateios.length > 0 && novos.length > 0) {
      for (const lanc of novos) {
        const fator = lanc.valor / valorTotal;
        const rs = rateios.map((r) => ({
          ...r,
          valor: Math.round(r.valor * fator * 100) / 100,
        }));
        await saveRateios(lanc.id, rs);
      }
    }
  }, [saveRateios]);

  const removeParcelamento = useCallback(async (grupoId: string) => {
    const { error } = await supabase.from("lancamentos").delete().eq("parcela_grupo_id", grupoId);
    if (error) { showError("Erro ao excluir parcelamento", error); return; }
    setState((p) => ({
      ...p,
      lancamentos: p.lancamentos.filter((l) => l.parcelaGrupoId !== grupoId),
    }));
  }, []);

  // ----- Transferências -----
  const addTransferencia = useCallback(async (t: Omit<Transferencia, "id">) => {
    await insertRow("transferencias", {
      data: t.data,
      banco_origem_id: t.bancoOrigemId,
      banco_destino_id: t.bancoDestinoId,
      valor: t.valor,
      descricao: t.descricao,
    }, mapTransf, "transferencias");
  }, []);
  const removeTransferencia = useCallback((id: string) =>
    deleteRow("transferencias", id, "transferencias"), []);

  // ----- Deals -----
  const addDeal = useCallback(async (d: Omit<Deal, "id">) => {
    await insertRow("deals", dealToDb(d), mapDeal, "deals");
  }, []);
  const updateDeal = useCallback((id: string, pa: Partial<Deal>) =>
    updateRow("deals", id, dealToDb(pa), mapDeal, "deals"), []);
  const removeDeal = useCallback((id: string) => deleteRow("deals", id, "deals"), []);

  // ----- Leads -----
  const addLead = useCallback(async (l: Omit<Lead, "id">) => {
    await insertRow("leads", leadToDb(l), mapLead, "leads");
  }, []);
  const updateLead = useCallback((id: string, pa: Partial<Lead>) =>
    updateRow("leads", id, leadToDb(pa), mapLead, "leads"), []);
  const removeLead = useCallback((id: string) => deleteRow("leads", id, "leads"), []);

  const advanceLeadStatus = useCallback(async (id: string) => {
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;
    if (lead.status === "Convertido" || lead.status === "Perdido") return;
    const idx = LEAD_STATUS.indexOf(lead.status);
    const next = LEAD_STATUS[Math.min(idx + 1, LEAD_STATUS.length - 1)];
    await updateRow("leads", id, { status: next }, mapLead, "leads");
    if (next === "Convertido") {
      await insertRow("deals", dealToDb({
        cliente: lead.nome,
        titulo: `Oportunidade · ${lead.origem}`,
        valor: 0, dias: 0, prob: 20,
        stage: state.etapas[0] ?? "Lead",
        contato: lead.tel, email: lead.email,
        origemLeadId: lead.id,
      }), mapDeal, "deals");
    }
  }, [state.leads, state.etapas]);

  // ----- Campanhas -----
  const addCampanha = useCallback(async (c: Omit<Campanha, "id">) => {
    await insertRow("campanhas", c, mapCamp, "campanhas");
  }, []);
  const updateCampanha = useCallback((id: string, pa: Partial<Campanha>) =>
    updateRow("campanhas", id, pa, mapCamp, "campanhas"), []);
  const removeCampanha = useCallback((id: string) => deleteRow("campanhas", id, "campanhas"), []);

  // ----- Eventos -----
  const addEvento = useCallback(async (e: Omit<Evento, "id">) => {
    await insertRow("eventos", e, mapEvento, "eventos");
  }, []);
  const updateEvento = useCallback((id: string, pa: Partial<Evento>) =>
    updateRow("eventos", id, pa, mapEvento, "eventos"), []);
  const removeEvento = useCallback((id: string) => deleteRow("eventos", id, "eventos"), []);

  return (
    <DataContext.Provider
      value={{
        ...state,
        addContato, updateContato, removeContato,
        addCategoria, updateCategoria, removeCategoria,
        addBanco, updateBanco, removeBanco, saldoBanco,
        addProduto, updateProduto, removeProduto,
        addEtapa, renameEtapa, removeEtapa, moveEtapa,
        addLancamento, updateLancamento, removeLancamento,
        addParcelamento, removeParcelamento, saveRateios,
        addTransferencia, removeTransferencia,
        addDeal, updateDeal, removeDeal,
        addLead, updateLead, removeLead, advanceLeadStatus,
        addCampanha, updateCampanha, removeCampanha,
        addEvento, updateEvento, removeEvento,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
