import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/financeiro/metas")({
  component: Metas,
});

const metas = [
  { t: "Receita trimestral", atual: 184000, meta: 250000 },
  { t: "Redução de custos", atual: 32, meta: 50, suf: "%" },
  { t: "Novos contratos", atual: 14, meta: 20 },
  { t: "Margem operacional", atual: 22, meta: 30, suf: "%" },
];

function Metas() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metas.map((m) => {
        const pct = Math.min(100, Math.round((m.atual / m.meta) * 100));
        return (
          <Card key={m.t} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{m.t}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold">
                  {m.suf
                    ? `${m.atual}${m.suf}`
                    : `R$ ${m.atual.toLocaleString("pt-BR")}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  Meta: {m.suf ? `${m.meta}${m.suf}` : `R$ ${m.meta.toLocaleString("pt-BR")}`}
                </span>
              </div>
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">{pct}% concluído</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
