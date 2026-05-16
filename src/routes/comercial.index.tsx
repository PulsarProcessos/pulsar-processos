import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export const Route = createFileRoute("/comercial/")({
  component: Pipeline,
});

type Stage = "Lead" | "Qualificado" | "Proposta Enviada" | "Negociação" | "Ganho" | "Perdido";

type Deal = {
  id: string;
  cliente: string;
  titulo: string;
  valor: number;
  dias: number;
  prob: number;
  stage: Stage;
};

const STAGES: Stage[] = ["Lead", "Qualificado", "Proposta Enviada", "Negociação", "Ganho", "Perdido"];

const initial: Deal[] = [
  { id: "1", cliente: "Acme Corp", titulo: "Implementação CRM", valor: 4800, dias: 2, prob: 20, stage: "Lead" },
  { id: "2", cliente: "Soylent", titulo: "Consultoria mensal", valor: 2400, dias: 5, prob: 30, stage: "Lead" },
  { id: "3", cliente: "Globex", titulo: "Auditoria fiscal", valor: 3200, dias: 3, prob: 50, stage: "Qualificado" },
  { id: "4", cliente: "Initech", titulo: "Setup financeiro", valor: 1800, dias: 7, prob: 60, stage: "Proposta Enviada" },
  { id: "5", cliente: "Umbrella", titulo: "Pacote anual", valor: 9600, dias: 4, prob: 65, stage: "Proposta Enviada" },
  { id: "6", cliente: "Hooli", titulo: "Mentoria executiva", valor: 5400, dias: 1, prob: 80, stage: "Negociação" },
  { id: "7", cliente: "Wayne Ent.", titulo: "Plano corporativo", valor: 7200, dias: 10, prob: 100, stage: "Ganho" },
  { id: "8", cliente: "Stark Ind.", titulo: "Projeto pontual", valor: 2400, dias: 14, prob: 0, stage: "Perdido" },
];

const stageColor: Record<Stage, string> = {
  "Lead": "bg-slate-400",
  "Qualificado": "bg-blue-500",
  "Proposta Enviada": "bg-violet-500",
  "Negociação": "bg-amber-500",
  "Ganho": "bg-emerald-500",
  "Perdido": "bg-red-500",
};

function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const g: Record<Stage, Deal[]> = {
      "Lead": [], "Qualificado": [], "Proposta Enviada": [], "Negociação": [], "Ganho": [], "Perdido": [],
    };
    deals.forEach((d) => g[d.stage].push(d));
    return g;
  }, [deals]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id as Stage | undefined;
    if (!overId) return;
    setDeals((prev) =>
      prev.map((d) => (d.id === e.active.id ? { ...d, stage: overId } : d)),
    );
  };

  const active = deals.find((d) => d.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NovaOportunidade
          open={open}
          onOpenChange={setOpen}
          onCreate={(d) => setDeals((p) => [d, ...p])}
        />
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {STAGES.map((s) => (
            <Column key={s} stage={s} deals={grouped[s]} />
          ))}
        </div>
        <DragOverlay>{active ? <DealCard deal={active} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ stage, deals }: { stage: Stage; deals: Deal[] }) {
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
            <span className={`h-2 w-2 rounded-full ${stageColor[stage]}`} />
            <CardTitle className="text-sm font-semibold">{stage}</CardTitle>
          </div>
          <Badge variant="secondary">{deals.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">R$ {total.toLocaleString("pt-BR")}</p>
      </CardHeader>
      <CardContent className="space-y-2 min-h-[120px]">
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
      </CardContent>
    </Card>
  );
}

function DealCard({ deal, dragging }: { deal: Deal; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-colors hover:border-primary/50 ${
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

function NovaOportunidade({
  open, onOpenChange, onCreate,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (d: Deal) => void }) {
  const [cliente, setCliente] = useState("");
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [stage, setStage] = useState<Stage>("Lead");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!cliente.trim() || !titulo.trim() || !valor) { setErro("Preencha todos os campos."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) { setErro("Valor inválido."); return; }
    onCreate({
      id: crypto.randomUUID(),
      cliente: cliente.trim(),
      titulo: titulo.trim(),
      valor: v,
      dias: 0,
      prob: stage === "Lead" ? 20 : stage === "Qualificado" ? 50 : stage === "Proposta Enviada" ? 65 : stage === "Negociação" ? 80 : stage === "Ganho" ? 100 : 0,
      stage,
    });
    setCliente(""); setTitulo(""); setValor(""); setErro(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Nova Oportunidade</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Cliente</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor (R$)</Label>
              <Input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Etapa</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
