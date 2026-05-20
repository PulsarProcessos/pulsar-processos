import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Target } from "lucide-react";

export const Route = createFileRoute("/financeiro/metas")({
  component: Metas,
});

type Meta = { mes: string; meta: number; realizado: number };

const inicial: Meta[] = [];

function Metas() {
  const [metas, setMetas] = useState<Meta[]>(inicial);
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");

  const criar = () => {
    if (!mes.trim() || !valor) { setErro("Preencha mês e valor."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) { setErro("Valor inválido."); return; }
    setMetas((p) => [...p, { mes: mes.trim(), meta: v, realizado: 0 }]);
    setMes(""); setValor(""); setErro(""); setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Definir meta do próximo mês</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Input placeholder="Ex: Junho/26" value={mes} onChange={(e) => setMes(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Meta (R$)</Label>
                <Input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              {erro && <p className="text-sm text-red-500">{erro}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={criar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metas.map((m) => {
          const pct = Math.min(100, Math.round((m.realizado / m.meta) * 100));
          const ok = m.realizado >= m.meta;
          return (
            <Card key={m.mes} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{m.mes}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${ok ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                  <Target className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">R$ {m.realizado.toLocaleString("pt-BR")}</span>
                  <span className="text-sm text-muted-foreground">Meta R$ {m.meta.toLocaleString("pt-BR")}</span>
                </div>
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground">{pct}% da meta</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
