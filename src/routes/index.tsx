import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  DollarSign, TrendingUp, Briefcase, Users, CalendarClock, AlertCircle, Receipt,
} from "lucide-react";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function parseData(d: string): Date | null {
  // dd/mm or dd/mm/yyyy
  const parts = d.split("/");
  if (parts.length < 2) return null;
  const dia = Number(parts[0]); const mes = Number(parts[1]);
  const ano = parts[2] ? Number(parts[2]) : new Date().getFullYear();
  if (Number.isNaN(dia) || Number.isNaN(mes)) return null;
  return new Date(ano, mes - 1, dia);
}

function Dashboard() {
  const { lancamentos, deals, leads, eventos } = useData();
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const lancMes = lancamentos.filter((l) => {
    const d = parseData(l.data);
    return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const receitaMes = lancMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0);
  const despesaMes = lancMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0);
  const lucroMes = receitaMes - despesaMes;
  const margem = receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0;

  const pipelineTotal = deals
    .filter((d) => d.stage !== "Ganho" && d.stage !== "Perdido")
    .reduce((s, d) => s + d.valor, 0);
  const pipelineCount = deals.filter((d) => d.stage !== "Ganho" && d.stage !== "Perdido").length;

  const leadsMes = leads.filter((l) => {
    const d = parseData(l.data);
    return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  }).length;

  const kpis = [
    { label: "Receita do mês", value: `R$ ${receitaMes.toLocaleString("pt-BR")}`, delta: `${lancMes.filter((l) => l.tipo === "Receita").length} lançamentos`, icon: DollarSign },
    { label: "Lucro líquido", value: `R$ ${lucroMes.toLocaleString("pt-BR")}`, delta: `Margem ${margem}%`, icon: TrendingUp },
    { label: "Pipeline", value: `R$ ${pipelineTotal.toLocaleString("pt-BR")}`, delta: `${pipelineCount} oportunidades`, icon: Briefcase },
    { label: "Leads no mês", value: String(leadsMes), delta: `${leads.length} total`, icon: Users },
  ];

  const monthly = useMemo(() => {
    const arr: { m: string; receita: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - i, 1);
      const m = ref.getMonth();
      const y = ref.getFullYear();
      const r = lancamentos.filter((l) => {
        const d = parseData(l.data);
        return l.tipo === "Receita" && d && d.getMonth() === m && d.getFullYear() === y;
      }).reduce((s, l) => s + l.valor, 0);
      const dp = lancamentos.filter((l) => {
        const d = parseData(l.data);
        return l.tipo === "Despesa" && d && d.getMonth() === m && d.getFullYear() === y;
      }).reduce((s, l) => s + l.valor, 0);
      arr.push({ m: MESES_ABREV[m], receita: r, despesas: dp });
    }
    return arr;
  }, [lancamentos, mesAtual, anoAtual]);

  const proximosEventos = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return eventos
      .filter((e) => new Date(e.data) >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 4);
  }, [eventos]);

  const leadsSemContato = leads.filter((l) => l.status === "Novo").slice(0, 4);
  const contasVencer = lancamentos.filter((l) => l.status === "Pendente" && l.tipo === "Despesa").slice(0, 4);

  const hasAny = lancamentos.length || deals.length || leads.length;

  return (
    <div className="space-y-6">
      {!hasAny && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Sistema pronto para uso. Comece cadastrando{" "}
            <Link to="/financeiro/cadastros" className="text-primary underline">bancos, clientes e categorias</Link>{" "}
            ou registrando{" "}
            <Link to="/financeiro/lancamentos" className="text-primary underline">lançamentos</Link>.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <k.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{k.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="#F57C00" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#3A3A3A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Próximas atividades</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {proximosEventos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem atividades agendadas.</p>
            )}
            {proximosEventos.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground">{e.tipo}{e.canal ? ` · ${e.canal}` : ""}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{new Date(e.data).toLocaleDateString("pt-BR")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Leads sem contato</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {leadsSemContato.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem leads pendentes.</p>
            )}
            {leadsSemContato.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">{l.origem}</p>
                </div>
                <span className="text-xs text-muted-foreground">{l.data}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Contas a vencer</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {contasVencer.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem contas pendentes.</p>
            )}
            {contasVencer.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{c.desc}</p>
                  <p className="text-xs text-muted-foreground">Vence {c.data}</p>
                </div>
                <span className="text-sm font-semibold text-red-500">R$ {c.valor.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
