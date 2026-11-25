import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/")({
  component: FinanceiroOverview,
});

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function parseData(d: string): Date | null {
  if (!d) return null;
  if (d.includes("-")) {
    const [y, m, day] = d.split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  }
  const parts = d.split("/");
  if (parts.length < 2) return null;
  const dia = Number(parts[0]); const mes = Number(parts[1]);
  const ano = parts[2] ? Number(parts[2]) : new Date().getFullYear();
  if (Number.isNaN(dia) || Number.isNaN(mes)) return null;
  return new Date(ano, mes - 1, dia);
}

function FinanceiroOverview() {
  const { lancamentos, categorias, bancos, saldoBanco } = useData();
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const lancMes = lancamentos.filter((l) => {
    const d = parseData(l.data);
    return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const totalReceitas = lancMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0);
  const lucro = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? Math.round((lucro / totalReceitas) * 100) : 0;
  const saldoTotal = bancos.reduce((s, b) => s + saldoBanco(b.id), 0);

  const dre = [
    { l: "Total de receitas", v: `R$ ${totalReceitas.toLocaleString("pt-BR")}`, color: "text-emerald-600" },
    { l: "Total de despesas", v: `R$ ${totalDespesas.toLocaleString("pt-BR")}`, color: "text-red-500" },
    { l: "Lucro bruto", v: `R$ ${lucro.toLocaleString("pt-BR")}`, color: "text-foreground" },
    { l: "Saldo em bancos", v: `R$ ${saldoTotal.toLocaleString("pt-BR")}`, color: "text-primary" },
  ];

  const cashflow = useMemo(() => {
    const arr: { m: string; receita: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - i, 1);
      const m = ref.getMonth();
      const y = ref.getFullYear();
      const r = lancamentos.filter((l) => {
        const d = parseData(l.data);
        return l.tipo === "Receita" && d && d.getMonth() === m && d.getFullYear() === y;
      }).reduce((s, l) => s + l.valor, 0);
      arr.push({ m: MESES_ABREV[m], receita: r });
    }
    return arr;
  }, [lancamentos, mesAtual, anoAtual]);

  const despesasCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    lancMes.filter((l) => l.tipo === "Despesa").forEach((l) => {
      const cat = categorias.find((c) => c.id === l.categoriaId)?.nome ?? "Sem categoria";
      map[cat] = (map[cat] ?? 0) + l.valor;
    });
    return Object.entries(map).map(([c, v]) => ({ c, v })).sort((a, b) => b.v - a.v);
  }, [lancMes, categorias]);
  const totalCat = despesasCategoria.reduce((s, d) => s + d.v, 0);

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
              {k.l === "Lucro bruto" && <p className="mt-1 text-xs text-muted-foreground">Margem {margem}%</p>}
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
              <Line type="monotone" dataKey="receita" stroke="#F57C00" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Despesas por categoria</CardTitle>
          <CardDescription>Mês atual</CardDescription>
        </CardHeader>
        <CardContent>
          {despesasCategoria.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma despesa registrada no mês.</p>
          ) : (
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
                  const pct = totalCat > 0 ? Math.round((d.v / totalCat) * 100) : 0;
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
