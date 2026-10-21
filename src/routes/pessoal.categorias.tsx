import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePessoal, CategoriaPessoal, TipoMov } from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/categorias")({
  component: CategoriasPessoais,
});

function CategoriasPessoais() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CategoriasCard tipo="Despesa" titulo="Categorias de saída" descricao="Para classificar seus gastos: mercado, saúde, lazer..." />
      <CategoriasCard tipo="Receita" titulo="Categorias de entrada" descricao="Para classificar o que entra: salário, vendas, extras..." />
    </div>
  );
}

function CategoriasCard({ tipo, titulo, descricao }: { tipo: TipoMov; titulo: string; descricao: string }) {
  const { categorias, addCategoria, removeCategoria } = usePessoal();
  const [nova, setNova] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const lista = categorias.filter((c) => c.tipo === tipo);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nova.trim()) return;
    if (await addCategoria({ nome: nova, tipo })) setNova("");
  };

  const excluir = async (c: CategoriaPessoal) => {
    if (!confirm(`Excluir a categoria "${c.nome}"? Os lançamentos dela ficam sem categoria.`)) return;
    await removeCategoria(c.id);
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={adicionar} className="flex gap-2">
          <Input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da nova categoria" />
          <Button type="submit" disabled={!nova.trim()}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>
        {lista.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {lista.map((c) =>
              editandoId === c.id ? (
                <EditarLinha key={c.id} categoria={c} onConcluir={() => setEditandoId(null)} />
              ) : (
                <div key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm">{c.nome}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Renomear"
                      onClick={() => setEditandoId(c.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir"
                      onClick={() => excluir(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditarLinha({ categoria, onConcluir }: { categoria: CategoriaPessoal; onConcluir: () => void }) {
  const { updateCategoria } = usePessoal();
  const [nome, setNome] = useState(categoria.nome);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || nome.trim() === categoria.nome) { onConcluir(); return; }
    if (await updateCategoria(categoria.id, nome)) onConcluir();
  };

  return (
    <form onSubmit={salvar} className="flex items-center gap-2 py-2">
      <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className="h-8"
        onKeyDown={(e) => { if (e.key === "Escape") onConcluir(); }} />
      <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" title="Salvar">
        <Check className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Cancelar" onClick={onConcluir}>
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
