import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  useData, Lancamento, LancStatus, LancTipo,
} from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

function Lancamentos() {
  const { lancamentos, categorias, contatos, removeLancamento } = useData();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const filtered = useMemo(
    () =>
      lancamentos.filter(
        (r) =>
          (filtroTipo === "todos" || r.tipo === filtroTipo) &&
          (filtroCat === "todas" || r.categoriaId === filtroCat) &&
          (filtroStatus === "todos" || r.status === filtroStatus),
      ),
    [lancamentos, filtroTipo, filtroCat, filtroStatus],
  );

  const catName = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const contName = (id?: string) =>
    id ? contatos.find((c) => c.id === id)?.nome ?? "—" : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gerencie clientes, fornecedores e plano de contas em{" "}
          <Link to="/financeiro/cadastros" className="text-primary underline">
            Cadastros
          </Link>
          .
        </p>
      </div>
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
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
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
          <LancamentoDialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}
            editando={editando}
            trigger={
              <Button onClick={() => setEditando(null)}>
                <Plus className="h-4 w-4" /> Novo Lançamento
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente / Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{r.data}</TableCell>
                  <TableCell className="font-medium">{r.desc}</TableCell>
                  <TableCell className="text-sm">{contName(r.contatoId)}</TableCell>
                  <TableCell><Badge variant="outline">{catName(r.categoriaId)}</Badge></TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditando(r); setOpen(true); }}
                      ><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                        onClick={() => removeLancamento(r.id)}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
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

function LancamentoDialog({
  open, onOpenChange, editando, trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editando: Lancamento | null;
  trigger: React.ReactNode;
}) {
  const { categorias, contatos, addLancamento, updateLancamento } = useData();
  const [tipo, setTipo] = useState<LancTipo>(editando?.tipo ?? "Receita");
  const [desc, setDesc] = useState(editando?.desc ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? "");
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [contatoId, setContatoId] = useState(editando?.contatoId ?? "");
  const [status, setStatus] = useState<LancStatus>(editando?.status ?? "Pago");
  const [erro, setErro] = useState("");

  // sincroniza quando muda editando
  const editingId = editando?.id ?? null;
  useMemo(() => {
    setTipo(editando?.tipo ?? "Receita");
    setDesc(editando?.desc ?? "");
    setValor(editando ? String(editando.valor) : "");
    setData(editando?.data ?? "");
    setCategoriaId(editando?.categoriaId ?? "");
    setContatoId(editando?.contatoId ?? "");
    setStatus(editando?.status ?? "Pago");
    setErro("");
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const catsFiltradas = categorias.filter((c) => c.tipo === tipo);
  const contatosFiltrados = contatos.filter((c) =>
    tipo === "Receita" ? c.tipo === "Cliente" : c.tipo === "Fornecedor",
  );

  const submit = () => {
    if (!desc.trim() || !valor || !data) { setErro("Preencha descrição, valor e data."); return; }
    if (!categoriaId) { setErro("Selecione a categoria."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) { setErro("Valor deve ser positivo."); return; }
    const payload = {
      data, desc: desc.trim(), categoriaId,
      contatoId: contatoId || undefined,
      tipo, valor: v, status,
    };
    if (editando) updateLancamento(editando.id, payload);
    else addLancamento(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["Receita", "Despesa"] as LancTipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setCategoriaId(""); setContatoId(""); }}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === "Receita" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >{t}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>{tipo === "Receita" ? "Cliente" : "Fornecedor"}</Label>
            <Select value={contatoId} onValueChange={setContatoId}>
              <SelectTrigger><SelectValue placeholder={`Selecione um ${tipo === "Receita" ? "cliente" : "fornecedor"}`} /></SelectTrigger>
              <SelectContent>
                {contatosFiltrados.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Nenhum cadastro. Crie em Cadastros.
                  </div>
                ) : contatosFiltrados.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {catsFiltradas.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Crie em Cadastros.
                    </div>
                  ) : catsFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LancStatus)}>
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
          <Button onClick={submit}>{editando ? "Salvar alterações" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
