import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

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
  data: string; // YYYY-MM-DD
  tipo: EventoTipo;
  canal?: string;
  obs?: string;
};

// ============ STATE ============
type State = {
  contatos: Contato[];
  categorias: Categoria[];
  bancos: Banco[];
  produtos: Produto[];
  etapas: DealStage[];
  lancamentos: Lancamento[];
  deals: Deal[];
  leads: Lead[];
  campanhas: Campanha[];
  eventos: Evento[];
};

type Ctx = State & {
  addContato: (c: Omit<Contato, "id">) => Contato;
  updateContato: (id: string, p: Partial<Contato>) => void;
  removeContato: (id: string) => void;

  addCategoria: (c: Omit<Categoria, "id">) => void;
  updateCategoria: (id: string, p: Partial<Categoria>) => void;
  removeCategoria: (id: string) => void;

  addBanco: (b: Omit<Banco, "id">) => void;
  updateBanco: (id: string, p: Partial<Banco>) => void;
  removeBanco: (id: string) => void;
  saldoBanco: (id: string) => number;

  addProduto: (p: Omit<Produto, "id">) => void;
  updateProduto: (id: string, p: Partial<Produto>) => void;
  removeProduto: (id: string) => void;

  addEtapa: (nome: string) => void;
  renameEtapa: (antigo: string, novo: string) => void;
  removeEtapa: (nome: string) => void;
  moveEtapa: (nome: string, dir: -1 | 1) => void;

  addLancamento: (l: Omit<Lancamento, "id">) => void;
  updateLancamento: (id: string, p: Partial<Lancamento>) => void;
  removeLancamento: (id: string) => void;

  addDeal: (d: Omit<Deal, "id">) => void;
  updateDeal: (id: string, p: Partial<Deal>) => void;
  removeDeal: (id: string) => void;

  addLead: (l: Omit<Lead, "id">) => void;
  updateLead: (id: string, p: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  advanceLeadStatus: (id: string) => void;

  addCampanha: (c: Omit<Campanha, "id">) => void;
  updateCampanha: (id: string, p: Partial<Campanha>) => void;
  removeCampanha: (id: string) => void;

  addEvento: (e: Omit<Evento, "id">) => void;
  updateEvento: (id: string, p: Partial<Evento>) => void;
  removeEvento: (id: string) => void;
};

const DataContext = createContext<Ctx | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const STORAGE_KEY = "pulsar.data.v1";

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
  bancos: [],
  produtos: [],
  etapas: DEFAULT_ETAPAS,
  lancamentos: [],
  deals: [],
  leads: [],
  campanhas: [],
  eventos: [],
};

