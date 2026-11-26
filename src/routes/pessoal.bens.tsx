import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProximoPasso } from "@/components/proximo-passo";
import {
  usePessoal, brl, formatarData, patrimonio, rendimentoMensal, Bem, TipoBem,
} from "@/lib/pessoal-store";

// Parte 1 do caminho (Onde estou): o que a pessoa tem. Com as dívidas, dá o patrimônio.
export const Route = createFileRoute("/pessoal/bens")({
  component: Bens,
});

const TIPOS: { valor: TipoBem; nome: string; dica: string; exemplo: string }[] = [
  { valor: "investimento", nome: "Investimentos", dica: "Dinheiro aplicado, que rende todo mês",
    exemplo: "Poupança, CDB, Tesouro Direto, ações, previdência..." },
  { valor: "rende", nome: "Bens que trazem dinheiro", dica: "Coisas que geram renda para você",
    exemplo: "Imóvel alugado, equipamento alugado, sala comercial..." },
  { valor: "uso", nome: "Bens de uso", dica: "Coisas que você usa e que geram despesas",
    exemplo: "Casa onde mora, carro, moto..." },
];

function Bens() {
  const { bens, dividas, lancamentos, carregando } = usePessoal();
  const [form, setForm] = useState<{ aberto: boolean; editando?: Bem; tipo?: TipoBem }>({ aberto: false });
  const p = patrimonio({ bens, dividas, lancamentos });
  const rendeMes = bens.filter((b) => b.tipo === "investimento")
    .reduce((s, b) => s + rendimentoMensal(b.valor, b.rentabilidadeAnual), 0);

  const cards = [
    { titulo: "Tudo o que tenho", valor: p.tenho, cor: "text-emerald-600", dica: "Bens e investimentos" },
    { titulo: "O que ainda devo", valor: p.devo, cor: "text-red-500", dica: "O que falta pagar das dívidas" },
    { titulo: "Meu patrimônio", valor: p.liquido, cor: p.liquido >= 0 ? "text-primary" : "text-red-500",
      dica: "O que sobraria se vendesse tudo e pagasse todas as dívidas" },
  ];

  if (carregando) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ aberto: true })}><Plus className="h-4 w-4" /> Novo bem</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.titulo} className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription>{c.titulo}</CardDescription>
              <CardTitle className={`text-2xl tabular-nums ${c.cor}`}>{brl(c.valor)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{c.dica}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {TIPOS.map((t) => {
          const lista = bens.filter((b) => b.tipo === t.valor);
          const total = lista.reduce((s, b) => s + b.valor, 0);
          return (
            <Card key={t.valor} className="min-w-0 border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">{t.nome}</CardTitle>
                  <CardDescription>{t.dica}</CardDescription>
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" title={`Adicionar em ${t.nome}`}
                  aria-label={`Adicionar em ${t.nome}`} onClick={() => setForm({ aberto: true, tipo: t.valor })}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {lista.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nada cadastrado. Ex.: {t.exemplo}</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {lista.map((b) => <LinhaBem key={b.id} bem={b} onEditar={() => setForm({ aberto: true, editando: b })} />)}
                    <div className="flex justify-between pt-3 text-sm font-semibold">
                      <span>Total</span><span className="tabular-nums">{brl(total)}</span>
                    </div>
                  </div>
                )}
                {t.valor === "investimento" && rendeMes > 0 && (
                  <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Seus investimentos rendem cerca de <strong>{brl(rendeMes)}</strong> por mês.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ProximoPasso para="/pessoal/movimentacoes" rotulo="Próximo passo · Meu mês" titulo="Dia a dia"
        texto="Com o que entra, o que é fixo, o que deve e o que tem no lugar, acompanhe o mês: pague e lance os gastos." />

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && <BemForm editando={form.editando} tipoInicial={form.tipo} onConcluir={() => setForm({ aberto: false })} />}
      </Dialog>
    </div>
  );
}

function LinhaBem({ bem, onEditar }: { bem: Bem; onEditar: () => void }) {
  const { removeBem } = usePessoal();
  const rende = rendimentoMensal(bem.valor, bem.rentabilidadeAnual);
  const excluir = async () => {
    if (!confirm(`Excluir "${bem.nome}"?`)) return;
    await removeBem(bem.id);
  };
  return (
    <div className="flex items-start gap-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{bem.nome}</p>
        <p className="text-xs text-muted-foreground">
          {bem.rentabilidadeAnual ? `${bem.rentabilidadeAnual.toLocaleString("pt-BR")}% ao ano · ~${brl(rende)}/mês · ` : ""}
          valor de {formatarData(bem.atualizadoEm)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{brl(bem.valor)}</span>
      <div className="flex shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" aria-label="Editar" onClick={onEditar}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir" aria-label="Excluir" onClick={excluir}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function BemForm({ editando, tipoInicial, onConcluir }: { editando?: Bem; tipoInicial?: TipoBem; onConcluir: () => void }) {
  const { addBem, updateBem } = usePessoal();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [tipo, setTipo] = useState<TipoBem>(editando?.tipo ?? tipoInicial ?? "investimento");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [rentab, setRentab] = useState(editando?.rentabilidadeAnual !== undefined ? String(editando.rentabilidadeAnual) : "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    const r = rentab.trim() === "" ? undefined : Number(rentab.replace(",", "."));
    if (!nome.trim()) { toast.error("Informe o nome."); return; }
    if (!Number.isFinite(v) || v < 0) { toast.error("Informe o valor."); return; }
    if (r !== undefined && (!Number.isFinite(r) || r < -100 || r > 1000)) { toast.error("Rendimento inválido."); return; }
    setSalvando(true);
    const dados = { nome, tipo, valor: v, rentabilidadeAnual: tipo === "investimento" ? r : undefined, obs };
    const ok = editando ? await updateBem(editando.id, dados) : await addBem(dados);
    setSalvando(false);
    if (ok) { toast.success("Salvo."); onConcluir(); }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={salvar} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar bem" : "Novo bem"}</DialogTitle>
          <DialogDescription>Use o valor de hoje: quanto você conseguiria se vendesse ou resgatasse.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoBem)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Ex.: {TIPOS.find((t) => t.valor === tipo)!.exemplo}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bem-nome">Nome</Label>
          <Input id="bem-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120}
            placeholder={tipo === "investimento" ? "Ex.: CDB do banco" : tipo === "rende" ? "Ex.: Apartamento alugado" : "Ex.: Carro"} />
        </div>
        <div className={tipo === "investimento" ? "grid grid-cols-2 gap-3" : ""}>
          <div className="space-y-1.5">
            <Label htmlFor="bem-valor">Valor hoje (R$)</Label>
            <Input id="bem-valor" type="number" inputMode="decimal" min="0" step="0.01"
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          {tipo === "investimento" && (
            <div className="space-y-1.5">
              <Label htmlFor="bem-rentab">Rende ao ano (%)</Label>
              <Input id="bem-rentab" type="number" inputMode="decimal" step="0.01"
                value={rentab} onChange={(e) => setRentab(e.target.value)} placeholder="Opcional" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bem-obs">Observação</Label>
          <Textarea id="bem-obs" rows={2} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
