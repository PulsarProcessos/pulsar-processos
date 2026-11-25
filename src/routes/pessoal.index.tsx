import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MesNavegador } from "@/components/pessoal/mes-navegador";
import {
  usePessoal, brl, linhasDoMes, rendaDoMes, MESES, CategoriaPessoal, LinhaMes,
} from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/")({
  component: Painel,
});

// Cores validadas (dataviz, modo claro): verde para entradas, vermelho para gastos — as mesmas
// do resto do sistema.
const COR_RECEITA = "#059669";
const COR_GASTO = "#ef4444";
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const compacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const semCentavos = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Mes = {
  mes: number;
  rotulo: string;
  receitas: number;
  gastos: number;
  resultado: number;
  /** Receitas por linha do DRE (Rendas + categorias de entrada). */
  porReceita: Map<string, number>;
  /** Gastos por linha do DRE (categorias; sem categoria, pela origem). */
  porGasto: Map<string, number>;
  linhas: LinhaMes[];
};

/** Linha do DRE onde um gasto entra: a categoria; sem categoria, a origem. */
function grupoDoGasto(l: LinhaMes, cats: Map<string, CategoriaPessoal>) {
  const cat = l.categoriaId ? cats.get(l.categoriaId) : undefined;
  if (cat) return cat.nome;
  if (l.origem === "parcela") return "Dívidas (parcelas)";
  if (l.origem === "conta_fixa") return "Contas fixas";
  return "Sem categoria";
}

