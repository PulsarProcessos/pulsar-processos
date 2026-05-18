import { createContext, useContext, useState, ReactNode, useCallback } from "react";

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

export type LancTipo = "Receita" | "Despesa";
export type LancStatus = "Pago" | "Pendente";
export type Lancamento = {
  id: string;
  data: string;
  desc: string;
  categoriaId: string;
  contatoId?: string;
  tipo: LancTipo;
  valor: number;
  status: LancStatus;
};

export type DealStage =
  | "Lead"
  | "Qualificado"
  | "Proposta Enviada"
  | "Negociação"
  | "Ganho"
  | "Perdido";
export type Deal = {
  id: string;
  cliente: string;
  titulo: string;
  valor: number;
  dias: number;
  prob: number;
  stage: DealStage;
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
  lancamentos: Lancamento[];
  deals: Deal[];
  leads: Lead[];
  campanhas: Campanha[];
  eventos: Evento[];
};

type Ctx = State & {
  // contatos
  addContato: (c: Omit<Contato, "id">) => Contato;
  updateContato: (id: string, p: Partial<Contato>) => void;
  removeContato: (id: string) => void;
  // categorias
  addCategoria: (c: Omit<Categoria, "id">) => void;
  updateCategoria: (id: string, p: Partial<Categoria>) => void;
  removeCategoria: (id: string) => void;
  // lançamentos
  addLancamento: (l: Omit<Lancamento, "id">) => void;
  updateLancamento: (id: string, p: Partial<Lancamento>) => void;
  removeLancamento: (id: string) => void;
  // deals
  addDeal: (d: Omit<Deal, "id">) => void;
  updateDeal: (id: string, p: Partial<Deal>) => void;
  removeDeal: (id: string) => void;
  // leads
  addLead: (l: Omit<Lead, "id">) => void;
  updateLead: (id: string, p: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  advanceLeadStatus: (id: string) => void;
  // campanhas
  addCampanha: (c: Omit<Campanha, "id">) => void;
  updateCampanha: (id: string, p: Partial<Campanha>) => void;
  removeCampanha: (id: string) => void;
  // eventos
  addEvento: (e: Omit<Evento, "id">) => void;
  updateEvento: (id: string, p: Partial<Evento>) => void;
  removeEvento: (id: string) => void;
};

const DataContext = createContext<Ctx | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ============ SEEDS ============
const seedContatos: Contato[] = [
  { id: "c1", nome: "Acme Corp", tipo: "Cliente", email: "contato@acme.com", telefone: "(11) 4002-8922" },
  { id: "c2", nome: "Globex", tipo: "Cliente", email: "ops@globex.com" },
  { id: "c3", nome: "Initech", tipo: "Cliente", email: "fin@initech.com" },
  { id: "c4", nome: "Meta Plataformas", tipo: "Fornecedor", email: "billing@meta.com" },
  { id: "c5", nome: "Imobiliária Centro", tipo: "Fornecedor", telefone: "(11) 3333-4444" },
  { id: "c6", nome: "Folha de Pagamento", tipo: "Fornecedor" },
];

const seedCategorias: Categoria[] = [
  { id: "cat1", nome: "Vendas", tipo: "Receita" },
  { id: "cat2", nome: "Consultoria", tipo: "Receita" },
  { id: "cat3", nome: "Marketing", tipo: "Despesa" },
  { id: "cat4", nome: "Folha", tipo: "Despesa" },
  { id: "cat5", nome: "Operacional", tipo: "Despesa" },
  { id: "cat6", nome: "Impostos", tipo: "Despesa" },
];

const seedLancamentos: Lancamento[] = [
  { id: "l1", data: "12/05", desc: "Mensalidade · Acme Corp", categoriaId: "cat1", contatoId: "c1", tipo: "Receita", valor: 2400, status: "Pago" },
  { id: "l2", data: "11/05", desc: "Anúncios Meta Ads", categoriaId: "cat3", contatoId: "c4", tipo: "Despesa", valor: 480, status: "Pago" },
  { id: "l3", data: "10/05", desc: "Mensalidade · Globex", categoriaId: "cat1", contatoId: "c2", tipo: "Receita", valor: 1800, status: "Pago" },
  { id: "l4", data: "09/05", desc: "Salários", categoriaId: "cat4", contatoId: "c6", tipo: "Despesa", valor: 2400, status: "Pago" },
  { id: "l5", data: "08/05", desc: "Consultoria · Initech", categoriaId: "cat2", contatoId: "c3", tipo: "Receita", valor: 1500, status: "Pendente" },
  { id: "l6", data: "05/05", desc: "Aluguel sala", categoriaId: "cat5", contatoId: "c5", tipo: "Despesa", valor: 1800, status: "Pendente" },
];

const seedDeals: Deal[] = [
  { id: "d1", cliente: "Acme Corp", titulo: "Implementação CRM", valor: 4800, dias: 2, prob: 20, stage: "Lead" },
  { id: "d2", cliente: "Soylent", titulo: "Consultoria mensal", valor: 2400, dias: 5, prob: 30, stage: "Lead" },
  { id: "d3", cliente: "Globex", titulo: "Auditoria fiscal", valor: 3200, dias: 3, prob: 50, stage: "Qualificado" },
  { id: "d4", cliente: "Initech", titulo: "Setup financeiro", valor: 1800, dias: 7, prob: 60, stage: "Proposta Enviada" },
  { id: "d5", cliente: "Umbrella", titulo: "Pacote anual", valor: 9600, dias: 4, prob: 65, stage: "Proposta Enviada" },
  { id: "d6", cliente: "Hooli", titulo: "Mentoria executiva", valor: 5400, dias: 1, prob: 80, stage: "Negociação" },
  { id: "d7", cliente: "Wayne Ent.", titulo: "Plano corporativo", valor: 7200, dias: 10, prob: 100, stage: "Ganho" },
  { id: "d8", cliente: "Stark Ind.", titulo: "Projeto pontual", valor: 2400, dias: 14, prob: 0, stage: "Perdido" },
];

const seedLeads: Lead[] = [
  { id: "ld1", nome: "Camila Souza", email: "camila@x.com", tel: "(11) 99876-1100", origem: "Google", status: "Novo", data: "14/05" },
  { id: "ld2", nome: "Rafael Lima", email: "rafa@x.com", tel: "(11) 99776-2200", origem: "Instagram", status: "Contatado", data: "13/05" },
  { id: "ld3", nome: "Juliana Paes", email: "ju@x.com", tel: "(11) 99876-2300", origem: "Indicação", status: "Qualificado", data: "12/05" },
  { id: "ld4", nome: "Pedro Mendes", email: "pedro@x.com", tel: "(11) 99876-2400", origem: "Google", status: "Novo", data: "12/05" },
  { id: "ld5", nome: "Bianca Reis", email: "bianca@x.com", tel: "(11) 99876-2500", origem: "Evento", status: "Contatado", data: "11/05" },
  { id: "ld6", nome: "Marcos Vinícius", email: "marcos@x.com", tel: "(11) 99876-2600", origem: "Instagram", status: "Qualificado", data: "11/05" },
  { id: "ld7", nome: "Ana Beatriz", email: "ana@x.com", tel: "(11) 99876-2700", origem: "Indicação", status: "Novo", data: "10/05" },
  { id: "ld8", nome: "Tiago Ferreira", email: "tiago@x.com", tel: "(11) 99876-2800", origem: "Google", status: "Perdido", data: "09/05" },
  { id: "ld9", nome: "Letícia Almeida", email: "leticia@x.com", tel: "(11) 99876-2900", origem: "Instagram", status: "Contatado", data: "09/05" },
  { id: "ld10", nome: "Bruno Costa", email: "bruno@x.com", tel: "(11) 99876-3000", origem: "Outro", status: "Novo", data: "08/05" },
  { id: "ld11", nome: "Fernanda Dias", email: "fer@x.com", tel: "(11) 99876-3100", origem: "Evento", status: "Qualificado", data: "08/05" },
  { id: "ld12", nome: "Lucas Ramos", email: "lucas@x.com", tel: "(11) 99876-3200", origem: "Google", status: "Novo", data: "07/05" },
  { id: "ld13", nome: "Patrícia Melo", email: "patricia@x.com", tel: "(11) 99876-3300", origem: "Instagram", status: "Contatado", data: "06/05" },
  { id: "ld14", nome: "Gustavo Pires", email: "gustavo@x.com", tel: "(11) 99876-3400", origem: "Indicação", status: "Qualificado", data: "05/05" },
  { id: "ld15", nome: "Helena Castro", email: "helena@x.com", tel: "(11) 99876-3500", origem: "Outro", status: "Perdido", data: "04/05" },
];

const seedCampanhas: Campanha[] = [
  { id: "cp1", nome: "Lançamento Plano Pro", canal: "Google Ads", orcamento: 1200, inicio: "01/05", fim: "31/05", leads: 18, status: "Ativa" },
  { id: "cp2", nome: "Indicação Premiada", canal: "Email", orcamento: 400, inicio: "15/04", fim: "15/05", leads: 9, status: "Encerrada" },
  { id: "cp3", nome: "Conteúdo Instagram", canal: "Instagram", orcamento: 800, inicio: "20/04", fim: "20/06", leads: 12, status: "Ativa" },
];

const today = new Date();
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const offset = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

const seedEventos: Evento[] = [
  { id: "ev1", titulo: "Post lançamento Plano Pro", data: offset(1), tipo: "Postagem", canal: "Instagram" },
  { id: "ev2", titulo: "Reels bastidores", data: offset(3), tipo: "Postagem", canal: "Instagram" },
  { id: "ev3", titulo: "Reunião pauta semanal", data: offset(2), tipo: "Reunião" },
  { id: "ev4", titulo: "Disparo de email · base ativa", data: offset(5), tipo: "Atividade", canal: "Email" },
  { id: "ev5", titulo: "Carrossel benefícios", data: offset(7), tipo: "Postagem", canal: "Instagram" },
  { id: "ev6", titulo: "Webinar gratuito", data: offset(10), tipo: "Atividade", canal: "Zoom" },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [contatos, setContatos] = useState<Contato[]>(seedContatos);
  const [categorias, setCategorias] = useState<Categoria[]>(seedCategorias);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(seedLancamentos);
  const [deals, setDeals] = useState<Deal[]>(seedDeals);
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [campanhas, setCampanhas] = useState<Campanha[]>(seedCampanhas);
  const [eventos, setEventos] = useState<Evento[]>(seedEventos);

  const addContato = useCallback((c: Omit<Contato, "id">) => {
    const novo = { ...c, id: uid() };
    setContatos((p) => [novo, ...p]);
    return novo;
  }, []);
  const updateContato = useCallback((id: string, patch: Partial<Contato>) =>
    setContatos((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeContato = useCallback((id: string) =>
    setContatos((p) => p.filter((x) => x.id !== id)), []);

  const addCategoria = useCallback((c: Omit<Categoria, "id">) =>
    setCategorias((p) => [{ ...c, id: uid() }, ...p]), []);
  const updateCategoria = useCallback((id: string, patch: Partial<Categoria>) =>
    setCategorias((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeCategoria = useCallback((id: string) =>
    setCategorias((p) => p.filter((x) => x.id !== id)), []);

  const addLancamento = useCallback((l: Omit<Lancamento, "id">) =>
    setLancamentos((p) => [{ ...l, id: uid() }, ...p]), []);
  const updateLancamento = useCallback((id: string, patch: Partial<Lancamento>) =>
    setLancamentos((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeLancamento = useCallback((id: string) =>
    setLancamentos((p) => p.filter((x) => x.id !== id)), []);

  const addDeal = useCallback((d: Omit<Deal, "id">) =>
    setDeals((p) => [{ ...d, id: uid() }, ...p]), []);
  const updateDeal = useCallback((id: string, patch: Partial<Deal>) =>
    setDeals((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeDeal = useCallback((id: string) =>
    setDeals((p) => p.filter((x) => x.id !== id)), []);

  const addLead = useCallback((l: Omit<Lead, "id">) =>
    setLeads((p) => [{ ...l, id: uid() }, ...p]), []);
  const updateLead = useCallback((id: string, patch: Partial<Lead>) =>
    setLeads((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeLead = useCallback((id: string) =>
    setLeads((p) => p.filter((x) => x.id !== id)), []);

  const advanceLeadStatus = useCallback((id: string) => {
    setLeads((prev) => {
      const lead = prev.find((l) => l.id === id);
      if (!lead) return prev;
      const idx = LEAD_STATUS.indexOf(lead.status);
      // Não avança após "Convertido" ou "Perdido"
      if (lead.status === "Convertido" || lead.status === "Perdido") return prev;
      const next = LEAD_STATUS[Math.min(idx + 1, LEAD_STATUS.length - 1)];
      // Se virar Convertido, criar deal no pipeline
      if (next === "Convertido") {
        setDeals((d) => [
          {
            id: uid(),
            cliente: lead.nome,
            titulo: `Oportunidade · ${lead.origem}`,
            valor: 0,
            dias: 0,
            prob: 20,
            stage: "Lead",
            contato: lead.tel,
            email: lead.email,
            origemLeadId: lead.id,
          },
          ...d,
        ]);
      }
      return prev.map((l) => (l.id === id ? { ...l, status: next } : l));
    });
  }, []);

  const addCampanha = useCallback((c: Omit<Campanha, "id">) =>
    setCampanhas((p) => [{ ...c, id: uid() }, ...p]), []);
  const updateCampanha = useCallback((id: string, patch: Partial<Campanha>) =>
    setCampanhas((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeCampanha = useCallback((id: string) =>
    setCampanhas((p) => p.filter((x) => x.id !== id)), []);

  const addEvento = useCallback((e: Omit<Evento, "id">) =>
    setEventos((p) => [{ ...e, id: uid() }, ...p]), []);
  const updateEvento = useCallback((id: string, patch: Partial<Evento>) =>
    setEventos((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeEvento = useCallback((id: string) =>
    setEventos((p) => p.filter((x) => x.id !== id)), []);

  return (
    <DataContext.Provider
      value={{
        contatos, categorias, lancamentos, deals, leads, campanhas, eventos,
        addContato, updateContato, removeContato,
        addCategoria, updateCategoria, removeCategoria,
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
