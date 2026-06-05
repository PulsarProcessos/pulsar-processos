import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { useData, Lancamento } from "@/lib/data-store";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro/metas")({
  component: Metas,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseISO(d: string): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}
function brl(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function Metas() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const navMes = (dir: -1 | 1) => {
    let m = mes + dir; let y = ano;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMes(m); setAno(y);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Metas mensais</CardTitle>
            <CardDescription>
              Estabeleça o valor projetado de cada categoria. Esses valores alimentam o Demonstrativo.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 border rounded-md min-w-[180px] text-center text-sm font-medium">
              {MESES[mes - 1]} de {ano}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="Despesa" className="space-y-4">
            <TabsList>
              <TabsTrigger value="Despesa">Metas de gastos</TabsTrigger>
              <TabsTrigger value="Receita">Metas de recebimento</TabsTrigger>
            </TabsList>
            <TabsContent value="Despesa">
              <MetasTabela tipo="Despesa" mes={mes} ano={ano} />
            </TabsContent>
            <TabsContent value="Receita">
              <MetasTabela tipo="Receita" mes={mes} ano={ano} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function porCategoriaRealizada(l: Lancamento): Array<{ catId: string; valor: number }> {
  if (l.rateios && l.rateios.length > 0) {
    return l.rateios
      .filter((r) => r.categoriaId)
      .map((r) => ({ catId: r.categoriaId!, valor: r.valor }));
  }
  if (l.categoriaId) return [{ catId: l.categoriaId, valor: l.valor }];
  return [];
}

function MetasTabela({ tipo, mes, ano }: { tipo: "Receita" | "Despesa"; mes: number; ano: number }) {
  const { categorias, grupos, metas, lancamentos, upsertMeta, removeMeta } = useData();
  const [valores, setValores] = useState<Record<string, string>>({});

  const cats = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo]);
  const gruposT = useMemo(() => grupos.filter((g) => g.tipo === tipo).sort((a, b) => a.ordem - b.ordem), [grupos, tipo]);

  const metasMap = useMemo(() => {
    const m = new Map<string, { id: string; valor: number }>();
    for (const meta of metas) {
      if (meta.mes === mes && meta.ano === ano) m.set(meta.categoriaId, { id: meta.id, valor: meta.valor });
    }
    return m;
  }, [metas, mes, ano]);

  const realizadoMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lancamentos) {
      const d = parseISO(l.data);
      if (!d || d.getMonth() + 1 !== mes || d.getFullYear() !== ano) continue;
      if (l.status !== "Pago") continue;
      for (const p of porCategoriaRealizada(l)) {
        m.set(p.catId, (m.get(p.catId) ?? 0) + p.valor);
      }
    }
    return m;
  }, [lancamentos, mes, ano]);

  const valorAtual = (catId: string): string => {
    if (valores[catId] !== undefined) return valores[catId];
    const m = metasMap.get(catId);
    return m ? String(m.valor) : "";
  };

  const salvar = async (catId: string) => {
    const v = Number(valorAtual(catId));
    if (Number.isNaN(v) || v < 0) { toast.error("Valor inválido."); return; }
    await upsertMeta({ categoriaId: catId, tipo, mes, ano, valor: v });
    setValores((p) => { const n = { ...p }; delete n[catId]; return n; });
    toast.success("Meta salva.");
  };

  const limpar = async (catId: string) => {
    const m = metasMap.get(catId);
    if (m) await removeMeta(m.id);
    setValores((p) => { const n = { ...p }; delete n[catId]; return n; });
  };

  const linhasCat = (lista: typeof cats) => lista.map((c) => {
    const real = realizadoMap.get(c.id) ?? 0;
    const meta = Number(valorAtual(c.id)) || 0;
    const pctV = meta > 0 ? Math.min(100, (real / meta) * 100) : 0;
    const isDirty = valores[c.id] !== undefined;
    const bom = tipo === "Receita" ? real >= meta && meta > 0 : real <= meta;
    return (
      <TableRow key={c.id}>
        <TableCell className="font-medium">{c.nome}</TableCell>
        <TableCell className="w-44">
          <Input type="number" min="0" step="0.01" className="h-8"
            value={valorAtual(c.id)} placeholder="0,00"
            onChange={(e) => setValores((p) => ({ ...p, [c.id]: e.target.value }))} />
        </TableCell>
        <TableCell className="text-right tabular-nums">R$ {brl(real)}</TableCell>
        <TableCell className="w-60">
          <div className="flex items-center gap-2">
            <Progress value={pctV} />
            <span className={`text-xs font-medium min-w-[3rem] text-right ${meta === 0 ? "text-muted-foreground" : bom ? "text-emerald-600" : "text-red-500"}`}>
              {meta > 0 ? `${((real / meta) * 100).toFixed(0)}%` : "—"}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button size="icon" variant={isDirty ? "default" : "ghost"} className="h-8 w-8"
              onClick={() => salvar(c.id)} title="Salvar meta">
              <Save className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500"
              disabled={!metasMap.get(c.id)} onClick={() => limpar(c.id)} title="Remover meta">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  });

  if (cats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Cadastre categorias de {tipo.toLowerCase()} em Cadastros · Plano de Contas para definir metas.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          <TableHead className="w-44">Meta (R$)</TableHead>
          <TableHead className="text-right">Realizado</TableHead>
          <TableHead className="w-60">Atingimento</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {gruposT.map((g) => {
          const dentro = cats.filter((c) => c.grupoId === g.id);
          if (dentro.length === 0) return null;
          return (
            <>
              <TableRow key={`g-${g.id}`} className="bg-muted/30">
                <TableCell colSpan={5} className="py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  {g.nome}
                </TableCell>
              </TableRow>
              {linhasCat(dentro)}
            </>
          );
        })}
        {(() => {
          const semGrupo = cats.filter((c) => !c.grupoId);
          if (semGrupo.length === 0) return null;
          return (
            <>
              <TableRow className="bg-muted/30">
                <TableCell colSpan={5} className="py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  Sem grupo
                </TableCell>
              </TableRow>
              {linhasCat(semGrupo)}
            </>
          );
        })()}
      </TableBody>
    </Table>
  );
}