function Painel() {
  const { lancamentos, contasFixas, dividas, rendas, categorias, carregando } = usePessoal();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const mesAtual = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : null;

  const cats = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const meses = useMemo<Mes[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const linhas = linhasDoMes({ lancamentos, contasFixas, dividas }, ano, m);
      const renda = rendaDoMes(rendas, ano, m);
      const porReceita = new Map<string, number>();
      const porGasto = new Map<string, number>();
      if (renda > 0) porReceita.set("Rendas", renda);
      for (const l of linhas) {
        if (l.tipo === "Receita") {
          const nome = (l.categoriaId && cats.get(l.categoriaId)?.nome) || "Outras entradas";
          porReceita.set(nome, (porReceita.get(nome) ?? 0) + l.valor);
        } else {
          const nome = grupoDoGasto(l, cats);
          porGasto.set(nome, (porGasto.get(nome) ?? 0) + l.valor);
        }
      }
      const receitas = [...porReceita.values()].reduce((s, v) => s + v, 0);
      const gastos = [...porGasto.values()].reduce((s, v) => s + v, 0);
      return { mes: m, rotulo: MESES_ABREV[i], receitas, gastos, resultado: receitas - gastos, porReceita, porGasto, linhas };
    });
  }, [lancamentos, contasFixas, dividas, rendas, cats, ano]);

  const totalAno = useMemo(() => meses.reduce(
    (t, m) => ({ receitas: t.receitas + m.receitas, gastos: t.gastos + m.gastos }),
    { receitas: 0, gastos: 0 },
  ), [meses]);

  // Linhas do DRE, ordenadas pelo total do ano (as maiores primeiro).
  const linhasDre = useMemo(() => {
    const somar = (chave: "porReceita" | "porGasto") => {
      const total = new Map<string, number>();
      for (const m of meses) for (const [k, v] of m[chave]) total.set(k, (total.get(k) ?? 0) + v);
      return [...total.entries()].sort((a, b) => (a[0] === "Rendas" ? -1 : b[0] === "Rendas" ? 1 : b[1] - a[1]));
    };
    return { receitas: somar("porReceita"), gastos: somar("porGasto") };
  }, [meses]);

  // 5 maiores gastos do mês escolhido: por categoria; o que não tem categoria, pela descrição.
  const top5 = useMemo(() => {
    const doMes = meses[mes - 1];
    const soma = new Map<string, number>();
    for (const l of doMes.linhas) {
      if (l.tipo !== "Despesa") continue;
      const nome = (l.categoriaId && cats.get(l.categoriaId)?.nome) || l.descricao;
      soma.set(nome, (soma.get(nome) ?? 0) + l.valor);
    }
    const lista = [...soma.entries()].sort((a, b) => b[1] - a[1]);
    return { itens: lista.slice(0, 5), total: doMes.gastos, outros: lista.slice(5).reduce((s, [, v]) => s + v, 0) };
  }, [meses, mes, cats]);

  const resultadoAno = totalAno.receitas - totalAno.gastos;
  const cards = [
    { titulo: `Entradas em ${ano}`, valor: totalAno.receitas, cor: "text-emerald-600" },
    { titulo: `Gastos em ${ano}`, valor: totalAno.gastos, cor: "text-red-500" },
    { titulo: `Sobra em ${ano}`, valor: resultadoAno, cor: resultadoAno >= 0 ? "text-primary" : "text-red-500" },
  ];

  if (carregando) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavegador ano={ano} mes={mes} onChange={(y, m) => { setAno(y); setMes(m); }} />
        <p className="text-xs text-muted-foreground">
          Inclui contas fixas e parcelas de dívidas, pagas ou a pagar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.titulo} className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription>{c.titulo}</CardDescription>
              <CardTitle className={`text-2xl tabular-nums ${c.cor}`}>{brl(c.valor)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Evolucao titulo="Evolução das entradas" descricao={`Rendas e outras entradas, mês a mês, em ${ano}`}
          dados={meses} campo="receitas" cor={COR_RECEITA} mesEscolhido={mes} />
        <Evolucao titulo="Evolução dos gastos" descricao={`Tudo o que saiu ou vai sair, mês a mês, em ${ano}`}
          dados={meses} campo="gastos" cor={COR_GASTO} mesEscolhido={mes} />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>5 maiores gastos de {MESES[mes - 1].toLowerCase()} de {ano}</CardTitle>
          <CardDescription>Por categoria; o que não tem categoria aparece pela descrição.</CardDescription>
        </CardHeader>
        <CardContent>
          {top5.itens.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
          ) : (
            <ol className="space-y-3">
              {top5.itens.map(([nome, valor], i) => {
                const pct = top5.total > 0 ? (valor / top5.total) * 100 : 0;
                return (
                  <li key={nome}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{nome}</span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold">{brl(valor)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" title={`${nome}: ${brl(valor)} (${pct.toFixed(1)}% dos gastos do mês)`}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: COR_GASTO }} />
                    </div>
                  </li>
                );
              })}
              {top5.outros > 0 && (
                <li className="pt-1 text-xs text-muted-foreground">
                  Outros gastos do mês: {brl(top5.outros)} · total do mês {brl(top5.total)}
                </li>
              )}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Demonstrativo de {ano}</CardTitle>
          <CardDescription>Entradas, gastos e sobra de cada mês. Clique num mês para ver os 5 maiores gastos dele.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm tabular-nums">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-medium">Conta</th>
                  {meses.map((m) => (
                    <th key={m.mes} className={`px-2 py-2 text-right font-medium ${m.mes === mes ? "bg-muted/60 text-foreground" : ""}`}>
                      <button type="button" onClick={() => setMes(m.mes)} className="hover:underline">
                        {m.rotulo}{m.mes === mesAtual ? " •" : ""}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <LinhaTotal nome="Entradas" valores={meses.map((m) => m.receitas)} total={totalAno.receitas} mesEscolhido={mes} cor="text-emerald-600" />
                {linhasDre.receitas.map(([nome, total]) => (
                  <LinhaDetalhe key={`r-${nome}`} nome={nome} valores={meses.map((m) => m.porReceita.get(nome) ?? 0)} total={total} mesEscolhido={mes} />
                ))}
                <LinhaTotal nome="Gastos" valores={meses.map((m) => m.gastos)} total={totalAno.gastos} mesEscolhido={mes} cor="text-red-500" />
                {linhasDre.gastos.map(([nome, total]) => (
                  <LinhaDetalhe key={`g-${nome}`} nome={nome} valores={meses.map((m) => m.porGasto.get(nome) ?? 0)} total={total} mesEscolhido={mes} />
                ))}
                <tr className="border-t-2 font-semibold">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">Sobra</td>
                  {meses.map((m) => (
                    <td key={m.mes} className={`px-2 py-2 text-right ${m.resultado < 0 ? "text-red-500" : ""} ${m.mes === mes ? "bg-muted/60" : ""}`}>
                      {m.receitas === 0 && m.gastos === 0 ? "—" : semCentavos(m.resultado)}
                    </td>
                  ))}
                  <td className={`px-4 py-2 text-right ${resultadoAno < 0 ? "text-red-500" : ""}`}>{semCentavos(resultadoAno)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinhaTotal({ nome, valores, total, mesEscolhido, cor }: {
  nome: string; valores: number[]; total: number; mesEscolhido: number; cor: string;
}) {
  return (
    <tr className="border-t bg-muted/30 font-semibold">
      <td className={`sticky left-0 z-10 bg-muted/30 px-4 py-2 backdrop-blur ${cor}`}>{nome}</td>
      {valores.map((v, i) => (
        <td key={i} className={`px-2 py-2 text-right ${i + 1 === mesEscolhido ? "bg-muted/60" : ""}`}>
          {v === 0 ? "—" : semCentavos(v)}
        </td>
      ))}
      <td className="px-4 py-2 text-right">{semCentavos(total)}</td>
    </tr>
  );
}

function LinhaDetalhe({ nome, valores, total, mesEscolhido }: {
  nome: string; valores: number[]; total: number; mesEscolhido: number;
}) {
  return (
    <tr className="text-muted-foreground">
      <td className="sticky left-0 z-10 max-w-[220px] truncate bg-card px-4 py-1.5 pl-8" title={nome}>{nome}</td>
      {valores.map((v, i) => (
        <td key={i} className={`px-2 py-1.5 text-right ${i + 1 === mesEscolhido ? "bg-muted/60 text-foreground" : ""}`}>
          {v === 0 ? "—" : semCentavos(v)}
        </td>
      ))}
      <td className="px-4 py-1.5 text-right">{semCentavos(total)}</td>
    </tr>
  );
}

function Evolucao({ titulo, descricao, dados, campo, cor, mesEscolhido }: {
  titulo: string;
  descricao: string;
  dados: Mes[];
  campo: "receitas" | "gastos";
  cor: string;
  mesEscolhido: number;
}) {
  const media = dados.reduce((s, m) => s + m[campo], 0) / 12;
  const vazio = dados.every((m) => m[campo] === 0);
  const id = `grad-${campo}`;
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}{vazio ? "" : ` · média ${semCentavos(media)}/mês`}</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pl-0">
        {vazio ? (
          <p className="flex h-full items-center justify-center pl-6 text-sm text-muted-foreground">
            Nada registrado neste ano.
          </p>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis tickLine={false} axisLine={false} width={72} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => compacto.format(v)} />
            <ReferenceLine x={dados[mesEscolhido - 1]?.rotulo} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
              formatter={(v: number) => [brl(v), campo === "receitas" ? "Entradas" : "Gastos"]}
              labelFormatter={(rotulo: string) => {
                const m = dados.find((d) => d.rotulo === rotulo);
                return m ? MESES[m.mes - 1] : rotulo;
              }}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            />
            <Area type="monotone" dataKey={campo} stroke={cor} strokeWidth={2} fill={`url(#${id})`}
              dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
