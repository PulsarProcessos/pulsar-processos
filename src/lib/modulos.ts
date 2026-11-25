import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight, Briefcase, CalendarDays, Handshake, HandCoins, LayoutDashboard, ListPlus,
  Megaphone, PiggyBank, ShieldCheck, Tags, TrendingUp, Users, Wallet, type LucideIcon,
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
  filhos?: { titulo: string; url: string }[];
};

export type Modulo = {
  id: ModuloId;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  rota: string;
  /** Classes do cartão na tela Início e do destaque do módulo. */
  cor: { fundo: string; icone: string };
  menu: ItemMenu[];
};

export const MODULOS: Record<ModuloId, Modulo> = {
  empreendedor: {
    id: "empreendedor",
    nome: "Empreendedor",
    descricao: "Financeiro, comercial, marketing e agenda da empresa",
    icone: Briefcase,
    rota: "/empreendedor",
    cor: { fundo: "from-orange-500/15 to-orange-500/5 border-orange-500/30", icone: "bg-orange-500 text-white" },
    menu: [
      { titulo: "Visão geral", url: "/empreendedor", icone: LayoutDashboard },
      { titulo: "Agenda", url: "/empreendedor/agenda", icone: CalendarDays },
      {
        titulo: "Financeiro",
        url: "/empreendedor/financeiro",
        icone: TrendingUp,
        filhos: [
          { titulo: "Visão Geral", url: "/empreendedor/financeiro" },
          { titulo: "Extrato", url: "/empreendedor/financeiro/lancamentos" },
          { titulo: "Cartões", url: "/empreendedor/financeiro/cartoes" },
          { titulo: "Demonstrativo", url: "/empreendedor/financeiro/demonstrativo" },
          { titulo: "Cadastros", url: "/empreendedor/financeiro/cadastros" },
          { titulo: "Metas", url: "/empreendedor/financeiro/metas" },
        ],
      },
      {
        titulo: "Comercial",
        url: "/empreendedor/comercial",
        icone: Handshake,
        filhos: [
          { titulo: "Pipeline", url: "/empreendedor/comercial" },
          { titulo: "Cadastros", url: "/empreendedor/comercial/cadastros" },
        ],
      },
      {
        titulo: "Marketing",
        url: "/empreendedor/marketing",
        icone: Megaphone,
        filhos: [
          { titulo: "Leads", url: "/empreendedor/marketing" },
          { titulo: "Campanhas", url: "/empreendedor/marketing/campanhas" },
        ],
      },
    ],
  },
  pessoal: {
    id: "pessoal",
    nome: "Pessoal",
    descricao: "Suas finanças pessoais: gastos, contas fixas e dívidas",
    icone: Wallet,
    rota: "/pessoal",
    cor: { fundo: "from-blue-500/15 to-blue-500/5 border-blue-500/30", icone: "bg-blue-500 text-white" },
    menu: [
      { titulo: "Painel", url: "/pessoal", icone: LayoutDashboard },
      { titulo: "Movimentações", url: "/pessoal/movimentacoes", icone: ArrowLeftRight },
      { titulo: "Lançamentos", url: "/pessoal/lancamentos", icone: ListPlus },
      { titulo: "Dinheiro e Contas", url: "/pessoal/dinheiro-e-contas", icone: PiggyBank },
      { titulo: "Dívidas", url: "/pessoal/dividas", icone: HandCoins },
      { titulo: "Categorias", url: "/pessoal/categorias", icone: Tags },
    ],
  },
  admin: {
    id: "admin",
    nome: "Administração",
    descricao: "Pessoas com acesso, senhas e módulos liberados",
    icone: ShieldCheck,
    rota: "/admin",
    cor: { fundo: "from-zinc-500/15 to-zinc-500/5 border-zinc-500/30", icone: "bg-zinc-700 text-white" },
    menu: [{ titulo: "Usuários", url: "/admin", icone: Users }],
  },
};

export const ORDEM_MODULOS: ModuloId[] = ["empreendedor", "pessoal", "admin"];

/** Título da tela atual dentro do módulo, a partir do menu. */
export function tituloDaTela(modulo: Modulo, caminho: string) {
  const atual = caminho.length > 1 ? caminho.replace(/\/$/, "") : caminho;
  for (const item of modulo.menu) {
    const filho = item.filhos?.find((f) => f.url === atual);
    if (filho) return `${item.titulo} · ${filho.titulo}`;
    if (item.url === atual) return item.titulo;
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
