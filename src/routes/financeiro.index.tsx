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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/financeiro/")({
  component: FinanceiroOverview,
});

const cashflow = [
  { m: "Dez", receita: 6800 },
  { m: "Jan", receita: 7200 },
  { m: "Fev", receita: 7500 },
  { m: "Mar", receita: 7900 },
  { m: "Abr", receita: 8000 },
  { m: "Mai", receita: 8200 },
];

const totalReceitas = 8200;
const totalDespesas = 5100;
const lucro = totalReceitas - totalDespesas;
const margem = Math.round((lucro / totalReceitas) * 100);

const despesasCategoria = [
  { c: "Folha de pagamento", v: 2400 },
  { c: "Aluguel & utilidades", v: 1800 },
  { c: "Marketing", v: 480 },
  { c: "Ferramentas SaaS", v: 280 },
  { c: "Outros", v: 140 },
];
const totalCat = despesasCategoria.reduce((s, d) => s + d.v, 0);

function FinanceiroOverview() {
  const dre = [
    { l: "Total de receitas", v: `R$ ${totalReceitas.toLocaleString("pt-BR")}`, color: "text-emerald-600" },
    { l: "Total de despesas", v: `R$ ${totalDespesas.toLocaleString("pt-BR")}`, color: "text-red-500" },
    { l: "Lucro bruto", v: `R$ ${lucro.toLocaleString("pt-BR")}`, color: "text-foreground" },
    { l: "Margem", v: `${margem}%`, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dre.map((k) => (
          <Card key={k.l} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.l}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${k.color}`}>{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Receita</CardTitle>
          <CardDescription>Evolução dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashflow}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
              <XAxis dataKey="m" stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 270)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.01 270)", borderRadius: 8 }}
                formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
              />
              <Line type="monotone" dataKey="receita" stroke="#6C63FF" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Maiores despesas por categoria</CardTitle>
          <CardDescription>Mês atual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Participação</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasCategoria.map((d) => {
                const pct = Math.round((d.v / totalCat) * 100);
                return (
                  <TableRow key={d.c}>
                    <TableCell className="font-medium">{d.c}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="h-2 w-32" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {d.v.toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
