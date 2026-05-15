import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" defaultValue="Ana Carolina" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" defaultValue="ana@pulsar.app" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" defaultValue="Head de Operações" />
          </div>
          <Button>Salvar alterações</Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>Notificações e comportamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { l: "Resumo diário por e-mail", d: "Receber métricas todo dia às 8h" },
            { l: "Alertas de metas", d: "Notificar quando metas atingirem 80%" },
            { l: "Novidades do produto", d: "Receber atualizações da Pulsar" },
          ].map((p, i) => (
            <div key={p.l}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.l}</p>
                  <p className="text-xs text-muted-foreground">{p.d}</p>
                </div>
                <Switch defaultChecked={i !== 2} />
              </div>
              {i < 2 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
