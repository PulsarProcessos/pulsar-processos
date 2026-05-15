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

export const Route = createFileRoute("/marketing/")({
  component: Leads,
});

const leads = [
  { n: "Camila Souza", e: "camila@exemplo.com", origem: "Google Ads", score: 92 },
  { n: "Rafael Lima", e: "rafa@exemplo.com", origem: "Instagram", score: 78 },
  { n: "Juliana Paes", e: "ju@exemplo.com", origem: "Indicação", score: 88 },
  { n: "Pedro Mendes", e: "pedro@exemplo.com", origem: "LinkedIn", score: 65 },
  { n: "Bianca Reis", e: "bianca@exemplo.com", origem: "Email", score: 71 },
];

function Leads() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Leads recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.e}>
                <TableCell>
                  <p className="font-medium">{l.n}</p>
                  <p className="text-xs text-muted-foreground">{l.e}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{l.origem}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-semibold ${
                      l.score >= 85
                        ? "text-emerald-600"
                        : l.score >= 70
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {l.score}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
