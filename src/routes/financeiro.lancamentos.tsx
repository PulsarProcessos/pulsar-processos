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
import { ArrowRightLeft, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useData, Lancamento, LancStatus, LancTipo, Transferencia,
} from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

function Lancamentos() {
  const { lancamentos, categorias, contatos, bancos, saldoBanco, removeLancamento } = useData();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBanco, setFiltroBanco] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const filtered = useMemo(
    () =>
      lancamentos.filter(
        (r) =>
          (filtroTipo === "todos" || r.tipo === filtroTipo) &&
          (filtroCat === "todas" || r.categoriaId === filtroCat) &&
          (filtroStatus === "todos" || r.status === filtroStatus) &&
          (filtroBanco === "todos" || r.bancoId === filtroBanco),
      ),
    [lancamentos, filtroTipo, filtroCat, filtroStatus, filtroBanco],
  );

  const catName = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const contName = (id?: string) =>
    id ? contatos.find((c) => c.id === id)?.nome ?? "—" : "—";
  const bancoName = (id?: string) =>
    id ? bancos.find((b) => b.id === id)?.nome ?? "—" : "—";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie clientes, fornecedores, bancos e plano de contas em{" "}
        <Link to="/financeiro/cadastros" className="text-primary underline">
          Cadastros
        </Link>
        .
      </p>

      {bancos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {bancos.map((b) => {
            const s = saldoBanco(b.id);
            return (
              <Card key={b.id} className="border-border/60">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">{b.nome}</p>
                  <p className={`text-lg font-semibold ${s < 0 ? "text-red-500" : "text-foreground"}`}>
                    R$ {s.toLocaleString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
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
              <Label className="text-xs">Categoria</Label>
              <Select value={filtroCat} onValueChange={setFiltroCat}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banco</Label>
              <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
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
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <TransferenciaDialog />
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditando(null)}>
                  <Plus className="h-4 w-4" /> Novo Lançamento
                </Button>
              </DialogTrigger>
              <LancamentoForm
                key={editando?.id ?? "novo"}
                editando={editando}
                onClose={() => setOpen(false)}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente / Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Banco</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">{bancoName(r.bancoId)}</TableCell>
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
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransferenciasTable />
    </div>
  );
}

function LancamentoForm({
  editando, onClose,
}: { editando: Lancamento | null; onClose: () => void }) {
  const { categorias, contatos, bancos, addLancamento, updateLancamento } = useData();
  const [tipo, setTipo] = useState<LancTipo>(editando?.tipo ?? "Receita");
  const [desc, setDesc] = useState(editando?.desc ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? "");
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [contatoId, setContatoId] = useState(editando?.contatoId ?? "");
  const [bancoId, setBancoId] = useState(editando?.bancoId ?? "");
  const [status, setStatus] = useState<LancStatus>(editando?.status ?? "Pago");
  const [erro, setErro] = useState("");

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
      bancoId: bancoId || undefined,
      tipo, valor: v, status,
    };
    if (editando) updateLancamento(editando.id, payload);
    else addLancamento(payload);
    onClose();
  };

  return (
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
            <SelectTrigger>
              <SelectValue placeholder={`Selecione um ${tipo === "Receita" ? "cliente" : "fornecedor"}`} />
            </SelectTrigger>
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
            <Label>Banco</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {bancos.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Cadastre um banco em Cadastros.
                  </div>
                ) : bancos.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{editando ? "Salvar alterações" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TransferenciaDialog() {
  const { bancos, addTransferencia } = useData();
  const [open, setOpen] = useState(false);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");

  const reset = () => {
    setOrigem(""); setDestino(""); setValor(""); setData(""); setDescricao(""); setErro("");
  };

  const submit = async () => {
    if (!origem || !destino) { setErro("Selecione os bancos de origem e destino."); return; }
    if (origem === destino) { setErro("Origem e destino devem ser diferentes."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) { setErro("Valor deve ser positivo."); return; }
    if (!data) { setErro("Informe a data."); return; }
    await addTransferencia({
      data, bancoOrigemId: origem, bancoDestinoId: destino,
      valor: v, descricao: descricao.trim() || undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="h-4 w-4" /> Transferência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transferência entre bancos</DialogTitle>
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
                  {bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Banco de destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.filter((b) => b.id !== origem).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={bancos.length < 2}>Salvar transferência</Button>
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
      <CardHeader>
        <p className="text-sm font-semibold">Transferências entre bancos</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferencias.map((t: Transferencia) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{t.data}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoOrigemId)}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoDestinoId)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.descricao ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">R$ {t.valor.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                    onClick={() => removeTransferencia(t.id)}
                  ><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
