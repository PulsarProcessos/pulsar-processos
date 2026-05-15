import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/comercial/")({
  component: Pipeline,
});

const stages = [
  {
    name: "Prospecção",
    deals: [
      { c: "Acme Corp", v: "R$ 12.000" },
      { c: "Soylent", v: "R$ 8.500" },
    ],
  },
  {
    name: "Qualificação",
    deals: [{ c: "Globex", v: "R$ 22.000" }],
  },
  {
    name: "Proposta",
    deals: [
      { c: "Initech", v: "R$ 18.000" },
      { c: "Umbrella", v: "R$ 9.200" },
    ],
  },
  {
    name: "Fechamento",
    deals: [{ c: "Hooli", v: "R$ 34.000" }],
  },
];

function Pipeline() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stages.map((s) => (
        <Card key={s.name} className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">{s.name}</CardTitle>
            <Badge variant="secondary">{s.deals.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.deals.map((d) => (
              <div
                key={d.c}
                className="rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
              >
                <p className="text-sm font-medium">{d.c}</p>
                <p className="text-xs text-muted-foreground">{d.v}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
