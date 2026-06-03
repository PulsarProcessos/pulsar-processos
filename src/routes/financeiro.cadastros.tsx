import { useMemo, useState } from "react";
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
import { ChevronDown, ChevronRight, Folder, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useData, Contato, ContatoTipo, Categoria, Banco, GrupoCategoria,
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
        <TabsTrigger value="bancos">Bancos</TabsTrigger>
        <TabsTrigger value="plano">Plano de Contas</TabsTrigger>
      </TabsList>
      <TabsContent value="clientes"><ContatosPanel tipo="Cliente" /></TabsContent>
      <TabsContent value="fornecedores"><ContatosPanel tipo="Fornecedor" /></TabsContent>
      <TabsContent value="bancos"><BancosPanel /></TabsContent>
      <TabsContent value="plano"><PlanoContas /></TabsContent>
    </Tabs>
  );
}

function ContatosPanel({ tipo }: { tipo: ContatoTipo }) {
  const { contatos, removeContato } = useData();
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos
      .filter((c) => c.tipo === tipo)
      .filter((c) => !q ||
        c.nome.toLowerCase().includes(q) ||
        (c.documento ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.telefone ?? "").toLowerCase().includes(q),
      );
  }, [contatos, busca, tipo]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Contato | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>{tipo === "Cliente" ? "Clientes" : "Fornecedores"}</CardTitle>
          <CardDescription>
            {tipo === "Cliente"
              ? "Vinculados a lançamentos de receita."
              : "Vinculados a lançamentos de despesa."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[260px]">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar ${tipo === "Cliente" ? "cliente" : "fornecedor"}...`}
              className="pl-8 h-9"
            />
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
        </div>
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
                  {busca ? "Nenhum resultado para a busca." : "Nenhum cadastro."}
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
}: { editando: Contato | null; tipo: ContatoTipo; onClose: () => void }) {
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
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} /></div>
        <div className="space-y-1.5"><Label>CNPJ / CPF</Label>
          <Input value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={20} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} /></div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} /></div>
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{editando ? "Salvar alterações" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BancosPanel() {
  const { bancos, removeBanco, saldoBanco } = useData();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Banco | null>(null);

  const total = bancos.reduce((s, b) => s + saldoBanco(b.id), 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bancos</CardTitle>
          <CardDescription>
            Saldo total: <span className="font-semibold text-foreground">R$ {total.toLocaleString("pt-BR")}</span>
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditando(null)}>
              <Plus className="h-4 w-4" /> Novo Banco
            </Button>
          </DialogTrigger>
          <BancoForm key={editando?.id ?? "novo"} editando={editando} onClose={() => setOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bancos.map((b) => {
              const s = saldoBanco(b.id);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.agencia || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.conta || "—"}</TableCell>
                  <TableCell className="text-right">R$ {b.saldoInicial.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className={`text-right font-semibold ${s < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    R$ {s.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditando(b); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                        onClick={() => removeBanco(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {bancos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum banco cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BancoForm({
  editando, onClose,
}: { editando: Banco | null; onClose: () => void }) {
  const { addBanco, updateBanco } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [agencia, setAgencia] = useState(editando?.agencia ?? "");
  const [conta, setConta] = useState(editando?.conta ?? "");
  const [saldo, setSaldo] = useState(editando ? String(editando.saldoInicial) : "0");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    const s = Number(saldo);
    if (Number.isNaN(s)) { setErro("Saldo inválido."); return; }
    const payload = {
      nome: nome.trim(),
      agencia: agencia.trim() || undefined,
      conta: conta.trim() || undefined,
      saldoInicial: s,
    };
    if (editando) updateBanco(editando.id, payload);
    else addBanco(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar banco" : "Novo banco"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80}
            placeholder="Ex: Itaú PJ, Nubank, Caixa" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Agência</Label>
            <Input value={agencia} onChange={(e) => setAgencia(e.target.value)} maxLength={20} /></div>
          <div className="space-y-1.5"><Label>Conta</Label>
            <Input value={conta} onChange={(e) => setConta(e.target.value)} maxLength={30} /></div>
        </div>
        <div className="space-y-1.5"><Label>Saldo Inicial (R$)</Label>
          <Input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(e.target.value)} /></div>
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
  const { categorias, grupos, removeCategoria, removeGrupo, updateCategoria } = useData();
  const [openCat, setOpenCat] = useState(false);
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null);
  const [grupoIdParaNova, setGrupoIdParaNova] = useState<string | undefined>();
  const [openGrupo, setOpenGrupo] = useState(false);
  const [editandoGrupo, setEditandoGrupo] = useState<GrupoCategoria | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<Categoria | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);

  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const onDragStart = (c: Categoria) => (e: React.DragEvent) => {
    setDragging(c);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", c.id);
  };
  const onDragEnd = () => { setDragging(null); setHoverTarget(null); };
  const allowDrop = (tipo: "Receita" | "Despesa") => dragging !== null && dragging.tipo === tipo;
  const handleDrop = async (targetGrupoId: string | null, tipo: "Receita" | "Despesa") => {
    if (!dragging || dragging.tipo !== tipo) return;
    const novo = targetGrupoId ?? undefined;
    if ((dragging.grupoId ?? undefined) !== novo) {
      await updateCategoria(dragging.id, { grupoId: novo });
    }
    setDragging(null); setHoverTarget(null);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Plano de Contas</CardTitle>
          <CardDescription>Organize categorias por grupos. Arraste para mover entre grupos. Esses grupos alimentam o demonstrativo.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={openGrupo} onOpenChange={(v) => { setOpenGrupo(v); if (!v) setEditandoGrupo(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setEditandoGrupo(null)}>
                <Folder className="h-4 w-4" /> Novo Grupo
              </Button>
            </DialogTrigger>
            <GrupoForm key={editandoGrupo?.id ?? "novo"} editando={editandoGrupo} onClose={() => setOpenGrupo(false)} />
          </Dialog>
          <Dialog open={openCat} onOpenChange={(v) => { setOpenCat(v); if (!v) { setEditandoCat(null); setGrupoIdParaNova(undefined); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditandoCat(null); setGrupoIdParaNova(undefined); }}>
                <Plus className="h-4 w-4" /> Nova Categoria
              </Button>
            </DialogTrigger>
            <CategoriaForm
              key={editandoCat?.id ?? grupoIdParaNova ?? "novo"}
              editando={editandoCat}
              grupoIdInicial={grupoIdParaNova}
              onClose={() => setOpenCat(false)}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(["Receita", "Despesa"] as const).map((t) => {
          const gruposT = grupos.filter((g) => g.tipo === t).sort((a, b) => a.ordem - b.ordem);
          const semGrupo = categorias.filter((c) => c.tipo === t && !c.grupoId);
          return (
            <div key={t} className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <span className={`h-2 w-2 rounded-full ${t === "Receita" ? "bg-emerald-500" : "bg-red-500"}`} />
                <p className="text-sm font-semibold">{t}s</p>
                {dragging?.tipo === t && (
                  <span className="text-xs text-muted-foreground ml-2">Solte sobre um grupo para mover</span>
                )}
              </div>

              {gruposT.length === 0 && semGrupo.length === 0 && (
                <p className="text-xs text-muted-foreground py-3">
                  Nenhum grupo ou categoria. Crie um grupo para começar.
                </p>
              )}

              {gruposT.map((g) => {
                const cats = categorias.filter((c) => c.grupoId === g.id);
                const isCollapsed = collapsed[g.id];
                return (
                  <div key={g.id} className="rounded-md border border-border/60">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                      <button
                        type="button"
                        onClick={() => toggle(g.id)}
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span>{g.nome}</span>
                        <Badge variant="secondary" className="text-[10px]">{cats.length}</Badge>
                      </button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7"
                          onClick={() => { setGrupoIdParaNova(g.id); setEditandoCat(null); setOpenCat(true); }}>
                          <Plus className="h-3.5 w-3.5" /> Categoria
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditandoGrupo(g); setOpenGrupo(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                          onClick={() => removeGrupo(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="p-2 space-y-1">
                        {cats.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-2">Nenhuma categoria neste grupo.</p>
                        ) : cats.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded px-3 py-1.5 hover:bg-muted/40">
                            <span className="text-sm">{c.nome}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setEditandoCat(c); setOpenCat(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                onClick={() => removeCategoria(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {semGrupo.length > 0 && (
                <div className="rounded-md border border-dashed border-border/60">
                  <div className="px-3 py-2 bg-muted/20 text-xs font-medium text-muted-foreground">
                    Sem grupo
                  </div>
                  <div className="p-2 space-y-1">
                    {semGrupo.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded px-3 py-1.5 hover:bg-muted/40">
                        <span className="text-sm">{c.nome}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditandoCat(c); setOpenCat(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                            onClick={() => removeCategoria(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function GrupoForm({ editando, onClose }: { editando: GrupoCategoria | null; onClose: () => void }) {
  const { addGrupo, updateGrupo } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [tipo, setTipo] = useState<"Receita" | "Despesa">(editando?.tipo ?? "Despesa");
  const [erro, setErro] = useState("");

  const submit = async () => {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    if (editando) await updateGrupo(editando.id, { nome: nome.trim(), tipo });
    else await addGrupo({ nome: nome.trim(), tipo });
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar grupo" : "Novo grupo"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80}
            placeholder="Ex: Custos Diretos, Despesas Administrativas" /></div>
        <div className="space-y-1.5"><Label>Tipo</Label>
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

function CategoriaForm({
  editando, grupoIdInicial, onClose,
}: { editando: Categoria | null; grupoIdInicial?: string; onClose: () => void }) {
  const { addCategoria, updateCategoria, grupos } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [tipo, setTipo] = useState<"Receita" | "Despesa">(editando?.tipo ?? "Despesa");
  const [grupoId, setGrupoId] = useState<string>(editando?.grupoId ?? grupoIdInicial ?? "");
  const [erro, setErro] = useState("");

  const gruposFiltrados = grupos.filter((g) => g.tipo === tipo);

  const submit = async () => {
    if (!nome.trim()) { setErro("Nome é obrigatório."); return; }
    const payload = { nome: nome.trim(), tipo, grupoId: grupoId || undefined };
    if (editando) await updateCategoria(editando.id, payload);
    else await addCategoria(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} /></div>
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => { setTipo(v as "Receita" | "Despesa"); setGrupoId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Receita">Receita</SelectItem>
              <SelectItem value="Despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Grupo</Label>
          <Select value={grupoId || "__none__"} onValueChange={(v) => setGrupoId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Sem grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem grupo</SelectItem>
              {gruposFiltrados.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
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