function loadState(): State {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    return {
      ...emptyState,
      ...parsed,
      etapas: Array.isArray(parsed.etapas) && parsed.etapas.length > 0
        ? parsed.etapas
        : DEFAULT_ETAPAS,
    };
  } catch {
    return emptyState;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* */ }
  }, [state, loaded]);


  // ----- Contatos -----
  const addContato = useCallback((c: Omit<Contato, "id">) => {
    const novo = { ...c, id: uid() };
    setState((p) => ({ ...p, contatos: [novo, ...p.contatos] }));
    return novo;
  }, []);
  const updateContato = useCallback((id: string, pa: Partial<Contato>) =>
    setState((p) => ({ ...p, contatos: p.contatos.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeContato = useCallback((id: string) =>
    setState((p) => ({ ...p, contatos: p.contatos.filter((x) => x.id !== id) })), []);

  // ----- Categorias -----
  const addCategoria = useCallback((c: Omit<Categoria, "id">) =>
    setState((p) => ({ ...p, categorias: [{ ...c, id: uid() }, ...p.categorias] })), []);
  const updateCategoria = useCallback((id: string, pa: Partial<Categoria>) =>
    setState((p) => ({ ...p, categorias: p.categorias.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeCategoria = useCallback((id: string) =>
    setState((p) => ({ ...p, categorias: p.categorias.filter((x) => x.id !== id) })), []);

  // ----- Bancos -----
  const addBanco = useCallback((b: Omit<Banco, "id">) =>
    setState((p) => ({ ...p, bancos: [{ ...b, id: uid() }, ...p.bancos] })), []);
  const updateBanco = useCallback((id: string, pa: Partial<Banco>) =>
    setState((p) => ({ ...p, bancos: p.bancos.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeBanco = useCallback((id: string) =>
    setState((p) => ({ ...p, bancos: p.bancos.filter((x) => x.id !== id) })), []);
  const saldoBanco = useCallback((id: string) => {
    const b = state.bancos.find((x) => x.id === id);
    if (!b) return 0;
    const mov = state.lancamentos
      .filter((l) => l.bancoId === id && l.status === "Pago")
      .reduce((s, l) => s + (l.tipo === "Receita" ? l.valor : -l.valor), 0);
    return b.saldoInicial + mov;
  }, [state.bancos, state.lancamentos]);

  // ----- Produtos -----
  const addProduto = useCallback((pr: Omit<Produto, "id">) =>
    setState((p) => ({ ...p, produtos: [{ ...pr, id: uid() }, ...p.produtos] })), []);
  const updateProduto = useCallback((id: string, pa: Partial<Produto>) =>
    setState((p) => ({ ...p, produtos: p.produtos.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeProduto = useCallback((id: string) =>
    setState((p) => ({ ...p, produtos: p.produtos.filter((x) => x.id !== id) })), []);

  // ----- Etapas -----
  const addEtapa = useCallback((nome: string) =>
    setState((p) => p.etapas.includes(nome) ? p : ({ ...p, etapas: [...p.etapas, nome] })), []);
  const renameEtapa = useCallback((antigo: string, novo: string) =>
    setState((p) => ({
      ...p,
      etapas: p.etapas.map((e) => (e === antigo ? novo : e)),
      deals: p.deals.map((d) => (d.stage === antigo ? { ...d, stage: novo } : d)),
    })), []);
  const removeEtapa = useCallback((nome: string) =>
    setState((p) => {
      if (p.etapas.length <= 1) return p;
      const fallback = p.etapas.find((e) => e !== nome) ?? p.etapas[0];
      return {
        ...p,
        etapas: p.etapas.filter((e) => e !== nome),
        deals: p.deals.map((d) => (d.stage === nome ? { ...d, stage: fallback } : d)),
      };
    }), []);
  const moveEtapa = useCallback((nome: string, dir: -1 | 1) =>
    setState((p) => {
      const i = p.etapas.indexOf(nome);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.etapas.length) return p;
      const next = [...p.etapas];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, etapas: next };
    }), []);

  // ----- Lançamentos -----
  const addLancamento = useCallback((l: Omit<Lancamento, "id">) =>
    setState((p) => ({ ...p, lancamentos: [{ ...l, id: uid() }, ...p.lancamentos] })), []);
  const updateLancamento = useCallback((id: string, pa: Partial<Lancamento>) =>
    setState((p) => ({ ...p, lancamentos: p.lancamentos.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeLancamento = useCallback((id: string) =>
    setState((p) => ({ ...p, lancamentos: p.lancamentos.filter((x) => x.id !== id) })), []);

  // ----- Deals -----
  const addDeal = useCallback((d: Omit<Deal, "id">) =>
    setState((p) => ({ ...p, deals: [{ ...d, id: uid() }, ...p.deals] })), []);
  const updateDeal = useCallback((id: string, pa: Partial<Deal>) =>
    setState((p) => ({ ...p, deals: p.deals.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeDeal = useCallback((id: string) =>
    setState((p) => ({ ...p, deals: p.deals.filter((x) => x.id !== id) })), []);

  // ----- Leads -----
  const addLead = useCallback((l: Omit<Lead, "id">) =>
    setState((p) => ({ ...p, leads: [{ ...l, id: uid() }, ...p.leads] })), []);
  const updateLead = useCallback((id: string, pa: Partial<Lead>) =>
    setState((p) => ({ ...p, leads: p.leads.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeLead = useCallback((id: string) =>
    setState((p) => ({ ...p, leads: p.leads.filter((x) => x.id !== id) })), []);

  const advanceLeadStatus = useCallback((id: string) => {
    setState((prev) => {
      const lead = prev.leads.find((l) => l.id === id);
      if (!lead) return prev;
      if (lead.status === "Convertido" || lead.status === "Perdido") return prev;
      const idx = LEAD_STATUS.indexOf(lead.status);
      const next = LEAD_STATUS[Math.min(idx + 1, LEAD_STATUS.length - 1)];
      const novosLeads = prev.leads.map((l) => (l.id === id ? { ...l, status: next } : l));
      let novosDeals = prev.deals;
      if (next === "Convertido") {
        novosDeals = [
          {
            id: uid(),
            cliente: lead.nome,
            titulo: `Oportunidade · ${lead.origem}`,
            valor: 0,
            dias: 0,
            prob: 20,
            stage: prev.etapas[0] ?? "Lead",
            contato: lead.tel,
            email: lead.email,
            origemLeadId: lead.id,
          },
          ...prev.deals,
        ];
      }
      return { ...prev, leads: novosLeads, deals: novosDeals };
    });
  }, []);

  // ----- Campanhas -----
  const addCampanha = useCallback((c: Omit<Campanha, "id">) =>
    setState((p) => ({ ...p, campanhas: [{ ...c, id: uid() }, ...p.campanhas] })), []);
  const updateCampanha = useCallback((id: string, pa: Partial<Campanha>) =>
    setState((p) => ({ ...p, campanhas: p.campanhas.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeCampanha = useCallback((id: string) =>
    setState((p) => ({ ...p, campanhas: p.campanhas.filter((x) => x.id !== id) })), []);

  // ----- Eventos -----
  const addEvento = useCallback((e: Omit<Evento, "id">) =>
    setState((p) => ({ ...p, eventos: [{ ...e, id: uid() }, ...p.eventos] })), []);
  const updateEvento = useCallback((id: string, pa: Partial<Evento>) =>
    setState((p) => ({ ...p, eventos: p.eventos.map((x) => (x.id === id ? { ...x, ...pa } : x)) })), []);
  const removeEvento = useCallback((id: string) =>
    setState((p) => ({ ...p, eventos: p.eventos.filter((x) => x.id !== id) })), []);

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
