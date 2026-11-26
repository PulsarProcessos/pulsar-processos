import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useData, ehEtapaGanha, ehEtapaPerdida } from "@/lib/data-store";
import { brl, formatarData, hojeISO } from "@/lib/pessoal-store";

// Visão geral da empresa seguindo o caminho do cliente: Marketing atrai → Comercial vende →
// Financeiro recebe e mostra o lucro. Cada parte mostra seus números e o que fazer agora.
export const Route = createFileRoute("/empreendedor/")({
  component: Dashboard,
});

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const pad = (n: number) => String(n).padStart(2, "0");

function Dashboard() {
  const { lancamentos, deals, leads, eventos, loading } = useData();
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();
  const chaveMes = `${anoAtual}-${pad(mesAtual + 1)}`;
  const hojeStr = hojeISO();

  // Datas do banco chegam como "AAAA-MM-DD": comparar o texto evita o new Date(), que lê em UTC.
  const lancMes = lancamentos.filter((l) => l.data.startsWith(chaveMes));
  const receitaMes = lancMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0);
  const despesaMes = lancMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0);
  const lucroMes = receitaMes - despesaMes;
  const margem = receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0;

  const abertos = deals.filter((d) => !ehEtapaGanha(d.stage) && !ehEtapaPerdida(d.stage));
  const ganhos = deals.filter((d) => ehEtapaGanha(d.stage));
  const emNegociacao = abertos.reduce((s, d) => s + d.valor, 0);

  const leadsMes = leads.filter((l) => l.data?.startsWith(chaveMes)).length;
  const semContato = leads.filter((l) => l.status === "Novo");

  const monthly = useMemo(() => {
    const arr: { m: string; receita: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - i, 1);
      const chave = `${ref.getFullYear()}-${pad(ref.getMonth() + 1)}`;
      const doMes = lancamentos.filter((l) => l.data.startsWith(chave));
      arr.push({
        m: MESES_ABREV[ref.getMonth()],
        receita: doMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0),
        despesas: doMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0),
      });
    }
    return arr;
  }, [lancamentos, mesAtual, anoAtual]);

  const proximosEventos = useMemo(() => eventos
    .filter((e) => e.data >= hojeStr)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 4), [eventos, hojeStr]);

  const maioresAbertos = [...abertos].sort((a, b) => b.valor - a.valor).slice(0, 4);
  // As mais antigas primeiro (inclui as já vencidas, que são as mais urgentes).
  const contasVencer = lancamentos
    .filter((l) => l.status === "Pendente" && l.tipo === "Despesa")
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 4);
  const aReceber = lancamentos.filter((l) => l.status === "Pendente" && l.tipo === "Receita");
  const totalAReceber = aReceber.reduce((s, l) => s + l.valor, 0);

  const hasAny = lancamentos.length || deals.length || leads.length;

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      {!hasAny && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Para começar</CardTitle>
            <CardDescription>Três cadastros e o sistema já mostra o caminho da sua empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                { para: "/empreendedor/financeiro/cadastros", titulo: "Contas e categorias", texto: "Onde o dinheiro entra e sai, no Financeiro." },
                { para: "/empreendedor/comercial/cadastros", titulo: "Produtos e etapas", texto: "O que você vende e as etapas da venda." },
                { para: "/empreendedor/marketing", titulo: "Primeiro lead", texto: "Quem se interessou pelo seu negócio." },
              ].map((p, i) => (
                <li key={p.para}>
                  <Link to={p.para} className="flex h-full gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-primary/60">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                    <span>
                      <span className="block text-sm font-semibold">{p.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{p.texto}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <section aria-label="Caminho do cliente" className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">O caminho do cliente</h2>
          <p className="text-sm text-muted-foreground">
            O Marketing atrai, o Comercial transforma em venda e o Financeiro recebe e mostra o lucro.
          </p>
        </div>
        <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Etapa numero={1} area="Marketing" dica="atrair clientes" para="/empreendedor/marketing"
            rotulo="Leads no mês" valor={String(leadsMes)}
            detalhe={`${semContato.length} sem contato · ${leads.length} no total`} />
          <Seta />
          <Etapa numero={2} area="Comercial" dica="transformar em vendas" para="/empreendedor/comercial"
            rotulo="Em negociação" valor={brl(emNegociacao)}
            detalhe={`${abertos.length} ${abertos.length === 1 ? "oportunidade" : "oportunidades"} · ${ganhos.length} ${ganhos.length === 1 ? "venda ganha" : "vendas ganhas"}`} />
          <Seta />
          <Etapa numero={3} area="Financeiro" dica="receber e ver o lucro" para="/empreendedor/financeiro"
            rotulo="Lucro do mês" valor={brl(lucroMes)} cor={lucroMes >= 0 ? "text-emerald-600" : "text-red-500"}
            detalhe={`Receita ${brl(receitaMes)} · margem ${margem}%`} />
        </div>
      </section>

      <section aria-label="O que fazer agora" className="space-y-3">
        <h2 className="text-base font-semibold">O que fazer agora</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Lista area="Marketing" titulo="Leads sem contato" para="/empreendedor/marketing" vazio="Nenhum lead esperando contato.">
            {semContato.slice(0, 4).map((l) => (
              <Linha key={l.id} titulo={l.nome} detalhe={l.origem}
                lado={<span className="text-xs text-muted-foreground">{l.data ? formatarData(l.data) : ""}</span>} />
            ))}
          </Lista>

          <Lista area="Comercial" titulo="Maiores negócios em aberto" para="/empreendedor/comercial" vazio="Nenhuma oportunidade em aberto.">
            {maioresAbertos.map((d) => (
              <Linha key={d.id} titulo={d.cliente} detalhe={`${d.titulo} · ${d.stage}`}
                lado={<span className="text-sm font-semibold tabular-nums">{brl(d.valor)}</span>} />
            ))}
          </Lista>

          <Lista area="Financeiro" titulo="Contas a pagar" para="/empreendedor/financeiro/lancamentos" vazio="Nenhuma conta pendente."
            rodape={aReceber.length > 0 ? `A receber: ${brl(totalAReceber)} em ${aReceber.length} ${aReceber.length === 1 ? "lançamento" : "lançamentos"}` : undefined}>
            {contasVencer.map((c) => (
              <Linha key={c.id} titulo={c.desc}
                detalhe={`${c.data < hojeStr ? "Venceu em" : "Vence"} ${formatarData(c.data)}`}
                lado={<span className={`text-sm font-semibold tabular-nums ${c.data < hojeStr ? "text-red-500" : ""}`}>{brl(c.valor)}</span>} />
            ))}
          </Lista>
        </div>
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Receita vs Despesas</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
              <XAxis dataKey="m" stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.01 270)", borderRadius: 8 }}
                formatter={(v: number) => brl(v)}
              />
              <Legend />
              {/* Sem a animação de entrada: com ela (recharts 2) as barras não apareciam, só os eixos. */}
              <Bar dataKey="receita" name="Receita" fill="#F57C00" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="despesas" name="Despesas" fill="#3A3A3A" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {proximosEventos.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Próximas atividades</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {proximosEventos.map((e) => (
              <Linha key={e.id} titulo={e.titulo} detalhe={`${e.tipo}${e.canal ? ` · ${e.canal}` : ""}`}
                lado={<Badge variant="secondary">{formatarData(e.data)}</Badge>} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Etapa({ numero, area, dica, para, rotulo, valor, detalhe, cor = "" }: {
  numero: number; area: string; dica: string; para: string;
  rotulo: string; valor: string; detalhe: string; cor?: string;
}) {
  return (
    <Link to={para} className="group block min-w-0">
      <Card className="h-full border-border/60 transition-colors group-hover:border-primary/60">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {numero}
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{area}</CardTitle>
            <CardDescription>{dica}</CardDescription>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
          <p className={`text-2xl font-semibold tracking-tight tabular-nums ${cor}`}>{valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Seta entre as etapas: para baixo no celular, para o lado no computador. */
function Seta() {
  return (
    <div aria-hidden className="flex items-center justify-center text-primary/60">
      <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
    </div>
  );
}

function Lista({ area, titulo, para, vazio, rodape, children }: {
  area: string; titulo: string; para: string; vazio: string; rodape?: string; children: ReactNode[];
}) {
  return (
    // min-w-0: sem isso o texto longo (truncate) alarga a coluna da grade além da tela no celular.
    <Card className="flex min-w-0 flex-col border-border/60">
      <CardHeader className="pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{area}</p>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {children.length === 0
          ? <p className="text-sm text-muted-foreground">{vazio}</p>
          : <div className="space-y-3">{children}</div>}
        {rodape && <p className="text-xs text-muted-foreground">{rodape}</p>}
        <Button asChild variant="outline" size="sm" className="mt-auto self-start">
          <Link to={para}>Abrir {area} <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Linha({ titulo, detalhe, lado }: { titulo: string; detalhe?: string; lado?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{titulo}</p>
        {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
      </div>
      <div className="shrink-0">{lado}</div>
    </div>
  );
}
