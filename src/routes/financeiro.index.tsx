import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/financeiro/")({
  component: FinanceiroOverview,
});

const cashflow = [
  { m: "Jan", entrada: 42000, saida: 28000 },
  { m: "Fev", entrada: 51000, saida: 31000 },
  { m: "Mar", entrada: 47000, saida: 29500 },
  { m: "Abr", entrada: 62000, saida: 34000 },
  { m: "Mai", entrada: 58000, saida: 33000 },
  { m: "Jun", entrada: 71000, saida: 38000 },
];

function FinanceiroOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "Saldo atual", v: "R$ 184.230" },
          { l: "Entradas (mês)", v: "R$ 71.000" },
          { l: "Saídas (mês)", v: "R$ 38.000" },
        ].map((k) => (
          <Card key={k.l} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.l}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Fluxo de caixa</CardTitle>
          <CardDescription>Entradas vs saídas — semestre</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashflow}>
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
              <Line type="monotone" dataKey="entrada" stroke="oklch(0.58 0.21 280)" strokeWidth={2} />
              <Line type="monotone" dataKey="saida" stroke="oklch(0.65 0.2 20)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
