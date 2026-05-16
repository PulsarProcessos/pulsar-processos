import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

type Tipo = "Receita" | "Despesa";
type Status = "Pago" | "Pendente";
type Lanc = {
  id: string;
  data: string;
  desc: string;
  cat: string;
  tipo: Tipo;
  valor: number;
  status: Status;
};

const initial: Lanc[] = [
  { id: "1", data: "12/05", desc: "Mensalidade · Acme Corp", cat: "Vendas", tipo: "Receita", valor: 2400, status: "Pago" },
  { id: "2", data: "11/05", desc: "Anúncios Meta Ads", cat: "Marketing", tipo: "Despesa", valor: 480, status: "Pago" },
  { id: "3", data: "10/05", desc: "Mensalidade · Globex", cat: "Vendas", tipo: "Receita", valor: 1800, status: "Pago" },
  { id: "4", data: "09/05", desc: "Salários", cat: "Folha", tipo: "Despesa", valor: 2400, status: "Pago" },
  { id: "5", data: "08/05", desc: "Consultoria · Initech", cat: "Vendas", tipo: "Receita", valor: 1500, status: "Pendente" },
  { id: "6", data: "05/05", desc: "Aluguel sala", cat: "Operacional", tipo: "Despesa", valor: 1800, status: "Pendente" },
];

const categorias = ["Vendas", "Marketing", "Folha", "Operacional", "Outros"];

function Lancamentos() {
  const [rows, setRows] = useState<Lanc[]>(initial);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filtroTipo === "todos" || r.tipo === filtroTipo) &&
          (filtroCat === "todas" || r.cat === filtroCat) &&
          (filtroStatus === "todos" || r.status === filtroStatus),
      ),
    [rows, filtroTipo, filtroCat, filtroStatus],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={filtroCat} onValueChange={setFiltroCat}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <NovoLancamento
            open={open}
            onOpenChange={setOpen}
            onCreate={(l) => setRows((prev) => [l, ...prev])}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{r.data}</TableCell>
                  <TableCell className="font-medium">{r.desc}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.cat}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.tipo === "Receita" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">Receita</Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-0">Despesa</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${r.tipo === "Receita" ? "text-emerald-600" : "text-red-500"}`}>
                    {r.tipo === "Receita" ? "+" : "−"} R$ {r.valor.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {r.status === "Pendente" ? (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">Pendente</Badge>
                    ) : (
                      <Badge variant="secondary">Pago</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NovoLancamento({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (l: Lanc) => void;
}) {
  const [tipo, setTipo] = useState<Tipo>("Receita");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [cat, setCat] = useState("Vendas");
  const [status, setStatus] = useState<Status>("Pago");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!desc.trim() || !valor || !data) {
      setErro("Preencha descrição, valor e data.");
      return;
    }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) {
      setErro("Valor deve ser positivo.");
      return;
    }
    onCreate({
      id: crypto.randomUUID(),
      data,
      desc: desc.trim(),
      cat,
      tipo,
      valor: v,
      status,
    });
    setDesc(""); setValor(""); setData(""); setErro("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Novo Lançamento</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["Receita", "Despesa"] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === "Receita"
                      ? "bg-emerald-500 text-white"
                      : "bg-red-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input placeholder="dd/mm" value={data} onChange={(e) => setData(e.target.value)} maxLength={10} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
