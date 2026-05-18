import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useData, Evento, EventoTipo } from "@/lib/data-store";

export const Route = createFileRoute("/marketing/calendario")({
  component: CalendarioPage,
});

const TIPOS: EventoTipo[] = ["Postagem", "Atividade", "Reunião"];
const tipoColor: Record<EventoTipo, string> = {
  Postagem: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  Atividade: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Reunião: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function CalendarioPage() {
  const { eventos } = useData();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [novaData, setNovaData] = useState<string | null>(null);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // domingo anterior
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === month });
    }
    return cells;
  }, [cursor]);

  const eventosPorDia = useMemo(() => {
    const m: Record<string, Evento[]> = {};
    eventos.forEach((e) => {
      (m[e.data] ||= []).push(e);
    });
    return m;
  }, [eventos]);

  const mesAtual = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const hojeStr = ymd(new Date());

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="capitalize">{mesAtual}</CardTitle>
            <CardDescription>Planejamento de postagens e atividades</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) setNovaData(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setNovaData(null)}>
                  <Plus className="h-4 w-4" /> Novo
                </Button>
              </DialogTrigger>
              <EventoForm
                key={novaData ?? "novo"}
                editando={null}
                dataInicial={novaData}
                onClose={() => setOpenNew(false)}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-border text-xs">
            {DOW.map((d) => (
              <div key={d} className="bg-muted/60 py-2 text-center font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {grid.map((cell, i) => {
              const key = ymd(cell.date);
              const evs = eventosPorDia[key] || [];
              const isToday = key === hojeStr;
              return (
                <div
                  key={i}
                  onClick={() => { setNovaData(key); setOpenNew(true); }}
                  className={`min-h-[110px] bg-background p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${
                    cell.inMonth ? "" : "opacity-40"
                  }`}
                >
                  <div className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}>{cell.date.getDate()}</div>
                  <div className="space-y-1">
                    {evs.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}
                        className={`w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${tipoColor[e.tipo]}`}
                      >
                        {e.titulo}
                      </button>
                    ))}
                    {evs.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{evs.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {TIPOS.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded border ${tipoColor[t]}`} />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        {selected && (
          <EventoForm key={selected.id} editando={selected} dataInicial={null}
            onClose={() => setSelected(null)} />
        )}
      </Dialog>
    </div>
  );
}

function EventoForm({
  editando, dataInicial, onClose,
}: {
  editando: Evento | null;
  dataInicial: string | null;
  onClose: () => void;
}) {
  const { addEvento, updateEvento, removeEvento } = useData();
  const [titulo, setTitulo] = useState(editando?.titulo ?? "");
  const [data, setData] = useState(editando?.data ?? dataInicial ?? ymd(new Date()));
  const [tipo, setTipo] = useState<EventoTipo>(editando?.tipo ?? "Postagem");
  const [canal, setCanal] = useState(editando?.canal ?? "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!titulo.trim() || !data) { setErro("Título e data são obrigatórios."); return; }
    const payload = {
      titulo: titulo.trim(), data, tipo,
      canal: canal.trim() || undefined,
      obs: obs.trim() || undefined,
    };
    if (editando) updateEvento(editando.id, payload);
    else addEvento(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar evento" : "Novo evento"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as EventoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Canal (opcional)</Label>
          <Input value={canal} onChange={(e) => setCanal(e.target.value)} maxLength={40}
            placeholder="Instagram, Email, Zoom..." /></div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} maxLength={500} /></div>
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter className="sm:justify-between">
        {editando ? (
          <Button variant="ghost" className="text-red-500"
            onClick={() => { removeEvento(editando.id); onClose(); }}>
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
