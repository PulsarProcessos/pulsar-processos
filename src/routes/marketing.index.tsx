import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
} from "recharts";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useData, Lead, LeadStatus, LEAD_STATUS } from "@/lib/data-store";

export const Route = createFileRoute("/marketing/")({
  component: Leads,
});

const ORIGENS = ["Instagram", "Indicação", "Google", "Evento", "Outro"] as const;

const statusBadge: Record<LeadStatus, string> = {
  Novo: "bg-blue-500/15 text-blue-600 border-0",
  Contatado: "bg-amber-500/15 text-amber-700 border-0",
  Qualificado: "bg-violet-500/15 text-violet-700 border-0",
  Convertido: "bg-emerald-500/15 text-emerald-700 border-0",
  Perdido: "bg-red-500/15 text-red-600 border-0",
};

const PIE_COLORS = ["#6C63FF", "#FF6584", "#22C55E", "#F59E0B", "#94A3B8"];

function Leads() {
  const { leads, advanceLeadStatus } = useData();
  const [fOrigem, setFOrigem] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);

  const filtered = useMemo(
    () => leads.filter((l) =>
      (fOrigem === "todas" || l.origem === fOrigem) &&
      (fStatus === "todos" || l.status === fStatus),
    ),
    [leads, fOrigem, fStatus],
  );

  const pieData = useMemo(
    () => ORIGENS.map((o) => ({ name: o, value: leads.filter((l) => l.origem === o).length })),
    [leads],
  );

  const handleAdvance = (lead: Lead) => {
    const idx = LEAD_STATUS.indexOf(lead.status);
    const next = LEAD_STATUS[Math.min(idx + 1, LEAD_STATUS.length - 1)];
    if (lead.status === "Convertido" || lead.status === "Perdido") return;
    advanceLeadStatus(lead.id);
    if (next === "Convertido") {
      toast.success(`${lead.nome} convertido — oportunidade criada no Pipeline.`);
    } else {
      toast(`${lead.nome}: ${lead.status} → ${next}`);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={fOrigem} onValueChange={setFOrigem}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {LEAD_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Novo Lead</Button>
            </DialogTrigger>
            <LeadForm key="novo" editando={null} onClose={() => setOpenNew(false)} />
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const isFinal = l.status === "Convertido" || l.status === "Perdido";
                return (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelected(l)}>
                    <TableCell>
                      <p className="font-medium hover:text-primary">{l.nome}</p>
                      <p className="text-xs text-muted-foreground">{l.email} · {l.tel}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{l.origem}</Badge></TableCell>
                    <TableCell><Badge className={statusBadge[l.status]}>{l.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm" variant="ghost" disabled={isFinal}
                        onClick={(e) => { e.stopPropagation(); handleAdvance(l); }}
                      >
                        Avançar <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Nenhum lead.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Clique no nome para visualizar / editar. Avançar move: Novo → Contatado → Qualificado → Convertido (cria oportunidade no Pipeline).
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Distribuição por origem</CardTitle>
          <CardDescription>Total: {leads.length} leads</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        {selected && (
          <LeadForm key={selected.id} editando={selected} onClose={() => setSelected(null)} />
        )}
      </Dialog>
    </div>
  );
}

function LeadForm({
  editando, onClose,
}: { editando: Lead | null; onClose: () => void }) {
  const { addLead, updateLead, removeLead } = useData();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [tel, setTel] = useState(editando?.tel ?? "");
  const [origem, setOrigem] = useState(editando?.origem ?? "Google");
  const [status, setStatus] = useState<LeadStatus>(editando?.status ?? "Novo");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim() || !email.trim()) { setErro("Nome e email obrigatórios."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErro("Email inválido."); return; }
    const payload = {
      nome: nome.trim(), email: email.trim(), tel: tel.trim(),
      origem, status,
      obs: obs.trim() || undefined,
    };
    if (editando) {
      updateLead(editando.id, payload);
    } else {
      addLead({
        ...payload,
        data: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      });
    }
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? `Lead · ${editando.nome}` : "Novo lead"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label>
            <Input value={tel} onChange={(e) => setTel(e.target.value)} maxLength={20} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} maxLength={500} /></div>
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
      <DialogFooter className="sm:justify-between">
        {editando ? (
          <Button variant="ghost" className="text-red-500"
            onClick={() => { removeLead(editando.id); onClose(); }}>
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
