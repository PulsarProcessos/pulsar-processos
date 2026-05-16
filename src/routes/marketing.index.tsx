import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/marketing/")({
  component: Leads,
});

const ORIGENS = ["Instagram", "Indicação", "Google", "Evento", "Outro"] as const;
type Origem = typeof ORIGENS[number];
const STATUSES = ["Novo", "Contatado", "Qualificado", "Perdido"] as const;
type StatusL = typeof STATUSES[number];

type Lead = {
  id: string; nome: string; email: string; tel: string; origem: Origem; status: StatusL; data: string;
};

const initial: Lead[] = [
  { id: "1", nome: "Camila Souza", email: "camila@x.com", tel: "(11) 99876-1100", origem: "Google", status: "Novo", data: "14/05" },
  { id: "2", nome: "Rafael Lima", email: "rafa@x.com", tel: "(11) 99776-2200", origem: "Instagram", status: "Contatado", data: "13/05" },
  { id: "3", nome: "Juliana Paes", email: "ju@x.com", tel: "(11) 99876-2300", origem: "Indicação", status: "Qualificado", data: "12/05" },
  { id: "4", nome: "Pedro Mendes", email: "pedro@x.com", tel: "(11) 99876-2400", origem: "Google", status: "Novo", data: "12/05" },
  { id: "5", nome: "Bianca Reis", email: "bianca@x.com", tel: "(11) 99876-2500", origem: "Evento", status: "Contatado", data: "11/05" },
  { id: "6", nome: "Marcos Vinícius", email: "marcos@x.com", tel: "(11) 99876-2600", origem: "Instagram", status: "Qualificado", data: "11/05" },
  { id: "7", nome: "Ana Beatriz", email: "ana@x.com", tel: "(11) 99876-2700", origem: "Indicação", status: "Novo", data: "10/05" },
  { id: "8", nome: "Tiago Ferreira", email: "tiago@x.com", tel: "(11) 99876-2800", origem: "Google", status: "Perdido", data: "09/05" },
  { id: "9", nome: "Letícia Almeida", email: "leticia@x.com", tel: "(11) 99876-2900", origem: "Instagram", status: "Contatado", data: "09/05" },
  { id: "10", nome: "Bruno Costa", email: "bruno@x.com", tel: "(11) 99876-3000", origem: "Outro", status: "Novo", data: "08/05" },
  { id: "11", nome: "Fernanda Dias", email: "fer@x.com", tel: "(11) 99876-3100", origem: "Evento", status: "Qualificado", data: "08/05" },
  { id: "12", nome: "Lucas Ramos", email: "lucas@x.com", tel: "(11) 99876-3200", origem: "Google", status: "Novo", data: "07/05" },
  { id: "13", nome: "Patrícia Melo", email: "patricia@x.com", tel: "(11) 99876-3300", origem: "Instagram", status: "Contatado", data: "06/05" },
  { id: "14", nome: "Gustavo Pires", email: "gustavo@x.com", tel: "(11) 99876-3400", origem: "Indicação", status: "Qualificado", data: "05/05" },
  { id: "15", nome: "Helena Castro", email: "helena@x.com", tel: "(11) 99876-3500", origem: "Outro", status: "Perdido", data: "04/05" },
];

const statusBadge: Record<StatusL, string> = {
  Novo: "bg-blue-500/15 text-blue-600 border-0",
  Contatado: "bg-amber-500/15 text-amber-700 border-0",
  Qualificado: "bg-emerald-500/15 text-emerald-700 border-0",
  Perdido: "bg-red-500/15 text-red-600 border-0",
};

const PIE_COLORS = ["#6C63FF", "#FF6584", "#22C55E", "#F59E0B", "#94A3B8"];

function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [fOrigem, setFOrigem] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);

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
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <NovoLead open={open} onOpenChange={setOpen} onCreate={(l) => setLeads((p) => [l, ...p])} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Captura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.nome}</p>
                    <p className="text-xs text-muted-foreground">{l.email} · {l.tel}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{l.origem}</Badge></TableCell>
                  <TableCell><Badge className={statusBadge[l.status]}>{l.status}</Badge></TableCell>
                  <TableCell className="text-right text-muted-foreground">{l.data}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Nenhum lead.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
    </div>
  );
}

function NovoLead({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (l: Lead) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [origem, setOrigem] = useState<Origem>("Google");
  const [status, setStatus] = useState<StatusL>("Novo");
  const [erro, setErro] = useState("");

  const submit = () => {
    if (!nome.trim() || !email.trim()) { setErro("Nome e email obrigatórios."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErro("Email inválido."); return; }
    onCreate({
      id: crypto.randomUUID(),
      nome: nome.trim(), email: email.trim(), tel: tel.trim(),
      origem, status, data: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    });
    setNome(""); setEmail(""); setTel(""); setErro(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Novo Lead</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} maxLength={20} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Origem</Label>
              <Select value={origem} onValueChange={(v) => setOrigem(v as Origem)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusL)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
