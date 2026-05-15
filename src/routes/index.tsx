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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Users,
  Target,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const revenue = [
  { m: "Jan", v: 32000 },
  { m: "Fev", v: 41000 },
  { m: "Mar", v: 38500 },
  { m: "Abr", v: 52000 },
  { m: "Mai", v: 49000 },
  { m: "Jun", v: 61000 },
  { m: "Jul", v: 68000 },
];

const channels = [
  { c: "Google", v: 420 },
  { c: "Meta", v: 310 },
  { c: "Email", v: 220 },
  { c: "Direto", v: 180 },
  { c: "Outros", v: 95 },
];

const kpis = [
  {
    label: "Receita do mês",
    value: "R$ 68.420",
    delta: "+12,4%",
    up: true,
    icon: DollarSign,
  },
  { label: "Novos clientes", value: "184", delta: "+8,1%", up: true, icon: Users },
  { label: "Taxa de conversão", value: "4,8%", delta: "-0,6%", up: false, icon: Target },
  { label: "Sessões ativas", value: "1.246", delta: "+22%", up: true, icon: Activity },
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
              <div className="text-2xl font-semibold tracking-tight">
                {k.value}
              </div>
              <p
                className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                  k.up ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {k.up ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {k.delta} vs mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle>Receita</CardTitle>
            <CardDescription>Evolução mensal — últimos 7 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.58 0.21 280)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.58 0.21 280)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
                <XAxis dataKey="m" stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.92 0.01 270)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="oklch(0.58 0.21 280)"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Leads por canal</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channels}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
                <XAxis dataKey="c" stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.92 0.01 270)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="v" fill="oklch(0.58 0.21 280)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
          <CardDescription>Últimas movimentações na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {[
              { t: "Nova proposta enviada", who: "Acme Corp", tag: "Comercial" },
              { t: "Lançamento aprovado", who: "R$ 12.400 · Vendas", tag: "Financeiro" },
              { t: "Campanha publicada", who: "Black Friday 2026", tag: "Marketing" },
              { t: "Cliente atualizado", who: "Globex Ltda.", tag: "Comercial" },
            ].map((row, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{row.t}</p>
                  <p className="text-xs text-muted-foreground">{row.who}</p>
                </div>
                <Badge variant="secondary">{row.tag}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
