import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { useData, Deal, DealStage } from "@/lib/data-store";

export const Route = createFileRoute("/comercial/")({
  component: Pipeline,
});

const STAGE_COLORS = [
  "bg-slate-400", "bg-blue-500", "bg-violet-500",
  "bg-amber-500", "bg-emerald-500", "bg-red-500",
  "bg-cyan-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
];

function Pipeline() {
  const { deals, etapas, updateDeal } = useData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const g: Record<string, Deal[]> = {};
    etapas.forEach((e) => { g[e] = []; });
    deals.forEach((d) => {
      if (g[d.stage]) g[d.stage].push(d);
      else (g[etapas[0]] ||= []).push(d);
    });
    return g;
  }, [deals, etapas]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id as DealStage | undefined;
    if (!overId) return;
    updateDeal(e.active.id as string, { stage: overId });
  };

  const active = deals.find((d) => d.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Personalize etapas e produtos em{" "}
          <Link to="/comercial/cadastros" className="text-primary underline">Cadastros</Link>.
        </p>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nova Oportunidade</Button>
          </DialogTrigger>
          <DealForm key="novo" editando={null} onClose={() => setOpenNew(false)} />
        </Dialog>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {etapas.map((s, i) => (
            <Column key={s} stage={s} color={STAGE_COLORS[i % STAGE_COLORS.length]}
              deals={grouped[s] ?? []} onSelect={setSelected} />
          ))}
        </div>
        <DragOverlay>{active ? <DealCard deal={active} dragging /> : null}</DragOverlay>
      </DndContext>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        {selected && (
          <DealForm key={selected.id} editando={selected} onClose={() => setSelected(null)} />
        )}
      </Dialog>
    </div>
  );
}

function Column({
  stage, color, deals, onSelect,
}: { stage: DealStage; color: string; deals: Deal[]; onSelect: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + d.valor, 0);
  return (
    <Card
      ref={setNodeRef}
      className={`border-border/60 transition-colors ${isOver ? "border-primary/60 bg-primary/5" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <CardTitle className="text-sm font-semibold">{stage}</CardTitle>
          </div>
          <Badge variant="secondary">{deals.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">R$ {total.toLocaleString("pt-BR")}</p>
      </CardHeader>
      <CardContent className="space-y-2 min-h-[120px]">
        {deals.map((d) => <DealCard key={d.id} deal={d} onClick={() => onSelect(d)} />)}
      </CardContent>
    </Card>
  );
}

function DealCard({
  deal, dragging, onClick,
}: { deal: Deal; dragging?: boolean; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) onClick();
        e.stopPropagation();
      }}
      className={`rounded-lg border border-border bg-card p-3 cursor-pointer transition-colors hover:border-primary/50 ${
        isDragging && !dragging ? "opacity-30" : ""
      } ${dragging ? "shadow-lg ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{deal.cliente}</p>
        <Badge variant="outline" className="text-[10px]">{deal.prob}%</Badge>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{deal.titulo}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">R$ {deal.valor.toLocaleString("pt-BR")}</span>
        <span className="text-muted-foreground">{deal.dias}d na etapa</span>
      </div>
    </div>
  );
}

function DealForm({
  editando, onClose,
}: { editando: Deal | null; onClose: () => void }) {
  const { addDeal, updateDeal, removeDeal, etapas, produtos } = useData();
  const [cliente, setCliente] = useState(editando?.cliente ?? "");
  const [titulo, setTitulo] = useState(editando?.titulo ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [stage, setStage] = useState<DealStage>(editando?.stage ?? etapas[0] ?? "Lead");
  const [prob, setProb] = useState(editando ? String(editando.prob) : "20");
  const [produtoId, setProdutoId] = useState(editando?.produtoId ?? "");
  const [contato, setContato] = useState(editando?.contato ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [erro, setErro] = useState("");

  const onProdutoChange = (id: string) => {
    setProdutoId(id);
    const p = produtos.find((x) => x.id === id);
    if (p) {
      if (!titulo.trim()) setTitulo(p.nome);
      if (!valor) setValor(String(p.preco));
    }
  };

  const submit = () => {
    if (!cliente.trim() || !titulo.trim() || !valor) { setErro("Preencha cliente, título e valor."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v < 0) { setErro("Valor inválido."); return; }
    const p = Number(prob);
    const payload = {
      cliente: cliente.trim(), titulo: titulo.trim(), valor: v,
      stage, prob: Number.isNaN(p) ? 0 : p,
      produtoId: produtoId || undefined,
      contato: contato.trim() || undefined,
      email: email.trim() || undefined,
      obs: obs.trim() || undefined,
    };
    if (editando) updateDeal(editando.id, payload);
    else addDeal({ ...payload, dias: 0 });
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Cliente</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Produto / Serviço</Label>
          <Select value={produtoId} onValueChange={onProdutoChange}>
            <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
            <SelectContent>
              {produtos.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Nenhum produto. Cadastre em Cadastros.
                </div>
              ) : produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} — R$ {p.preco.toLocaleString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Valor (R$)</Label>
            <Input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Etapa</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {etapas.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Prob. (%)</Label>
            <Input type="number" min="0" max="100" value={prob} onChange={(e) => setProb(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Telefone / Contato</Label>
            <Input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={40} /></div>
          <div className="space-y-1.5"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={3} /></div>
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter className="sm:justify-between">
        {editando ? (
          <Button variant="ghost" className="text-red-500"
            onClick={() => { removeDeal(editando.id); onClose(); }}>
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>{editando ? "Salvar alterações" : "Salvar"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
