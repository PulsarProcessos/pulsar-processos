import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useData, Contato, ContatoTipo, Categoria,
} from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/cadastros")({
  component: Cadastros,
});

function Cadastros() {
  return (
    <Tabs defaultValue="clientes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        <TabsTrigger value="plano">Plano de Contas</TabsTrigger>
      </TabsList>
      <TabsContent value="clientes"><ContatosPanel tipo="Cliente" /></TabsContent>
      <TabsContent value="fornecedores"><ContatosPanel tipo="Fornecedor" /></TabsContent>
      <TabsContent value="plano"><PlanoContas /></TabsContent>
    </Tabs>
  );
}

function ContatosPanel({ tipo }: { tipo: ContatoTipo }) {
  const { contatos, removeContato } = useData();
  const lista = contatos.filter((c) => c.tipo === tipo);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Contato | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{tipo === "Cliente" ? "Clientes" : "Fornecedores"}</CardTitle>
          <CardDescription>
            {tipo === "Cliente"
              ? "Vinculados a lançamentos de receita."
              : "Vinculados a lançamentos de despesa."}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditando(null)}>
              <Plus className="h-4 w-4" /> Novo {tipo}
            </Button>
          </DialogTrigger>
          <ContatoForm
            key={editando?.id ?? "novo"}
            editando={editando}
            tipo={tipo}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.documento || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.email || c.telefone || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditando(c); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                      onClick={() => removeContato(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum cadastro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ContatoForm({
  editando, tipo, onClose,
}: {
  editando: Contato | null;
  tipo: ContatoTipo;
  onClose: () => void;
}) {
  const { addContato, updateContato } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [documento, setDocumento] = useState(editando?.documento ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [telefone, setTelefone] = useState(editando?.telefone ?? "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    const payload = {
      nome: nome.trim(), tipo,
      documento: documento.trim() || undefined,
      email: email.trim() || undefined,
      telefone: telefone.trim() || undefined,
      obs: obs.trim() || undefined,
    };
    if (editando) updateContato(editando.id, payload);
    else addContato(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? `Editar ${tipo.toLowerCase()}` : `Novo ${tipo.toLowerCase()}`}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ / CPF</Label>
          <Input value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={20} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} />
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

function PlanoContas() {
  const { categorias, removeCategoria } = useData();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Plano de Contas</CardTitle>
          <CardDescription>Categorias usadas nos lançamentos financeiros.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditando(null)}>
              <Plus className="h-4 w-4" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <CategoriaForm
            key={editando?.id ?? "novo"}
            editando={editando}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {(["Receita", "Despesa"] as const).map((t) => {
            const lista = categorias.filter((c) => c.tipo === t);
            return (
              <div key={t} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${t === "Receita" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <p className="text-sm font-semibold">{t}s</p>
                  <Badge variant="secondary">{lista.length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {lista.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <span className="text-sm">{c.nome}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditando(c); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                          onClick={() => removeCategoria(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma categoria.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriaForm({
  editando, onClose,
}: { editando: Categoria | null; onClose: () => void }) {
  const { addCategoria, updateCategoria } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [tipo, setTipo] = useState<"Receita" | "Despesa">(editando?.tipo ?? "Despesa");
  const [erro, setErro] = useState("");
  useEffect(() => { setErro(""); }, []);

  const submit = () => {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    const payload = { nome: nome.trim(), tipo };
    if (editando) updateCategoria(editando.id, payload);
    else addCategoria(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as "Receita" | "Despesa")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Receita">Receita</SelectItem>
              <SelectItem value="Despesa">Despesa</SelectItem>
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
