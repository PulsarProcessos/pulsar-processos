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
  projetado: number;
  total: number;
};

function Demonstrativo() {
  const { lancamentos, categorias, grupos } = useData();
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

  // Filtra lançamentos do mês
  const lancMes = useMemo(() => {
    return lancamentos.filter((l) => {
      const d = parseISO(l.data);
      return d && d.getMonth() === mes && d.getFullYear() === ano;
    });
  }, [lancamentos, mes, ano]);

  // Distribui valor de cada lançamento por categoria (considerando rateios)
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
    // Agrupa: tipo -> grupoId -> categoriaId -> { realizado, projetado }
    const buckets = new Map<string, { realizado: number; projetado: number }>();
    const key = (catId: string) => catId;
    for (const l of lancMes) {
      for (const parte of porCategoria(l)) {
        const k = key(parte.catId);
        const b = buckets.get(k) ?? { realizado: 0, projetado: 0 };
        if (l.status === "Pago") b.realizado += parte.valor;
        else b.projetado += parte.valor;
        buckets.set(k, b);
      }
    }

    function buildTipo(tipo: "Receita" | "Despesa") {
      const gruposT = grupos.filter((g) => g.tipo === tipo).sort((a, b) => a.ordem - b.ordem);
      const blocos: Array<{
        grupoId: string;
        nome: string;
        linhas: Linha[];
        total: Linha;
      }> = [];
      let realT = 0, projT = 0;
      const usados = new Set<string>();
      for (const g of gruposT) {
        const cats = categorias.filter((c) => c.tipo === tipo && c.grupoId === g.id);
        const linhas: Linha[] = [];
        let real = 0, proj = 0;
        for (const c of cats) {
          const b = buckets.get(c.id) ?? { realizado: 0, projetado: 0 };
          usados.add(c.id);
          linhas.push({
            label: c.nome,
            realizado: b.realizado,
            projetado: b.projetado,
            total: b.realizado + b.projetado,
          });
          real += b.realizado; proj += b.projetado;
        }
        blocos.push({
          grupoId: g.id,
          nome: g.nome,
          linhas,
          total: { label: g.nome, realizado: real, projetado: proj, total: real + proj },
        });
        realT += real; projT += proj;
      }
      // Sem grupo
      const semGrupo = categorias.filter((c) => c.tipo === tipo && !c.grupoId);
      const linhasSG: Linha[] = [];
      let realSG = 0, projSG = 0;
      for (const c of semGrupo) {
        const b = buckets.get(c.id) ?? { realizado: 0, projetado: 0 };
        usados.add(c.id);
        linhasSG.push({ label: c.nome, realizado: b.realizado, projetado: b.projetado, total: b.realizado + b.projetado });
        realSG += b.realizado; projSG += b.projetado;
      }
      if (linhasSG.length > 0) {
        blocos.push({
          grupoId: "__sem__" + tipo,
          nome: "Sem grupo",
          linhas: linhasSG,
          total: { label: "Sem grupo", realizado: realSG, projetado: projSG, total: realSG + projSG },
        });
        realT += realSG; projT += projSG;
      }
      return { blocos, totalReal: realT, totalProj: projT };
    }

    const rec = buildTipo("Receita");
    const desp = buildTipo("Despesa");
    return { rec, desp };
  }, [lancMes, grupos, categorias]);

  const resultReal = dados.rec.totalReal - dados.desp.totalReal;
  const resultProj = dados.rec.totalProj - dados.desp.totalProj;

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Demonstrativo de Resultado</CardTitle>
            <CardDescription>Realizado e projetado por categoria, agrupado pelo plano de contas.</CardDescription>
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
                  <th className="text-right py-2 px-3 w-36">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {/* RECEITAS */}
                <tr className="bg-emerald-500/5">
                  <td colSpan={4} className="py-2 px-2 font-semibold text-emerald-700">RECEITAS</td>
                </tr>
                {dados.rec.blocos.map((b) => {
                  const open = !collapsed[b.grupoId];
                  return (
                    <FragmentBloco key={b.grupoId} open={open} onToggle={() => toggle(b.grupoId)} bloco={b} accent="emerald" />
                  );
                })}
                <tr className="border-t-2 border-emerald-300/50 font-semibold">
                  <td className="py-2 pl-2">Total de Receitas</td>
                  <td className="text-right px-3 text-emerald-700">{brl(dados.rec.totalReal)}</td>
                  <td className="text-right px-3 text-emerald-600/80">{brl(dados.rec.totalProj)}</td>
                  <td className="text-right px-3">{brl(dados.rec.totalReal + dados.rec.totalProj)}</td>
                </tr>

                {/* DESPESAS */}
                <tr className="bg-red-500/5">
                  <td colSpan={4} className="py-2 px-2 font-semibold text-red-700 pt-4">DESPESAS</td>
                </tr>
                {dados.desp.blocos.map((b) => {
                  const open = !collapsed[b.grupoId];
                  return (
                    <FragmentBloco key={b.grupoId} open={open} onToggle={() => toggle(b.grupoId)} bloco={b} accent="red" />
                  );
                })}
                <tr className="border-t-2 border-red-300/50 font-semibold">
                  <td className="py-2 pl-2">Total de Despesas</td>
                  <td className="text-right px-3 text-red-600">{brl(dados.desp.totalReal)}</td>
                  <td className="text-right px-3 text-red-500/80">{brl(dados.desp.totalProj)}</td>
                  <td className="text-right px-3">{brl(dados.desp.totalReal + dados.desp.totalProj)}</td>
                </tr>

                {/* RESULTADO */}
                <tr className="border-t-2 border-border bg-muted/40 font-bold">
                  <td className="py-3 pl-2">Resultado do período</td>
                  <td className={`text-right px-3 ${resultReal < 0 ? "text-red-600" : "text-emerald-700"}`}>{brl(resultReal)}</td>
                  <td className={`text-right px-3 ${resultProj < 0 ? "text-red-500/80" : "text-emerald-600/80"}`}>{brl(resultProj)}</td>
                  <td className={`text-right px-3 ${(resultReal+resultProj) < 0 ? "text-red-600" : "text-emerald-700"}`}>{brl(resultReal + resultProj)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FragmentBloco({
  bloco, open, onToggle, accent,
}: {
  bloco: { grupoId: string; nome: string; linhas: Linha[]; total: Linha };
  open: boolean;
  onToggle: () => void;
  accent: "emerald" | "red";
}) {
  const accentText = accent === "emerald" ? "text-emerald-700" : "text-red-700";
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
        <td className="text-right px-3">{brl(bloco.total.total)}</td>
      </tr>
      {open && bloco.linhas.map((l) => (
        <tr key={l.label} className="border-b border-border/30 text-muted-foreground">
          <td className="py-1.5 pl-10">{l.label}</td>
          <td className="text-right px-3">{brl(l.realizado)}</td>
          <td className="text-right px-3">{brl(l.projetado)}</td>
          <td className="text-right px-3 text-foreground">{brl(l.total)}</td>
        </tr>
      ))}
      {open && bloco.linhas.length === 0 && (
        <tr><td colSpan={4} className="text-xs text-muted-foreground pl-10 py-1.5">Sem categorias.</td></tr>
      )}
    </>
  );
}
