import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

const rows = [
  { d: "12/05", desc: "Mensalidade · Acme Corp", cat: "Receita", v: 4800, in: true },
  { d: "11/05", desc: "Anúncios Meta Ads", cat: "Marketing", v: 1200, in: false },
  { d: "10/05", desc: "Mensalidade · Globex", cat: "Receita", v: 3200, in: true },
  { d: "09/05", desc: "Salários", cat: "Folha", v: 18500, in: false },
  { d: "08/05", desc: "Consultoria · Initech", cat: "Receita", v: 6500, in: true },
];

function Lancamentos() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Lançamentos recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{r.d}</TableCell>
                <TableCell className="font-medium">{r.desc}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.cat}</Badge>
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    r.in ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {r.in ? "+" : "−"} R$ {r.v.toLocaleString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
