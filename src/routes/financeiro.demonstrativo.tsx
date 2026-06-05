import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { useData, Lancamento } from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/demonstrativo")({
  component: Demonstrativo,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseISO(d: string): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Linha = {
  label: string;
  realizado: number;
  projetado: number; // meta
};

function pct(real: number, proj: number) {
  if (proj <= 0) return real > 0 ? 100 : 0;
  return (real / proj) * 100;
}

function Demonstrativo() {
  const { lancamentos, categorias, grupos, metas } = useData();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  const navMes = (dir: -1 | 1) => {
    let m = mes + dir; let y = ano;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMes(m); setAno(y);
  };

  const lancMes = useMemo(() => {
    return lancamentos.filter((l) => {
      const d = parseISO(l.data);
      return d && d.getMonth() === mes && d.getFullYear() === ano && l.status === "Pago";
    });
  }, [lancamentos, mes, ano]);

  const metasMes = useMemo(() =>
    metas.filter((m) => m.mes === mes + 1 && m.ano === ano),
  [metas, mes, ano]);

  function porCategoria(l: Lancamento): Array<{ catId: string; valor: number }> {
    if (l.rateios && l.rateios.length > 0) {
      return l.rateios
        .filter((r) => r.categoriaId)
        .map((r) => ({ catId: r.categoriaId!, valor: r.valor }));
    }
    if (l.categoriaId) return [{ catId: l.categoriaId, valor: l.valor }];
    return [];
  }

  const dados = useMemo(() => {
    const realPorCat = new Map<string, number>();
    for (const l of lancMes) {
      for (const p of porCategoria(l)) {
        realPorCat.set(p.catId, (realPorCat.get(p.catId) ?? 0) + p.valor);
      }
    }
    const metaPorCat = new Map<string, number>();
    for (const m of metasMes) {
      metaPorCat.set(m.categoriaId, (metaPorCat.get(m.categoriaId) ?? 0) + m.valor);
    }

    function buildTipo(tipo: "Receita" | "Despesa") {
      const gruposT = grupos.filter((g) => g.tipo === tipo).sort((a, b) => a.ordem - b.ordem);
      const blocos: Array<{ grupoId: string; nome: string; linhas: Linha[]; total: Linha }> = [];
      let realT = 0, projT = 0;
      for (const g of gruposT) {
        const cats = categorias.filter((c) => c.tipo === tipo && c.grupoId === g.id);
        const linhas: Linha[] = [];
        let real = 0, proj = 0;
        for (const c of cats) {
          const r = realPorCat.get(c.id) ?? 0;
          const p = metaPorCat.get(c.id) ?? 0;
          linhas.push({ label: c.nome, realizado: r, projetado: p });
          real += r; proj += p;
        }
        blocos.push({
          grupoId: g.id, nome: g.nome, linhas,
          total: { label: g.nome, realizado: real, projetado: proj },
        });
        realT += real; projT += proj;
      }
      const semGrupo = categorias.filter((c) => c.tipo === tipo && !c.grupoId);
      const linhasSG: Linha[] = [];
      let realSG = 0, projSG = 0;
      for (const c of semGrupo) {
        const r = realPorCat.get(c.id) ?? 0;
        const p = metaPorCat.get(c.id) ?? 0;
        linhasSG.push({ label: c.nome, realizado: r, projetado: p });
        realSG += r; projSG += p;
      }
      if (linhasSG.length > 0) {
        blocos.push({
          grupoId: "__sem__" + tipo, nome: "Sem grupo", linhas: linhasSG,
          total: { label: "Sem grupo", realizado: realSG, projetado: projSG },
        });
        realT += realSG; projT += projSG;
      }
      return { blocos, totalReal: realT, totalProj: projT };
    }
    return { rec: buildTipo("Receita"), desp: buildTipo("Despesa") };
  }, [lancMes, metasMes, grupos, categorias]);

  const resultReal = dados.rec.totalReal - dados.desp.totalReal;
  const resultProj = dados.rec.totalProj - dados.desp.totalProj;

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Demonstrativo de Resultado</CardTitle>
            <CardDescription>Realizado x projetado (metas) por categoria. Defina as metas em Metas.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 border rounded-md min-w-[180px] text-center text-sm font-medium">
              {MESES[mes]} de {ano}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 pl-2">Descrição</th>
                  <th className="text-right py-2 px-3 w-36">Realizado (R$)</th>
                  <th className="text-right py-2 px-3 w-36">Projetado (R$)</th>
                  <th className="text-right py-2 px-3 w-32">Diferença</th>
                  <th className="text-right py-2 px-3 w-44">Atingimento</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-emerald-500/5">
                  <td colSpan={5} className="py-2 px-2 font-semibold text-emerald-700">RECEITAS</td>
                </tr>
                {dados.rec.blocos.map((b) => (
                  <FragmentBloco
                    key={b.grupoId} open={!collapsed[b.grupoId]}
                    onToggle={() => toggle(b.grupoId)} bloco={b} mode="receita"
                  />
                ))}
                <TotalRow label="Total de Receitas"
                  real={dados.rec.totalReal} proj={dados.rec.totalProj} mode="receita" />

                <tr className="bg-red-500/5">
                  <td colSpan={5} className="py-2 px-2 font-semibold text-red-700 pt-4">DESPESAS</td>
                </tr>
                {dados.desp.blocos.map((b) => (
                  <FragmentBloco
                    key={b.grupoId} open={!collapsed[b.grupoId]}
                    onToggle={() => toggle(b.grupoId)} bloco={b} mode="despesa"
                  />
                ))}
                <TotalRow label="Total de Despesas"
                  real={dados.desp.totalReal} proj={dados.desp.totalProj} mode="despesa" />

                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="py-3 pl-2">Resultado do período</td>
                  <td className={`text-right px-3 ${resultReal < 0 ? "text-red-600" : "text-emerald-700"}`}>{brl(resultReal)}</td>
                  <td className={`text-right px-3 ${resultProj < 0 ? "text-red-500/80" : "text-emerald-600/80"}`}>{brl(resultProj)}</td>
                  <td className={`text-right px-3 ${(resultReal - resultProj) < 0 ? "text-red-600" : "text-emerald-700"}`}>{brl(resultReal - resultProj)}</td>
                  <td className="text-right px-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AtingimentoBar({ real, proj, mode }: { real: number; proj: number; mode: "receita" | "despesa" }) {
  const p = pct(real, proj);
  const capped = Math.min(p, 150);
  // Receita: maior é melhor (verde quando >=100). Despesa: ultrapassar a meta é ruim (vermelho).
  const bom = mode === "receita" ? p >= 100 : p <= 100;
  const corBarra = bom ? "bg-emerald-500" : (mode === "despesa" && p > 100 ? "bg-red-500" : "bg-amber-500");
  const corTxt = bom ? "text-emerald-700" : (mode === "despesa" && p > 100 ? "text-red-600" : "text-amber-600");
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${corBarra}`} style={{ width: `${(capped / 150) * 100}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${corTxt} min-w-[3.5rem] text-right`}>
        {proj > 0 ? `${p.toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

function TotalRow({ label, real, proj, mode }: { label: string; real: number; proj: number; mode: "receita" | "despesa" }) {
  const accentText = mode === "receita" ? "text-emerald-700" : "text-red-600";
  const diff = real - proj;
  return (
    <tr className={`border-t-2 ${mode === "receita" ? "border-emerald-300/50" : "border-red-300/50"} font-semibold`}>
      <td className="py-2 pl-2">{label}</td>
      <td className={`text-right px-3 ${accentText}`}>{brl(real)}</td>
      <td className="text-right px-3 text-muted-foreground">{brl(proj)}</td>
      <td className={`text-right px-3 ${(mode === "despesa" ? diff > 0 : diff < 0) ? "text-red-600" : "text-emerald-700"}`}>
        {(diff >= 0 ? "+" : "")}{brl(diff)}
      </td>
      <td className="text-right px-3"><AtingimentoBar real={real} proj={proj} mode={mode} /></td>
    </tr>
  );
}

function FragmentBloco({
  bloco, open, onToggle, mode,
}: {
  bloco: { grupoId: string; nome: string; linhas: Linha[]; total: Linha };
  open: boolean;
  onToggle: () => void;
  mode: "receita" | "despesa";
}) {
  const accentText = mode === "receita" ? "text-emerald-700" : "text-red-700";
  const diffG = bloco.total.realizado - bloco.total.projetado;
  return (
    <>
      <tr className="border-b border-border/40 bg-muted/20 font-medium">
        <td className="py-1.5 pl-2">
          <button type="button" className="flex items-center gap-1.5" onClick={onToggle}>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{bloco.nome}</span>
          </button>
        </td>
        <td className={`text-right px-3 ${accentText}`}>{brl(bloco.total.realizado)}</td>
        <td className="text-right px-3 text-muted-foreground">{brl(bloco.total.projetado)}</td>
        <td className={`text-right px-3 ${(mode === "despesa" ? diffG > 0 : diffG < 0) ? "text-red-600" : "text-emerald-700"}`}>
          {(diffG >= 0 ? "+" : "")}{brl(diffG)}
        </td>
        <td className="text-right px-3"><AtingimentoBar real={bloco.total.realizado} proj={bloco.total.projetado} mode={mode} /></td>
      </tr>
      {open && bloco.linhas.map((l) => {
        const d = l.realizado - l.projetado;
        return (
          <tr key={l.label} className="border-b border-border/30 text-muted-foreground">
            <td className="py-1.5 pl-10">{l.label}</td>
            <td className="text-right px-3 text-foreground">{brl(l.realizado)}</td>
            <td className="text-right px-3">{brl(l.projetado)}</td>
            <td className={`text-right px-3 ${(mode === "despesa" ? d > 0 : d < 0) ? "text-red-500" : "text-emerald-600"}`}>
              {(d >= 0 ? "+" : "")}{brl(d)}
            </td>
            <td className="text-right px-3"><AtingimentoBar real={l.realizado} proj={l.projetado} mode={mode} /></td>
          </tr>
        );
      })}
      {open && bloco.linhas.length === 0 && (
        <tr><td colSpan={5} className="text-xs text-muted-foreground pl-10 py-1.5">Sem categorias.</td></tr>
      )}
    </>
  );
}
