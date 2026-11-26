import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight, BarChart3, Briefcase, CalendarDays, Compass, CreditCard, FileSpreadsheet,
  Handshake, HandCoins, LayoutDashboard, Megaphone, Package, PiggyBank, Receipt, Settings2,
  ShieldCheck, Tags, Target, TrendingUp, UserPlus, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/components/auth-gate";

// Módulos do sistema. Cada pessoa vê só os módulos liberados pelo administrador
// (tabela modulos_usuario); as regras do banco garantem isso também fora das telas.

export type ModuloId = "empreendedor" | "pessoal" | "admin";

export type ItemMenu = {
  titulo: string;
  url: string;
  icone: LucideIcon;
};

/**
 * Parte do menu, na ordem do raciocínio do módulo (ex.: Marketing atrai → Comercial vende →
 * Financeiro recebe), para a pessoa saber o que vem antes.
 */
export type SecaoMenu = {
  /** Nome da parte; também aparece no título da tela ("Comercial · Funil de vendas"). */
  nome?: string;
  /** Com ícone, a parte vira um grupo que abre e fecha no menu; sem ícone, os itens ficam soltos. */
  icone?: LucideIcon;
  itens: ItemMenu[];
};

export type Modulo = {
  id: ModuloId;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  rota: string;
  /** Classes do cartão na tela Início e do destaque do módulo. */
  cor: { fundo: string; icone: string };
  menu: SecaoMenu[];
};

export const MODULOS: Record<ModuloId, Modulo> = {
  empreendedor: {
    id: "empreendedor",
    nome: "Empreendedor",
    descricao: "Marketing, comercial, financeiro e agenda da empresa",
    icone: Briefcase,
    rota: "/empreendedor",
    cor: { fundo: "from-orange-500/15 to-orange-500/5 border-orange-500/30", icone: "bg-orange-500 text-white" },
    menu: [
      {
        itens: [
          { titulo: "Visão geral", url: "/empreendedor", icone: LayoutDashboard },
          { titulo: "Agenda", url: "/empreendedor/agenda", icone: CalendarDays },
        ],
      },
      {
        nome: "Marketing", icone: Megaphone,
        itens: [
          { titulo: "Leads", url: "/empreendedor/marketing", icone: UserPlus },
          { titulo: "Campanhas", url: "/empreendedor/marketing/campanhas", icone: Megaphone },
        ],
      },
      {
        nome: "Comercial", icone: Handshake,
        itens: [
          { titulo: "Funil de vendas", url: "/empreendedor/comercial", icone: Handshake },
          { titulo: "Produtos e etapas", url: "/empreendedor/comercial/cadastros", icone: Package },
        ],
      },
      {
        nome: "Financeiro", icone: TrendingUp,
        itens: [
          { titulo: "Resumo", url: "/empreendedor/financeiro", icone: TrendingUp },
          { titulo: "Extrato", url: "/empreendedor/financeiro/lancamentos", icone: Receipt },
          { titulo: "Cartões", url: "/empreendedor/financeiro/cartoes", icone: CreditCard },
          { titulo: "Demonstrativo", url: "/empreendedor/financeiro/demonstrativo", icone: FileSpreadsheet },
          { titulo: "Metas", url: "/empreendedor/financeiro/metas", icone: Target },
          { titulo: "Cadastros", url: "/empreendedor/financeiro/cadastros", icone: Settings2 },
        ],
      },
    ],
  },
  pessoal: {
    id: "pessoal",
    nome: "Pessoal",
    descricao: "Suas finanças pessoais: o que entra, o que sai e o que sobra",
    icone: Wallet,
    rota: "/pessoal",
    cor: { fundo: "from-blue-500/15 to-blue-500/5 border-blue-500/30", icone: "bg-blue-500 text-white" },
    menu: [
      { itens: [{ titulo: "Meu caminho", url: "/pessoal", icone: Compass }] },
      // Poucas telas: ficam soltas, na ordem do caminho (as partes aparecem no título da tela).
      {
        nome: "Onde estou",
        itens: [
          { titulo: "Rendas e contas fixas", url: "/pessoal/dinheiro-e-contas", icone: PiggyBank },
          { titulo: "Dívidas", url: "/pessoal/dividas", icone: HandCoins },
        ],
      },
      {
        nome: "Meu mês",
        itens: [
          { titulo: "Dia a dia", url: "/pessoal/movimentacoes", icone: ArrowLeftRight },
          { titulo: "Resultado do ano", url: "/pessoal/resultado", icone: BarChart3 },
        ],
      },
      { itens: [{ titulo: "Categorias", url: "/pessoal/categorias", icone: Tags }] },
    ],
  },
  admin: {
    id: "admin",
    nome: "Administração",
    descricao: "Pessoas com acesso, senhas e módulos liberados",
    icone: ShieldCheck,
    rota: "/admin",
    cor: { fundo: "from-zinc-500/15 to-zinc-500/5 border-zinc-500/30", icone: "bg-zinc-700 text-white" },
    menu: [{ itens: [{ titulo: "Usuários", url: "/admin", icone: Users }] }],
  },
};

export const ORDEM_MODULOS: ModuloId[] = ["empreendedor", "pessoal", "admin"];

/** Título da tela atual dentro do módulo, a partir do menu ("Comercial · Funil de vendas"). */
export function tituloDaTela(modulo: Modulo, caminho: string) {
  const atual = caminho.length > 1 ? caminho.replace(/\/$/, "") : caminho;
  for (const secao of modulo.menu) {
    const item = secao.itens.find((i) => i.url === atual);
    if (item) return secao.nome ? `${secao.nome} · ${item.titulo}` : item.titulo;
  }
  return modulo.nome;
}

/** Módulos que a pessoa conectada pode usar. Administração depende do perfil de administrador. */
export function useAcesso() {
  const sessao = useSessao();
  const admin = sessao.user.app_metadata?.role === "admin";
  const consulta = useQuery({
    queryKey: ["acesso", sessao.user.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("modulos_usuario").select("modulo");
      if (error) throw error;
      return (data as { modulo: ModuloId }[]).map((d) => d.modulo);
    },
  });
  const liberados = new Set<ModuloId>(consulta.data ?? []);
  if (admin) liberados.add("admin");
  return {
    carregando: consulta.isLoading,
    erro: consulta.error as Error | null,
    admin,
    pode: (m: ModuloId) => liberados.has(m),
    modulos: ORDEM_MODULOS.filter((m) => liberados.has(m)).map((m) => MODULOS[m]),
  };
}
