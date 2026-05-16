import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/comercial/clientes")({
  component: Clientes,
});

type Cliente = {
  id: string;
  nome: string;
  empresa: string;
  segmento: string;
  origem: string;
  oportunidades: number;
  cadastro: string;
  email?: string;
  telefone?: string;
  historico?: { d: string; t: string }[];
  notas?: string;
};

const initial: Cliente[] = [
  {
    id: "1", nome: "Carlos Mendes", empresa: "Acme Corp", segmento: "Tecnologia",
    origem: "Indicação", oportunidades: 2, cadastro: "12/01/2026",
    email: "carlos@acme.com", telefone: "(11) 99876-1234",
    historico: [
      { d: "12/05", t: "Proposta enviada" },
      { d: "05/05", t: "Reunião de descoberta" },
      { d: "20/04", t: "Cadastro criado" },
    ],
    notas: "Cliente potencial para upsell de plano anual.",
  },
  {
    id: "2", nome: "Renata Alves", empresa: "Globex Ltda.", segmento: "Varejo",
    origem: "Google Ads", oportunidades: 1, cadastro: "03/02/2026",
    email: "renata@globex.com", telefone: "(11) 98123-4567",
    historico: [{ d: "10/05", t: "Follow-up por email" }, { d: "01/05", t: "Demo realizada" }],
    notas: "Decisão depende do CFO.",
  },
  {
    id: "3", nome: "Pedro Lima", empresa: "Initech", segmento: "Serviços",
    origem: "LinkedIn", oportunidades: 1, cadastro: "18/03/2026",
    email: "pedro@initech.com", telefone: "(21) 99500-1122",
    historico: [{ d: "08/05", t: "Cliente cadastrado" }],
    notas: "Interesse em consultoria pontual.",
  },
  {
    id: "4", nome: "Beatriz Souza", empresa: "Umbrella", segmento: "Saúde",
    origem: "Indicação", oportunidades: 1, cadastro: "02/04/2026",
    email: "bia@umbrella.com", telefone: "(31) 98233-9911",
    historico: [{ d: "06/05", t: "Proposta enviada" }],
    notas: "Pacote anual em análise.",
  },
  {
    id: "5", nome: "Luiz Tavares", empresa: "Hooli", segmento: "Tecnologia",
    origem: "Evento", oportunidades: 1, cadastro: "25/04/2026",
    email: "luiz@hooli.com", telefone: "(11) 97001-2030",
    historico: [{ d: "11/05", t: "Negociação iniciada" }],
    notas: "Quer começar em junho.",
  },
];

function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [openNovo, setOpenNovo] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);

  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [segmento, setSegmento] = useState("");
  const [origem, setOrigem] = useState("");
  const [erro, setErro] = useState("");

  const criar = () => {
    if (!nome.trim() || !empresa.trim()) { setErro("Nome e empresa são obrigatórios."); return; }
    const c: Cliente = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      empresa: empresa.trim(),
      segmento: segmento.trim() || "Outros",
      origem: origem.trim() || "Direto",
      oportunidades: 0,
      cadastro: new Date().toLocaleDateString("pt-BR"),
      historico: [{ d: new Date().toLocaleDateString("pt-BR"), t: "Cliente cadastrado" }],
    };
    setClientes((p) => [c, ...p]);
    setNome(""); setEmpresa(""); setSegmento(""); setOrigem(""); setErro("");
    setOpenNovo(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <p className="text-sm text-muted-foreground">{clientes.length} clientes cadastrados</p>
          <Dialog open={openNovo} onOpenChange={setOpenNovo}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
                <div className="space-y-1.5"><Label>Empresa</Label>
                  <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={80} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Segmento</Label>
                    <Input value={segmento} onChange={(e) => setSegmento(e.target.value)} maxLength={40} /></div>
                  <div className="space-y-1.5"><Label>Origem</Label>
                    <Input value={origem} onChange={(e) => setOrigem(e.target.value)} maxLength={40} /></div>
                </div>
                {erro && <p className="text-sm text-red-500">{erro}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
                <Button onClick={criar}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-center">Oportunidades</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.empresa}</TableCell>
                  <TableCell><Badge variant="outline">{c.segmento}</Badge></TableCell>
                  <TableCell>{c.origem}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{c.oportunidades}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.cadastro}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {selected.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selected.nome}</SheetTitle>
                    <SheetDescription>{selected.empresa} · {selected.segmento}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selected.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{selected.telefone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="text-sm font-medium">{selected.origem}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastro</p>
                    <p className="text-sm font-medium">{selected.cadastro}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Histórico</h3>
                  <ul className="space-y-3">
                    {selected.historico?.map((h, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm">{h.t}</p>
                          <p className="text-xs text-muted-foreground">{h.d}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selected.notas ?? "Sem notas."}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
