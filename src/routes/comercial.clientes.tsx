import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/comercial/clientes")({
  component: Clientes,
});

const clientes = [
  { n: "Acme Corp", e: "contato@acme.com", st: "Ativo", v: "R$ 24.000" },
  { n: "Globex", e: "vendas@globex.com", st: "Ativo", v: "R$ 18.500" },
  { n: "Initech", e: "ops@initech.com", st: "Em pausa", v: "R$ 12.300" },
  { n: "Umbrella", e: "hi@umbrella.io", st: "Ativo", v: "R$ 31.200" },
  { n: "Hooli", e: "team@hooli.com", st: "Negociação", v: "R$ 9.800" },
];

function Clientes() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.n}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {c.n.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{c.n}</p>
                      <p className="text-xs text-muted-foreground">{c.e}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.st === "Ativo" ? "default" : "secondary"}
                    className={c.st === "Ativo" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20" : ""}
                  >
                    {c.st}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{c.v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
