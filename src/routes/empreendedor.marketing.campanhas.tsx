import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData, Campanha, CampStatus } from "@/lib/data-store";

export const Route = createFileRoute("/marketing/campanhas")({
  component: Campanhas,
});

const badgeColor: Record<CampStatus, string> = {
  Ativa: "bg-emerald-500/15 text-emerald-700 border-0",
  Pausada: "bg-amber-500/15 text-amber-700 border-0",
  Encerrada: "bg-muted text-muted-foreground border-0",
};

function Campanhas() {
  const { campanhas, removeCampanha } = useData();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);

  const totalInvest = campanhas.reduce((s, c) => s + c.orcamento, 0);
  const totalLeads = campanhas.reduce((s, c) => s + c.leads, 0);
  const cplMedio = totalLeads > 0 ? Math.round(totalInvest / totalLeads) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "Total investido", v: `R$ ${totalInvest.toLocaleString("pt-BR")}` },
          { l: "Total de leads", v: String(totalLeads) },
          { l: "CPL médio", v: `R$ ${cplMedio.toLocaleString("pt-BR")}` },
        ].map((k) => (
          <Card key={k.l} className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{k.l}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold">{k.v}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditando(null)}>
              <Plus className="h-4 w-4" /> Nova Campanha
            </Button>
          </DialogTrigger>
          <CampanhaForm
            key={editando?.id ?? "novo"}
            editando={editando}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campanhas.map((c) => {
          const cpl = c.leads > 0 ? Math.round(c.orcamento / c.leads) : 0;
          return (
            <Card key={c.id} className="border-border/60">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{c.nome}</CardTitle>
                    <CardDescription>{c.canal}</CardDescription>
                  </div>
                  <Badge className={badgeColor[c.status]}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Orçamento</p>
                    <p className="font-semibold">R$ {c.orcamento.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Leads gerados</p>
                    <p className="font-semibold">{c.leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="font-medium">{c.inicio} – {c.fim}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPL</p>
                    <p className="font-semibold text-primary">R$ {cpl.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-1 pt-2 border-t border-border/60">
                  <Button variant="ghost" size="sm"
                    onClick={() => { setEditando(c); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500"
                    onClick={() => removeCampanha(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const CANAIS = ["Google Ads", "Instagram", "Email", "LinkedIn", "Evento", "Outro"];

function CampanhaForm({
  editando, onClose,
}: { editando: Campanha | null; onClose: () => void }) {
  const { addCampanha, updateCampanha } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [canal, setCanal] = useState(editando?.canal ?? "Google Ads");
  const [orcamento, setOrcamento] = useState(editando ? String(editando.orcamento) : "");
  const [inicio, setInicio] = useState(editando?.inicio ?? "");
  const [fim, setFim] = useState(editando?.fim ?? "");
  const [leads, setLeads] = useState(editando ? String(editando.leads) : "0");
  const [status, setStatus] = useState<CampStatus>(editando?.status ?? "Ativa");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim() || !orcamento || !inicio || !fim) { setErro("Preencha todos os campos."); return; }
    const o = Number(orcamento); const l = Number(leads);
    if (Number.isNaN(o) || o <= 0) { setErro("Orçamento inválido."); return; }
    const payload = {
      nome: nome.trim(), canal, orcamento: o, inicio, fim,
      leads: Number.isNaN(l) ? 0 : l, status,
    };
    if (editando) updateCampanha(editando.id, payload);
    else addCampanha(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? "Editar campanha" : "Nova campanha"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Canal</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANAIS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CampStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Pausada">Pausada</SelectItem>
                <SelectItem value="Encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Orçamento (R$)</Label>
            <Input type="number" min="0" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Leads gerados</Label>
            <Input type="number" min="0" value={leads} onChange={(e) => setLeads(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Início</Label>
            <Input placeholder="dd/mm" value={inicio} onChange={(e) => setInicio(e.target.value)} maxLength={10} /></div>
          <div className="space-y-1.5"><Label>Fim</Label>
            <Input placeholder="dd/mm" value={fim} onChange={(e) => setFim(e.target.value)} maxLength={10} /></div>
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
