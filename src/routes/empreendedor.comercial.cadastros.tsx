import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useData, Produto } from "@/lib/data-store";

export const Route = createFileRoute("/comercial/cadastros")({
  component: ComercialCadastros,
});

function ComercialCadastros() {
  return (
    <Tabs defaultValue="produtos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="produtos">Produtos / Serviços</TabsTrigger>
        <TabsTrigger value="etapas">Etapas do Funil</TabsTrigger>
      </TabsList>
      <TabsContent value="produtos"><ProdutosPanel /></TabsContent>
      <TabsContent value="etapas"><EtapasPanel /></TabsContent>
    </Tabs>
  );
}

function ProdutosPanel() {
  const { produtos, removeProduto } = useData();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produtos / Serviços</CardTitle>
          <CardDescription>Catálogo vinculado às oportunidades do pipeline.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditando(null)}>
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
          </DialogTrigger>
          <ProdutoForm key={editando?.id ?? "novo"} editando={editando} onClose={() => setOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.descricao || "—"}</TableCell>
                <TableCell className="text-right font-semibold">R$ {p.preco.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditando(p); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                      onClick={() => removeProduto(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {produtos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum produto cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProdutoForm({
  editando, onClose,
}: { editando: Produto | null; onClose: () => void }) {
  const { addProduto, updateProduto } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [preco, setPreco] = useState(editando ? String(editando.preco) : "");
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim()) { setErro("Nome obrigatório."); return; }
    const p = Number(preco);
    if (Number.isNaN(p) || p < 0) { setErro("Preço inválido."); return; }
    const payload = { nome: nome.trim(), preco: p, descricao: descricao.trim() || undefined };
    if (editando) updateProduto(editando.id, payload);
    else addProduto(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
        <div className="space-y-1.5"><Label>Preço (R$)</Label>
          <Input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={400} /></div>
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{editando ? "Salvar alterações" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EtapasPanel() {
  const { etapas, addEtapa, renameEtapa, removeEtapa, moveEtapa } = useData();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");

  const adicionar = () => {
    if (!novo.trim()) return;
    addEtapa(novo.trim());
    setNovo("");
  };

  const salvarEdicao = () => {
    if (editando && editValor.trim()) {
      renameEtapa(editando, editValor.trim());
    }
    setEditando(null);
    setEditValor("");
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Etapas do Funil de Vendas</CardTitle>
        <CardDescription>Personalize as colunas do pipeline comercial. A ordem aqui é a ordem exibida.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova etapa"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
            maxLength={40}
          />
          <Button onClick={adicionar}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
        <div className="space-y-2">
          {etapas.map((e, i) => (
            <div key={e} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
              <Badge variant="outline" className="w-7 justify-center">{i + 1}</Badge>
              {editando === e ? (
                <Input
                  value={editValor}
                  onChange={(ev) => setEditValor(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === "Enter") salvarEdicao(); if (ev.key === "Escape") setEditando(null); }}
                  autoFocus
                  className="h-8 flex-1"
                  maxLength={40}
                />
              ) : (
                <span className="flex-1 text-sm font-medium">{e}</span>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0}
                  onClick={() => moveEtapa(e, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === etapas.length - 1}
                  onClick={() => moveEtapa(e, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {editando === e ? (
                  <Button variant="ghost" size="sm" onClick={salvarEdicao}>Salvar</Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setEditando(e); setEditValor(e); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" disabled={etapas.length <= 1}
                  onClick={() => removeEtapa(e)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {etapas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma etapa.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
