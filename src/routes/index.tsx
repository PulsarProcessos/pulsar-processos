import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Briefcase,
  Users,
  CalendarClock,
  AlertCircle,
  Receipt,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const monthly = [
  { m: "Dez", receita: 6800, despesas: 4500 },
  { m: "Jan", receita: 7200, despesas: 4800 },
  { m: "Fev", receita: 7500, despesas: 4900 },
  { m: "Mar", receita: 7900, despesas: 5100 },
  { m: "Abr", receita: 8000, despesas: 5000 },
  { m: "Mai", receita: 8200, despesas: 5100 },
];

const kpis = [
  {
    label: "Receita do mês",
    value: "R$ 8.200",
    delta: "+12%",
    icon: DollarSign,
  },
  {
    label: "Lucro líquido",
    value: "R$ 3.100",
    delta: "Margem 37%",
    icon: TrendingUp,
  },
  {
    label: "Pipeline",
    value: "R$ 22.500",
    delta: "8 oportunidades",
    icon: Briefcase,
  },
  { label: "Leads no mês", value: "24", delta: "+6 vs mês anterior", icon: Users },
];

const followups = [
  { c: "Acme Corp", t: "Enviar proposta revisada", d: "Hoje, 16:00" },
  { c: "Globex", t: "Reunião de fechamento", d: "Amanhã, 10:30" },
  { c: "Initech", t: "Follow-up pós-call", d: "Sex, 14:00" },
];

const leadsSemContato = [
  { n: "Camila Souza", o: "Instagram", d: "há 2 dias" },
  { n: "Rafael Lima", o: "Indicação", d: "há 3 dias" },
  { n: "Juliana Paes", o: "Google", d: "há 5 dias" },
];

const contas = [
  { d: "Aluguel sala", v: "R$ 1.800", venc: "20/05" },
  { d: "Assinatura ferramentas", v: "R$ 480", venc: "23/05" },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.label}
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <k.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                {k.delta}
              </p>
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
                contentStyle={{
                  background: "white",
                  border: "1px solid oklch(0.92 0.01 270)",
                  borderRadius: 8,
                }}
                formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="#6C63FF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#FF6584" radius={[6, 6, 0, 0]} />
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
            {followups.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{f.t}</p>
                  <p className="text-xs text-muted-foreground">{f.c}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{f.d}</Badge>
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
            {leadsSemContato.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{l.n}</p>
                  <p className="text-xs text-muted-foreground">{l.o}</p>
                </div>
                <span className="text-xs text-muted-foreground">{l.d}</span>
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
            {contas.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{c.d}</p>
                  <p className="text-xs text-muted-foreground">Vence {c.venc}</p>
                </div>
                <span className="text-sm font-semibold text-red-500">{c.v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
