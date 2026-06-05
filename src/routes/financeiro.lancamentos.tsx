import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowRightLeft, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronDown, ChevronLeft, ChevronRight,
  CreditCard, Download, Layers, Pencil, Plus, Repeat, Search, Trash2, Wallet,
} from "lucide-react";
import {
  useData, Lancamento, LancStatus, LancTipo, Rateio, Transferencia,
} from "@/lib/data-store";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseISO(d: string): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function brl(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d: string) {
  const dt = parseISO(d); if (!dt) return d;
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d); const day = x.getDay(); // 0=dom
  x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}
function endOfWeek(d: Date) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return x; }

type PeriodoTipo = "hoje" | "semana" | "mes" | "ano" | "custom";
type SortKey = "data" | "valor";
type SortDir = "desc" | "asc" | null;

function Lancamentos() {
  const { lancamentos, transferencias, bancos, categorias, contatos, removeLancamento, updateLancamento, removeTransferencia, saldoBanco } = useData();
  const hoje = new Date();
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("mes");
  const [anchor, setAnchor] = useState<Date>(hoje);
  const [customStart, setCustomStart] = useState<string>(toISO(hoje));
  const [customEnd, setCustomEnd] = useState<string>(toISO(hoje));
  const [periodoOpen, setPeriodoOpen] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [escopoEdicao, setEscopoEdicao] = useState<"self" | "todos">("self");
  const [confirmParcela, setConfirmParcela] = useState<Lancamento | null>(null);
  const [transfOpen, setTransfOpen] = useState(false);
  const [editandoTransf, setEditandoTransf] = useState<Transferencia | null>(null);

  const abrirTransf = (t: Transferencia | null) => { setEditandoTransf(t); setTransfOpen(true); };

  const iniciarEdicao = (l: Lancamento) => {
    if (l.parcelaGrupoId && l.parcelaTotal && l.parcelaTotal > 1) {
      setConfirmParcela(l);
    } else {
      setEscopoEdicao("self");
      setEditando(l);
      setOpen(true);
    }
  };
  const confirmarEscopo = (escopo: "self" | "todos") => {
    if (!confirmParcela) return;
    setEscopoEdicao(escopo);
    setEditando(confirmParcela);
    setConfirmParcela(null);
    setOpen(true);
  };

  const marcarPago = async (l: Lancamento) => {
    await updateLancamento(l.id, { status: l.status === "Pago" ? "Pendente" : "Pago" });
    toast.success(l.status === "Pago"
      ? "Lançamento marcado como em aberto."
      : (l.tipo === "Receita" ? "Recebimento registrado." : "Pagamento registrado."));
  };

  const range = useMemo(() => {
    const a = new Date(anchor);
    if (periodoTipo === "hoje") {
      const s = new Date(a); s.setHours(0,0,0,0);
      const e = new Date(a); e.setHours(23,59,59,999);
      const lbl = `${String(a.getDate()).padStart(2,"0")}/${String(a.getMonth()+1).padStart(2,"0")}/${a.getFullYear()}`;
      return { inicio: s, fim: e, label: lbl };
    }
    if (periodoTipo === "semana") {
      const s = startOfWeek(a); const e = endOfWeek(a);
      const lbl = `${String(s.getDate()).padStart(2,"0")}/${String(s.getMonth()+1).padStart(2,"0")} a ${String(e.getDate()).padStart(2,"0")}/${String(e.getMonth()+1).padStart(2,"0")}/${e.getFullYear()}`;
      return { inicio: s, fim: e, label: lbl };
    }
    if (periodoTipo === "ano") {
      const s = new Date(a.getFullYear(),0,1); const e = new Date(a.getFullYear(),11,31,23,59,59,999);
      return { inicio: s, fim: e, label: `Ano ${a.getFullYear()}` };
    }
    if (periodoTipo === "custom") {
      const s = parseISO(customStart) ?? new Date(); const e = parseISO(customEnd) ?? new Date();
      e.setHours(23,59,59,999);
      return { inicio: s, fim: e, label: `${fmtDate(customStart)} a ${fmtDate(customEnd)}` };
    }
    // mes
    const s = new Date(a.getFullYear(), a.getMonth(), 1);
    const e = new Date(a.getFullYear(), a.getMonth()+1, 0, 23,59,59,999);
    return { inicio: s, fim: e, label: `${MESES[a.getMonth()]} de ${a.getFullYear()}` };
  }, [periodoTipo, anchor, customStart, customEnd]);

  const navPeriodo = (dir: -1 | 1) => {
    if (periodoTipo === "custom") return;
    const a = new Date(anchor);
    if (periodoTipo === "hoje") a.setDate(a.getDate() + dir);
    else if (periodoTipo === "semana") a.setDate(a.getDate() + 7 * dir);
    else if (periodoTipo === "ano") a.setFullYear(a.getFullYear() + dir);
    else a.setMonth(a.getMonth() + dir);
    setAnchor(a); setSelecionados(new Set());
  };

  const inRange = (iso: string) => {
    const d = parseISO(iso); if (!d) return false;
    return d >= range.inicio && d <= range.fim;
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); return; }
    if (sortDir === "desc") setSortDir("asc");
    else if (sortDir === "asc") setSortDir(null);
    else setSortDir("desc");
  };

  // Lançamentos do período (para KPIs)
  const lancMes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (!inRange(l.data)) return false;
      if (filtroBanco !== "todos" && l.bancoId !== filtroBanco) return false;
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (filtroTipo !== "todos" && l.tipo !== filtroTipo) return false;
      if (q) {
        const cat = categorias.find((c) => c.id === l.categoriaId)?.nome ?? "";
        const cont = contatos.find((c) => c.id === l.contatoId)?.nome ?? "";
        const hay = `${l.desc} ${cat} ${cont}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lancamentos, range, filtroBanco, filtroStatus, filtroTipo, busca, categorias, contatos]);

  // Transferências do período (linhas virtuais na tabela)
  type LinhaTransf = {
    kind: "transf"; id: string; data: string; valor: number; bancoOrigemId: string; bancoDestinoId: string; descricao?: string;
  };
  type LinhaLanc = { kind: "lanc"; id: string; data: string; valor: number; lanc: Lancamento };
  type Linha = LinhaLanc | LinhaTransf;

  const transfPeriodo = useMemo<LinhaTransf[]>(() => {
    const q = busca.trim().toLowerCase();
    return transferencias
      .filter((t) => {
        if (!inRange(t.data)) return false;
        if (filtroBanco !== "todos" && t.bancoOrigemId !== filtroBanco && t.bancoDestinoId !== filtroBanco) return false;
        if (filtroStatus !== "todos") return false; // transferência não tem status
        if (filtroTipo === "Receita" || filtroTipo === "Despesa") return false;
        if (q) {
          const ori = bancos.find((b) => b.id === t.bancoOrigemId)?.nome ?? "";
          const des = bancos.find((b) => b.id === t.bancoDestinoId)?.nome ?? "";
          const hay = `transferência ${ori} ${des} ${t.descricao ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((t) => ({ kind: "transf" as const, id: `t-${t.id}`, data: t.data, valor: t.valor, bancoOrigemId: t.bancoOrigemId, bancoDestinoId: t.bancoDestinoId, descricao: t.descricao }));
  }, [transferencias, range, filtroBanco, filtroStatus, filtroTipo, busca, bancos]);

  const linhas: Linha[] = useMemo(() => {
    const ll: Linha[] = lancMes.map((l) => ({ kind: "lanc" as const, id: l.id, data: l.data, valor: l.valor, lanc: l }));
    return [...ll, ...transfPeriodo];
  }, [lancMes, transfPeriodo]);

  const linhasOrdenadas = useMemo(() => {
    if (sortDir === null) {
      return [...linhas].sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));
    }
    const mult = sortDir === "asc" ? 1 : -1;
    return [...linhas].sort((a, b) => {
      if (sortKey === "data") return a.data.localeCompare(b.data) * mult;
      return (a.valor - b.valor) * mult;
    });
  }, [linhas, sortKey, sortDir]);

  // KPIs — só lançamentos (transferências não afetam P&L)
  const kpi = useMemo(() => {
    let recAberto = 0, recReal = 0, despAberto = 0, despReal = 0;
    for (const l of lancMes) {
      if (l.tipo === "Receita") {
        if (l.status === "Pago") recReal += l.valor; else recAberto += l.valor;
      } else {
        if (l.status === "Pago") despReal += l.valor; else despAberto += l.valor;
      }
    }
    return { recAberto, recReal, despAberto, despReal, total: recReal - despReal };
  }, [lancMes]);

  const catName = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const contName = (id?: string) => id ? contatos.find((c) => c.id === id)?.nome ?? "—" : "—";

  const selecionaveis = linhasOrdenadas.filter((l) => l.kind === "lanc");
  const todasSelecionadas = selecionaveis.length > 0 && selecionaveis.every((l) => selecionados.has(l.lanc.id));
  const toggleTodas = () => {
    if (todasSelecionadas) setSelecionados(new Set());
    else setSelecionados(new Set(selecionaveis.map((l) => (l as { lanc: Lancamento }).lanc.id)));
  };
  const toggle = (id: string) => {
    setSelecionados((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const acaoLote = async (acao: "pago" | "pendente" | "excluir") => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    if (acao === "excluir") {
      if (!confirm(`Excluir ${ids.length} lançamento(s)?`)) return;
      for (const id of ids) await removeLancamento(id);
      toast.success(`${ids.length} lançamento(s) excluído(s).`);
    } else {
      const status: LancStatus = acao === "pago" ? "Pago" : "Pendente";
      for (const id of ids) await updateLancamento(id, { status });
      toast.success(`${ids.length} lançamento(s) atualizado(s).`);
    }
    setSelecionados(new Set());
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k || sortDir === null) return <ArrowUpDown className="inline h-3.5 w-3.5 opacity-50" />;
    return sortDir === "desc" ? <ArrowDown className="inline h-3.5 w-3.5" /> : <ArrowUp className="inline h-3.5 w-3.5" />;
  };

  const exportarCSV = () => {
    const bancoName = (id?: string) => id ? bancos.find((b) => b.id === id)?.nome ?? "" : "";
    const sep = ";";
    const header = ["Data", "Fornecedor/Cliente", "Conta", "Categoria", "Descrição", "Tipo", "Status", "Valor (R$)"];
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[][] = [];
    for (const row of linhasOrdenadas) {
      if (row.kind === "transf") {
        const isSaida = filtroBanco !== "todos" && row.bancoOrigemId === filtroBanco;
        const isEntrada = filtroBanco !== "todos" && row.bancoDestinoId === filtroBanco;
        if (filtroBanco !== "todos" && !isSaida && !isEntrada) continue; // pula transferências que não envolvem o banco filtrado
        if (filtroBanco !== "todos") {
          rows.push([
            fmtDate(row.data),
            "—",
            bancoName(filtroBanco),
            "Transferência",
            row.descricao ?? "Transferência entre contas",
            isSaida ? "Saída" : "Entrada",
            "—",
            (isSaida ? -row.valor : row.valor).toFixed(2).replace(".", ","),
          ]);
        } else {
          rows.push([
            fmtDate(row.data),
            "—",
            `${bancoName(row.bancoOrigemId)} → ${bancoName(row.bancoDestinoId)}`,
            "Transferência",
            row.descricao ?? "Transferência entre contas",
            "Transferência",
            "—",
            row.valor.toFixed(2).replace(".", ","),
          ]);
        }
      } else {
        const l = row.lanc;
        rows.push([
          fmtDate(l.data),
          contName(l.contatoId),
          bancoName(l.bancoId),
          catName(l.categoriaId),
          l.desc,
          l.tipo,
          l.status === "Pago" ? "Pago" : "Em aberto",
          (l.tipo === "Receita" ? l.valor : -l.valor).toFixed(2).replace(".", ","),
        ]);
      }
    }
    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(sep)).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${range.label.replace(/[^\w]+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Relatório com ${rows.length} registro(s) exportado.`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Extrato consolidado das movimentações. Gerencie clientes, fornecedores, contas e plano de contas em{" "}
        <Link to="/financeiro/cadastros" className="text-primary underline">Cadastros</Link>.
      </p>

      {/* Saldo das contas/cartões */}
      {bancos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {bancos.map((b) => {
            const s = saldoBanco(b.id);
            const isCard = b.tipo === "Cartao";
            const fatura = isCard ? -s : s;
            return (
              <div key={b.id} className={`rounded-md border p-3 ${isCard ? "border-violet-200/60 bg-violet-500/5" : "border-border/60"}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isCard ? <CreditCard className="h-3.5 w-3.5 text-violet-600" /> : <Wallet className="h-3.5 w-3.5 text-emerald-600" />}
                  <span className="truncate">{b.nome}</span>
                </div>
                <p className={`text-lg font-bold ${isCard ? "text-violet-700" : s < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  R$ {fatura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isCard
                    ? `Fatura · venc. dia ${b.vencimentoDia ?? "—"}`
                    : "Saldo atual"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Card className="border-border/60">
        <CardHeader className="space-y-4 pb-3">
          {/* Linha de filtros: período + busca + conta */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <div className="flex items-center gap-1 border rounded-md px-1 h-9">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={periodoTipo === "custom"} onClick={() => navPeriodo(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover open={periodoOpen} onOpenChange={setPeriodoOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-sm font-medium px-3 min-w-[180px] text-center hover:text-primary transition-colors">
                      {range.label}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 space-y-3" align="start">
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        ["hoje","Hoje"],["semana","Esta semana"],
                        ["mes","Este mês"],["ano","Este ano"],
                      ] as [PeriodoTipo,string][]).map(([k,label]) => (
                        <Button key={k} type="button" size="sm"
                          variant={periodoTipo === k ? "default" : "outline"}
                          onClick={() => { setPeriodoTipo(k); setAnchor(new Date()); setSelecionados(new Set()); setPeriodoOpen(false); }}>
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Personalizado</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Início</Label>
                          <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Fim</Label>
                          <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8" />
                        </div>
                      </div>
                      <Button size="sm" className="w-full" onClick={() => {
                        if (!customStart || !customEnd) return;
                        setPeriodoTipo("custom"); setSelecionados(new Set()); setPeriodoOpen(false);
                      }}>Aplicar intervalo</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={periodoTipo === "custom"} onClick={() => navPeriodo(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1 flex-1 min-w-[220px]">
              <Label className="text-xs">Pesquisar no período</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Descrição, categoria ou contato..." className="pl-8 h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Conta</Label>
              <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Selecionar todas</SelectItem>
                  {bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Em aberto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={exportarCSV} title="Exportar extrato em CSV">
                <Download className="h-4 w-4" /> Exportar
              </Button>
              <Button variant="outline" onClick={() => abrirTransf(null)}>
                <ArrowRightLeft className="h-4 w-4" /> Transferência
              </Button>
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditando(null)}>
                    <Plus className="h-4 w-4" /> Novo Lançamento
                  </Button>
                </DialogTrigger>
                <LancamentoForm key={editando?.id ?? "novo"} editando={editando} escopo={escopoEdicao} onClose={() => setOpen(false)} />
              </Dialog>
            </div>
          </div>

          {/* KPIs estilo Conta Azul */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Receitas em aberto (R$)" value={kpi.recAberto} color="text-emerald-600" />
            <KpiCard label="Receitas realizadas (R$)" value={kpi.recReal} color="text-emerald-700" />
            <KpiCard label="Despesas em aberto (R$)" value={kpi.despAberto} color="text-red-500" />
            <KpiCard label="Despesas realizadas (R$)" value={kpi.despReal} color="text-red-600" />
            <KpiCard label="Total do período (R$)" value={kpi.total} color={kpi.total < 0 ? "text-red-600" : "text-primary"} highlight />
          </div>

          {/* Ações em lote */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{selecionados.size} registro(s) selecionado(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selecionados.size === 0}>
                  Ações em lote <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => acaoLote("pago")}>Marcar como pago</DropdownMenuItem>
                <DropdownMenuItem onClick={() => acaoLote("pendente")}>Marcar como em aberto</DropdownMenuItem>
                <DropdownMenuItem onClick={() => acaoLote("excluir")} className="text-red-500">Excluir selecionados</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={todasSelecionadas} onCheckedChange={toggleTodas} />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => cycleSort("data")}>
                  Data <SortIcon k="data" />
                </TableHead>
                <TableHead>Resumo do lançamento</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => cycleSort("valor")}>
                  Valor (R$) <SortIcon k="valor" />
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasOrdenadas.map((row) => {
                if (row.kind === "transf") {
                  const ori = bancos.find((b) => b.id === row.bancoOrigemId)?.nome ?? "—";
                  const des = bancos.find((b) => b.id === row.bancoDestinoId)?.nome ?? "—";
                  return (
                    <TableRow key={row.id} className="bg-sky-500/5">
                      <TableCell />
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(row.data)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-sky-600" />
                            <span>Transferência</span>
                            <Badge variant="outline" className="text-[10px]">{ori} → {des}</Badge>
                          </div>
                          {row.descricao && (
                            <div className="text-xs text-muted-foreground">{row.descricao}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 border-0">Transferência</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sky-700">
                        {brl(row.valor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            title="Editar transferência"
                            onClick={() => {
                              const t = transferencias.find((x) => x.id === row.id.slice(2));
                              if (t) abrirTransf(t);
                            }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                            onClick={() => removeTransferencia(row.id.slice(2))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                const r = row.lanc;
                return (
                  <TableRow key={r.id} className={selecionados.has(r.id) ? "bg-muted/40" : ""}>
                    <TableCell>
                      <Checkbox checked={selecionados.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(r.data)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          {r.parcelaTotal ? <Repeat className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                          {r.parcelaTotal ? (
                            <span className="text-xs text-muted-foreground">{r.parcelaNumero}/{r.parcelaTotal} —</span>
                          ) : null}
                          <span>{r.desc}</span>
                          {r.rateios && r.rateios.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Layers className="h-3 w-3" /> Rateado
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{catName(r.categoriaId)}</Badge>
                          <span>{contName(r.contatoId)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.status === "Pago" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">Pago</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-0">Em aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${r.tipo === "Receita" ? "text-emerald-600" : "text-red-500"}`}>
                      {r.tipo === "Receita" ? "+" : "−"} {brl(r.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className={`h-8 w-8 ${r.status === "Pago" ? "text-emerald-600" : (r.tipo === "Receita" ? "text-muted-foreground hover:text-emerald-600" : "text-muted-foreground hover:text-red-600")}`}
                          title={r.status === "Pago"
                            ? "Marcar como em aberto"
                            : (r.tipo === "Receita" ? "Dar como recebido" : "Dar como pago")}
                          onClick={() => marcarPago(r)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => iniciarEdicao(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                          onClick={() => removeLancamento(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {linhasOrdenadas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmParcela} onOpenChange={(v) => { if (!v) setConfirmParcela(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar lançamento parcelado</AlertDialogTitle>
            <AlertDialogDescription>
              Este lançamento faz parte de um parcelamento ({confirmParcela?.parcelaNumero}/{confirmParcela?.parcelaTotal}).
              Você quer editar somente esta parcela ou aplicar a alteração a todas as parcelas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => confirmarEscopo("self")}>Somente esta parcela</Button>
            <AlertDialogAction onClick={() => confirmarEscopo("todos")}>Todas as parcelas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferenciaDialog
        open={transfOpen}
        editando={editandoTransf}
        onOpenChange={(v) => { setTransfOpen(v); if (!v) setEditandoTransf(null); }}
      />
    </div>
  );
}

function KpiCard({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border ${highlight ? "border-primary/30 bg-primary/5" : "border-border/60"} p-3`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{brl(value)}</p>
    </div>
  );
}

// =========== FORM ===========

type ParcelaPreview = { numero: number; data: string; valor: number };

function LancamentoForm({
  editando, onClose, escopo = "self",
}: { editando: Lancamento | null; onClose: () => void; escopo?: "self" | "todos" }) {
  const {
    categorias, contatos, bancos,
    addLancamento, updateLancamento, updateParcelamentoGrupo, lancamentos,
  } = useData();
  const [tipo, setTipo] = useState<LancTipo>(editando?.tipo ?? "Despesa");
  const [desc, setDesc] = useState(editando?.desc ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [contatoId, setContatoId] = useState(editando?.contatoId ?? "");
  const [bancoId, setBancoId] = useState(editando?.bancoId ?? "");
  const [status, setStatus] = useState<LancStatus>(editando?.status ?? "Pago");

  const [parcelar, setParcelar] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [parcelasCustom, setParcelasCustom] = useState<ParcelaPreview[]>([]);

  const [habilitarRateio, setHabilitarRateio] = useState((editando?.rateios?.length ?? 0) > 0);
  const [rateios, setRateios] = useState<Rateio[]>(
    editando?.rateios && editando.rateios.length > 0
      ? editando.rateios.map((r) => ({ categoriaId: r.categoriaId, valor: r.valor, percentual: r.percentual, descricao: r.descricao }))
      : [{ categoriaId: "", valor: 0 }, { categoriaId: "", valor: 0 }],
  );

  const propagar = escopo === "todos";
  const [erro, setErro] = useState("");

  const isEdit = Boolean(editando);
  const isParcelado = Boolean(editando?.parcelaGrupoId);
  const catsFiltradas = categorias.filter((c) => c.tipo === tipo);
  const contatosFiltrados = contatos.filter((c) => tipo === "Receita" ? c.tipo === "Cliente" : c.tipo === "Fornecedor");

  const valorNum = Number(valor) || 0;

  const recomputeParcelas = (v: number, n: number, primeira: string) => {
    if (!primeira || n < 2) { setParcelasCustom([]); return; }
    const vp = Math.round((v / n) * 100) / 100;
    const resto = Math.round((v - vp * n) * 100) / 100;
    const [y, m, d] = primeira.split("-").map(Number);
    const list: ParcelaPreview[] = Array.from({ length: n }).map((_, i) => {
      const dt = new Date(y, (m - 1) + i, d);
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return { numero: i + 1, data: ds, valor: i === n - 1 ? vp + resto : vp };
    });
    setParcelasCustom(list);
  };

  const togglePar = (v: boolean) => {
    setParcelar(v);
    if (v) recomputeParcelas(valorNum, parcelas, data);
    else setParcelasCustom([]);
  };

  const setParcelaData = (idx: number, nd: string) =>
    setParcelasCustom((prev) => prev.map((p, i) => i === idx ? { ...p, data: nd } : p));
  const setParcelaValor = (idx: number, nv: number) =>
    setParcelasCustom((prev) => prev.map((p, i) => i === idx ? { ...p, valor: nv } : p));

  const totalParcelas = parcelasCustom.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const totalRateio = rateios.reduce((s, r) => s + (Number(r.valor) || 0), 0);

  const addRateio = () => setRateios((r) => [...r, { categoriaId: "", valor: 0 }]);
  const removeRateioFn = (i: number) => setRateios((r) => r.filter((_, idx) => idx !== i));
  const updateRateio = (i: number, patch: Partial<Rateio>) =>
    setRateios((r) => r.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const contatoOpts = contatosFiltrados.map((c) => ({ value: c.id, label: c.nome, hint: c.documento }));
  const categoriaOpts = catsFiltradas.map((c) => ({ value: c.id, label: c.nome }));
  const bancoOpts = bancos.map((b) => ({ value: b.id, label: b.nome }));

  const submit = async () => {
    setErro("");
    if (!desc.trim()) return setErro("Informe a descrição.");
    if (valorNum <= 0) return setErro("Valor deve ser positivo.");
    if (!data) return setErro("Informe a data.");
    if (!habilitarRateio && !categoriaId) return setErro("Selecione a categoria.");
    if (habilitarRateio) {
      if (rateios.length < 2) return setErro("Adicione ao menos 2 rateios.");
      if (rateios.some((r) => !r.categoriaId)) return setErro("Cada rateio precisa de categoria.");
      if (Math.abs(totalRateio - valorNum) > 0.01) {
        return setErro(`Soma dos rateios (R$ ${totalRateio.toFixed(2)}) deve ser igual ao valor total (R$ ${valorNum.toFixed(2)}).`);
      }
    }

    const baseRateios: Rateio[] | undefined = habilitarRateio
      ? rateios.map((r) => ({
          categoriaId: r.categoriaId,
          valor: Number(r.valor),
          percentual: valorNum > 0 ? Math.round((Number(r.valor) / valorNum) * 10000) / 100 : undefined,
          descricao: r.descricao,
        }))
      : undefined;

    // Caso 1: criação de parcelamento
    if (parcelar && !isEdit) {
      if (parcelas < 2) return setErro("Parcelamento exige 2 ou mais parcelas.");
      if (Math.abs(totalParcelas - valorNum) > 0.01) {
        return setErro(`Soma das parcelas (R$ ${totalParcelas.toFixed(2)}) deve igualar o total (R$ ${valorNum.toFixed(2)}).`);
      }
      const grupoUid = (crypto as any).randomUUID();
      for (const p of parcelasCustom) {
        await addLancamento({
          data: p.data,
          desc: `${desc.trim()} (${p.numero}/${parcelasCustom.length})`,
          categoriaId: habilitarRateio ? "" : categoriaId,
          contatoId: contatoId || undefined,
          bancoId: bancoId || undefined,
          tipo, valor: p.valor, status,
          parcelaGrupoId: grupoUid,
          parcelaNumero: p.numero,
          parcelaTotal: parcelasCustom.length,
          rateios: baseRateios
            ? baseRateios.map((r) => ({ ...r, valor: Math.round((r.valor * (p.valor / valorNum)) * 100) / 100 }))
            : undefined,
        });
      }
      toast.success("Parcelas criadas.");
      onClose();
      return;
    }

    // Caso 2: edição de lançamento parcelado — não permite alterar valor
    if (isEdit && isParcelado && editando) {
      // valor permanece o da edição original
      const payloadSelf: Partial<Lancamento> = {
        data,
        desc: desc.trim(),
        categoriaId: habilitarRateio ? "" : categoriaId,
        contatoId: contatoId || undefined,
        bancoId: bancoId || undefined,
        tipo, status,
        rateios: baseRateios,
      };
      await updateLancamento(editando.id, payloadSelf);
      if (propagar && editando.parcelaGrupoId) {
        // propaga campos compartilhados para as demais parcelas (sem alterar valor nem data delas)
        await updateParcelamentoGrupo(editando.parcelaGrupoId, {
          categoriaId: habilitarRateio ? "" : categoriaId,
          contatoId: contatoId || undefined,
          bancoId: bancoId || undefined,
          tipo, status,
        });
        // rateios proporcionais nas demais parcelas
        if (baseRateios) {
          const grupo = lancamentos.filter((l) => l.parcelaGrupoId === editando.parcelaGrupoId && l.id !== editando.id);
          for (const lanc of grupo) {
            const fator = lanc.valor / valorNum;
            await updateLancamento(lanc.id, {
              rateios: baseRateios.map((r) => ({ ...r, valor: Math.round(r.valor * fator * 100) / 100 })),
            });
          }
        }
      }
      toast.success("Alterações salvas no lançamento parcelado.");
      onClose();
      return;
    }

    // Caso 3: lançamento simples (criar ou editar)
    const payload: Omit<Lancamento, "id"> = {
      data, desc: desc.trim(),
      categoriaId: habilitarRateio ? "" : categoriaId,
      contatoId: contatoId || undefined,
      bancoId: bancoId || undefined,
      tipo, valor: valorNum, status,
      rateios: baseRateios,
    };
    if (isEdit && editando) {
      await updateLancamento(editando.id, payload);
      toast.success("Lançamento Salvo.");
    } else {
      await addLancamento(payload);
      toast.success("Lançamento Salvo.");
    }
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
      </DialogHeader>

      {isEdit && isParcelado && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-800">
          Lançamento parcelado ({editando?.parcelaNumero}/{editando?.parcelaTotal}). O valor não pode ser alterado.
          {" "}
          {propagar
            ? "Alterações em categoria, contato, conta, tipo e status serão aplicadas a todas as parcelas."
            : "Alterações serão aplicadas somente a esta parcela."}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 max-w-sm">
          {(["Receita","Despesa"] as LancTipo[]).map((t) => (
            <button key={t} type="button" disabled={isEdit}
              onClick={() => { setTipo(t); setCategoriaId(""); setContatoId(""); }}
              className={`rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                tipo === t
                  ? t === "Receita" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >{t}</button>
          ))}
        </div>

        <section className="rounded-lg border border-border/60 p-4 space-y-4">
          <h3 className="text-sm font-semibold">Informações do lançamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>{tipo === "Receita" ? "Cliente" : "Fornecedor"}</Label>
              <Combobox options={contatoOpts} value={contatoId} onChange={setContatoId}
                placeholder="Selecione" searchPlaceholder={`Buscar ${tipo === "Receita" ? "cliente" : "fornecedor"}...`} />
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => {
                setData(e.target.value);
                if (parcelar) recomputeParcelas(valorNum, parcelas, e.target.value);
              }} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor *</Label>
              <Input type="number" min="0" step="0.01" value={valor}
                disabled={isEdit && isParcelado}
                onChange={(e) => {
                  setValor(e.target.value);
                  if (parcelar) recomputeParcelas(Number(e.target.value) || 0, parcelas, data);
                }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label>Habilitar rateio</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={habilitarRateio} onCheckedChange={(v) => {
                  setHabilitarRateio(v);
                  if (v && rateios.length < 2) setRateios([{ categoriaId: "", valor: 0 }, { categoriaId: "", valor: 0 }]);
                }} />
                <span className="text-xs text-muted-foreground">{habilitarRateio ? "Ativado" : "Desativado"}</span>
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Categoria {habilitarRateio ? "" : "*"}</Label>
              <Combobox options={categoriaOpts} value={categoriaId} onChange={setCategoriaId}
                placeholder={habilitarRateio ? "Definida no rateio" : "Selecione"}
                searchPlaceholder="Buscar categoria..." disabled={habilitarRateio} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LancStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Em aberto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </section>

        {habilitarRateio && (
          <section className="rounded-lg border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Rateio por categoria</h3>
              <Button type="button" size="sm" variant="outline" onClick={addRateio}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {rateios.map((r, i) => {
                const pct = valorNum > 0 ? ((Number(r.valor) || 0) / valorNum) * 100 : 0;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Categoria</Label>
                      <Combobox options={categoriaOpts} value={r.categoriaId ?? ""}
                        onChange={(v) => updateRateio(i, { categoriaId: v })}
                        searchPlaceholder="Buscar categoria..." />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input type="number" min="0" step="0.01" value={r.valor}
                        onChange={(e) => updateRateio(i, { valor: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">%</Label>
                      <Input type="number" min="0" step="0.01" value={pct.toFixed(2)}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          updateRateio(i, { valor: Math.round((valorNum * p / 100) * 100) / 100 });
                        }} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500"
                        disabled={rateios.length <= 2} onClick={() => removeRateioFn(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground">Total rateado</span>
              <span className={Math.abs(totalRateio - valorNum) > 0.01 ? "text-red-500 font-medium" : "text-emerald-600 font-medium"}>
                R$ {totalRateio.toFixed(2)} / R$ {valorNum.toFixed(2)}
              </span>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Condição de pagamento</h3>
            {!isEdit && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Parcelar?</span>
                <Switch checked={parcelar} onCheckedChange={togglePar} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Parcelamento</Label>
              {parcelar ? (
                <Input type="number" min="2" max="60" value={parcelas}
                  onChange={(e) => {
                    const n = Math.max(2, Number(e.target.value) || 2);
                    setParcelas(n);
                    recomputeParcelas(valorNum, n, data);
                  }} />
              ) : (
                <Input value={isParcelado ? `Parcela ${editando?.parcelaNumero}/${editando?.parcelaTotal}` : "À vista"} disabled />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>1º vencimento</Label>
              <Input type="date" value={data} disabled={!parcelar && isEdit && isParcelado}
                onChange={(e) => {
                  setData(e.target.value);
                  if (parcelar) recomputeParcelas(valorNum, parcelas, e.target.value);
                }} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta de pagamento</Label>
              <Combobox options={bancoOpts} value={bancoId} onChange={setBancoId}
                placeholder="Selecione" searchPlaceholder="Buscar banco..." />
            </div>
          </div>

          {parcelar && parcelasCustom.length > 0 && (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelasCustom.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{p.numero}/{parcelasCustom.length}</TableCell>
                      <TableCell>
                        <Input type="date" value={p.data} onChange={(e) => setParcelaData(i, e.target.value)} className="h-8" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min="0" step="0.01" value={p.valor}
                          onChange={(e) => setParcelaValor(i, Number(e.target.value))}
                          className="h-8 text-right" />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="text-right text-xs text-muted-foreground">Soma</TableCell>
                    <TableCell className={`text-right text-xs font-medium ${Math.abs(totalParcelas - valorNum) > 0.01 ? "text-red-500" : "text-emerald-600"}`}>
                      R$ {totalParcelas.toFixed(2)} / R$ {valorNum.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{isEdit ? "Salvar alterações" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TransferenciaDialog({ open, onOpenChange, editando }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editando: Transferencia | null;
}) {
  const { bancos, addTransferencia, updateTransferencia } = useData();
  const isEdit = Boolean(editando);
  const [origem, setOrigem] = useState(editando?.bancoOrigemId ?? "");
  const [destino, setDestino] = useState(editando?.bancoDestinoId ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? "");
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [erro, setErro] = useState("");

  // Resincroniza quando trocar de transferência editada
  useEffect(() => {
    setOrigem(editando?.bancoOrigemId ?? "");
    setDestino(editando?.bancoDestinoId ?? "");
    setValor(editando ? String(editando.valor) : "");
    setData(editando?.data ?? "");
    setDescricao(editando?.descricao ?? "");
    setErro("");
  }, [editando, open]);

  const submit = async () => {
    if (!origem || !destino) return setErro("Selecione os bancos de origem e destino.");
    if (origem === destino) return setErro("Origem e destino devem ser diferentes.");
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) return setErro("Valor deve ser positivo.");
    if (!data) return setErro("Informe a data.");
    if (isEdit && editando) {
      await updateTransferencia(editando.id, {
        data, bancoOrigemId: origem, bancoDestinoId: destino,
        valor: v, descricao: descricao.trim() || undefined,
      });
      toast.success("Transferência realizada.");
    } else {
      await addTransferencia({
        data, bancoOrigemId: origem, bancoDestinoId: destino,
        valor: v, descricao: descricao.trim() || undefined,
      });
      toast.success("Transferência realizada.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar transferência" : "Nova transferência entre bancos"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {bancos.length < 2 && (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Cadastre pelo menos 2 bancos em Cadastros para fazer transferências.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Banco de origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Banco de destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.filter((b) => b.id !== origem).map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} />
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={bancos.length < 2}>
            {isEdit ? "Salvar alterações" : "Salvar transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferenciasTable() {
  const { transferencias, bancos, removeTransferencia } = useData();
  const bancoName = (id: string) => bancos.find((b) => b.id === id)?.nome ?? "—";
  if (transferencias.length === 0) return null;
  return (
    <Card className="border-border/60">
      <CardHeader><p className="text-sm font-semibold">Transferências entre bancos</p></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead>
              <TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferencias.map((t: Transferencia) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{fmtDate(t.data)}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoOrigemId)}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoDestinoId)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.descricao ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">R$ {brl(t.valor)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                    onClick={() => removeTransferencia(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
