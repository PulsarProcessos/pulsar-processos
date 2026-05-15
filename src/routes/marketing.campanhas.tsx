import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/marketing/campanhas")({
  component: Campanhas,
});

const campanhas = [
  { n: "Black Friday 2026", canal: "Meta Ads", status: "Ativa", orc: 12000, gasto: 8400, conv: 124 },
  { n: "Lançamento Pulsar Pro", canal: "Google Ads", status: "Ativa", orc: 18000, gasto: 6200, conv: 78 },
  { n: "Reativação Base", canal: "Email", status: "Pausada", orc: 3000, gasto: 2900, conv: 45 },
  { n: "Webinar Junho", canal: "LinkedIn", status: "Rascunho", orc: 5000, gasto: 0, conv: 0 },
];

function Campanhas() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {campanhas.map((c) => {
        const pct = Math.round((c.gasto / c.orc) * 100);
        return (
          <Card key={c.n} className="border-border/60">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{c.n}</CardTitle>
                  <CardDescription>{c.canal}</CardDescription>
                </div>
                <Badge
                  variant={c.status === "Ativa" ? "default" : "secondary"}
                  className={
                    c.status === "Ativa"
                      ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20"
                      : ""
                  }
                >
                  {c.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Orçamento</p>
                  <p className="font-semibold">R$ {c.orc.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Investido</p>
                  <p className="font-semibold">R$ {c.gasto.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversões</p>
                  <p className="font-semibold">{c.conv}</p>
                </div>
              </div>
              <div>
                <Progress value={pct} />
                <p className="mt-1 text-xs text-muted-foreground">{pct}% do orçamento</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
