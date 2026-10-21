import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  usePessoal, brl, formatarMesAno, hojeISO, ContaFixa, Renda,
} from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/dinheiro-e-contas")({
  component: DinheiroEContas,
});

const SEM_CATEGORIA = "__none__";

function DinheiroEContas() {
  const { rendas, contasFixas } = usePessoal();
  const totalRendas = rendas.filter((r) => r.ativa).reduce((s, r) => s + r.valor, 0);
  const totalFixas = contasFixas.filter((c) => c.ativa).reduce((s, c) => s + c.valor, 0);
  const sobra = totalRendas - totalFixas;

  const cards = [
    { titulo: "Quanto ganho por mês", valor: totalRendas, cor: "text-emerald-600" },
    { titulo: "Contas fixas por mês", valor: totalFixas, cor: "text-red-500" },
    { titulo: "Sobra depois das contas fixas", valor: sobra, cor: sobra >= 0 ? "text-primary" : "text-red-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.titulo} className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription>{c.titulo}</CardDescription>
              <CardTitle className={`text-2xl tabular-nums ${c.cor}`}>{brl(c.valor)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RendasCard />
        <ContasFixasCard />
      </div>
    </div>
  );
}

// ============ RENDAS ============
function RendasCard() {
  const { rendas, updateRenda, removeRenda } = usePessoal();
  const [form, setForm] = useState<{ aberto: boolean; editando?: Renda }>({ aberto: false });

  const excluir = async (r: Renda) => {
    if (!confirm(`Excluir a renda "${r.descricao}"?`)) return;
    await removeRenda(r.id);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Rendas</CardTitle>
          <CardDescription>Tudo o que entra todo mês: salário, pró-labore, aluguel...</CardDescription>
        </div>
        <Button size="sm" onClick={() => setForm({ aberto: true })}>
          <Plus className="h-4 w-4" /> Nova renda
        </Button>
      </CardHeader>
      <CardContent>
        {rendas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma renda cadastrada.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {rendas.map((r) => (
              <div key={r.id} className={`flex items-center justify-between gap-3 py-3 ${r.ativa ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{r.descricao}</span>
                    {!r.ativa && <Badge variant="outline">Pausada</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.diaRecebimento ? `Recebe todo dia ${r.diaRecebimento}` : "Sem dia definido"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-emerald-600">{brl(r.valor)}</span>
                  <Switch checked={r.ativa} onCheckedChange={(v) => updateRenda(r.id, { ativa: v })}
                    aria-label="Renda ativa" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                    onClick={() => setForm({ aberto: true, editando: r })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir"
                    onClick={() => excluir(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && <RendaForm editando={form.editando} onConcluir={() => setForm({ aberto: false })} />}
      </Dialog>
    </Card>
  );
}

function RendaForm({ editando, onConcluir }: { editando?: Renda; onConcluir: () => void }) {
  const { addRenda, updateRenda } = usePessoal();
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [dia, setDia] = useState(editando?.diaRecebimento ? String(editando.diaRecebimento) : "");
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    const d = dia ? Number(dia) : 0;
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!Number.isFinite(v) || v < 0) { toast.error("Valor inválido."); return; }
    if (dia && (!Number.isInteger(d) || d < 1 || d > 31)) { toast.error("O dia precisa ser de 1 a 31."); return; }
    setSalvando(true);
    const dados = { descricao: descricao.trim(), valor: v, diaRecebimento: d || undefined };
    const ok = editando
      ? await updateRenda(editando.id, { ...dados, diaRecebimento: d })
      : !!(await addRenda({ ...dados, ativa: true }));
    setSalvando(false);
    if (ok) { toast.success("Renda salva."); onConcluir(); }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar renda" : "Nova renda"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="r-desc">Descrição</Label>
          <Input id="r-desc" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Salário, Pró-labore" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-valor">Valor por mês (R$)</Label>
            <Input id="r-valor" type="number" inputMode="decimal" min="0" step="0.01" required
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-dia">Dia que recebe</Label>
            <Input id="r-dia" type="number" min="1" max="31" value={dia}
              onChange={(e) => setDia(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ============ CONTAS FIXAS ============
function ContasFixasCard() {
  const { contasFixas, categorias, updateContaFixa, removeContaFixa } = usePessoal();
  const [form, setForm] = useState<{ aberto: boolean; editando?: ContaFixa }>({ aberto: false });

  const excluir = async (c: ContaFixa) => {
    if (!confirm(`Excluir a conta fixa "${c.descricao}"? Os meses já pagos continuam nos lançamentos.`)) return;
    await removeContaFixa(c.id);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Contas fixas</CardTitle>
          <CardDescription>Contas que se repetem todo mês com o mesmo valor. Aparecem nas Movimentações.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setForm({ aberto: true })}>
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </CardHeader>
      <CardContent>
        {contasFixas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma conta fixa cadastrada.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {contasFixas.map((c) => (
              <div key={c.id} className={`flex items-center justify-between gap-3 py-3 ${c.ativa ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{c.descricao}</span>
                    {!c.ativa && <Badge variant="outline">Pausada</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence todo dia {c.diaVencimento} · desde {formatarMesAno(c.inicio)}
                    {c.categoriaId && ` · ${categorias.find((x) => x.id === c.categoriaId)?.nome ?? ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-red-500">{brl(c.valor)}</span>
                  <Switch checked={c.ativa} onCheckedChange={(v) => updateContaFixa(c.id, { ativa: v })}
                    aria-label="Conta ativa" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                    onClick={() => setForm({ aberto: true, editando: c })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir"
                    onClick={() => excluir(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && <ContaFixaForm editando={form.editando} onConcluir={() => setForm({ aberto: false })} />}
      </Dialog>
    </Card>
  );
}

function ContaFixaForm({ editando, onConcluir }: { editando?: ContaFixa; onConcluir: () => void }) {
  const { categorias, addContaFixa, updateContaFixa } = usePessoal();
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [dia, setDia] = useState(editando ? String(editando.diaVencimento) : "");
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  // <input type="month"> usa AAAA-MM; no banco fica o 1º dia do mês.
  const [inicio, setInicio] = useState((editando?.inicio ?? hojeISO()).slice(0, 7));
  const [salvando, setSalvando] = useState(false);

  const cats = categorias.filter((c) => c.tipo === "Despesa");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    const d = Number(dia);
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe um valor maior que zero."); return; }
    if (!Number.isInteger(d) || d < 1 || d > 31) { toast.error("O dia de vencimento precisa ser de 1 a 31."); return; }
    if (!inicio) { toast.error("Informe a partir de qual mês a conta vale."); return; }
    setSalvando(true);
    const dados = {
      descricao: descricao.trim(), valor: v, diaVencimento: d, categoriaId, inicio: `${inicio}-01`,
    };
    const ok = editando
      ? await updateContaFixa(editando.id, dados)
      : !!(await addContaFixa({ ...dados, ativa: true }));
    setSalvando(false);
    if (ok) { toast.success("Conta fixa salva."); onConcluir(); }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar conta fixa" : "Nova conta fixa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cf-desc">Descrição</Label>
          <Input id="cf-desc" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Aluguel, Internet, Academia" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cf-valor">Valor (R$)</Label>
            <Input id="cf-valor" type="number" inputMode="decimal" min="0.01" step="0.01" required
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-dia">Dia de vencimento</Label>
            <Input id="cf-dia" type="number" min="1" max="31" required value={dia}
              onChange={(e) => setDia(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cf-inicio">Começa em</Label>
            <Input id="cf-inicio" type="month" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoriaId || SEM_CATEGORIA} onValueChange={(v) => setCategoriaId(v === SEM_CATEGORIA ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
