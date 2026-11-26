import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ListChecks, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  usePessoal, brl, daquiAMeses, formatarData, hojeISO, mesesAte, patrimonio, rendaDoMes,
  MetaPessoal, TipoMeta,
} from "@/lib/pessoal-store";

// Parte 3 do caminho (Para onde vou): sonhos com valor e prazo, metas de renda e de patrimônio,
// e o plano de ação de cada um.
export const Route = createFileRoute("/pessoal/metas")({
  component: Metas,
});

const TIPOS: Record<TipoMeta, { nome: string; alvo: string; exemplo: string }> = {
  sonho: { nome: "Sonho", alvo: "Quanto custa (R$)", exemplo: "Ex.: Viagem para a praia, trocar de carro" },
  renda: { nome: "Meta de renda", alvo: "Renda por mês que quero ter (R$)", exemplo: "Ex.: Ganhar R$ 10 mil por mês" },
  patrimonio: { nome: "Meta de patrimônio", alvo: "Patrimônio que quero ter (R$)", exemplo: "Ex.: Chegar a R$ 200 mil" },
};

const PRAZOS = [
  { meses: 3, rotulo: "3 meses" }, { meses: 6, rotulo: "6 meses" }, { meses: 12, rotulo: "1 ano" },
  { meses: 24, rotulo: "2 anos" }, { meses: 36, rotulo: "3 anos" }, { meses: 48, rotulo: "4 anos" },
  { meses: 60, rotulo: "5 anos" },
];

const tempo = (meses: number) => {
  if (meses < 12) return meses === 1 ? "1 mês" : `${meses} meses`;
  const anos = Math.floor(meses / 12), resto = meses % 12;
  const a = anos === 1 ? "1 ano" : `${anos} anos`;
  return resto ? `${a} e ${resto === 1 ? "1 mês" : `${resto} meses`}` : a;
};

function Metas() {
  const { metas, rendas, bens, dividas, lancamentos, carregando } = usePessoal();
  const [form, setForm] = useState<{ aberto: boolean; editando?: MetaPessoal; tipo?: TipoMeta }>({ aberto: false });
  const [guardando, setGuardando] = useState<MetaPessoal | null>(null);

  const hoje = new Date();
  const atual = {
    renda: rendaDoMes(rendas, hoje.getFullYear(), hoje.getMonth() + 1),
    patrimonio: patrimonio({ bens, dividas, lancamentos }).liquido,
  };

  if (carregando) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  const sonhos = metas.filter((m) => m.tipo === "sonho");
  const outras = metas.filter((m) => m.tipo !== "sonho");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setForm({ aberto: true, tipo: "renda" })}>
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
        <Button onClick={() => setForm({ aberto: true, tipo: "sonho" })}>
          <Plus className="h-4 w-4" /> Novo sonho
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Sonhos</h2>
          <p className="text-sm text-muted-foreground">O que você quer conquistar, quanto custa e até quando.</p>
        </div>
        {sonhos.length === 0 ? (
          <Vazio texto="Nenhum sonho ainda. Uma viagem, um carro, uma reforma? Dê nome, valor e prazo, e o sistema mostra quanto guardar por mês." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sonhos.map((m) => (
              <CartaoMeta key={m.id} meta={m} atual={m.guardado}
                onEditar={() => setForm({ aberto: true, editando: m })} onGuardar={() => setGuardando(m)} />
            ))}
          </div>
        )}
        {sonhos.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Dica: ao guardar dinheiro para um sonho, lance a saída no Dia a dia com a categoria "Guardado para sonhos",
            para ela contar na divisão da renda.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Metas de renda e de patrimônio</h2>
          <p className="text-sm text-muted-foreground">
            Aonde você quer chegar. O sistema compara com a sua renda de hoje ({brl(atual.renda)} por mês)
            e com o seu patrimônio ({brl(atual.patrimonio)}).
          </p>
        </div>
        {outras.length === 0 ? (
          <Vazio texto="Nenhuma meta ainda. Quanto você quer ganhar por mês daqui a 1 ano? E daqui a 5? Comece com prazos curtos e vá aumentando." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outras.map((m) => (
              <CartaoMeta key={m.id} meta={m} atual={m.tipo === "renda" ? atual.renda : atual.patrimonio}
                onEditar={() => setForm({ aberto: true, editando: m })} />
            ))}
          </div>
        )}
      </section>

      <ProximoPasso para="/pessoal" rotulo="Voltar ao caminho" titulo="Meu caminho"
        texto="Veja o resumo das três partes e o que fazer agora." />

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && <MetaForm editando={form.editando} tipoInicial={form.tipo} onConcluir={() => setForm({ aberto: false })} />}
      </Dialog>
      <Dialog open={!!guardando} onOpenChange={(v) => { if (!v) setGuardando(null); }}>
        {guardando && <GuardarForm meta={guardando} onConcluir={() => setGuardando(null)} />}
      </Dialog>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <Card className="border-dashed border-border">
      <CardContent className="py-6 pt-(--card-pad) text-center text-sm text-muted-foreground">{texto}</CardContent>
    </Card>
  );
}

function CartaoMeta({ meta, atual, onEditar, onGuardar }: {
  meta: MetaPessoal; atual: number; onEditar: () => void; onGuardar?: () => void;
}) {
  const { passos, updateMeta, removeMeta } = usePessoal();
  const [planoAberto, setPlanoAberto] = useState(false);
  const meusPassos = passos.filter((p) => p.metaId === meta.id);
  const feitos = meusPassos.filter((p) => p.feito).length;
  const pct = Math.max(0, Math.min(100, (atual / meta.valorAlvo) * 100));
  const falta = Math.max(0, meta.valorAlvo - atual);
  const chegou = meta.concluida || falta === 0;
  const meses = mesesAte(meta.prazo);

  const excluir = async () => {
    if (!confirm(`Excluir "${meta.titulo}" e o plano de ação dela?`)) return;
    await removeMeta(meta.id);
  };

  let ritmo: string;
  if (chegou) ritmo = meta.tipo === "sonho" ? "Conquistado!" : "Meta alcançada!";
  else if (meses < 0) ritmo = `O prazo passou em ${formatarData(meta.prazo)}. Que tal definir um novo?`;
  else if (meta.tipo === "sonho") ritmo = `Guarde ${brl(falta / Math.max(1, meses))} por mês para chegar lá.`;
  else ritmo = `Faltam ${brl(falta)} para a meta.`;

  return (
    <Card className={`min-w-0 border-border/60 ${chegou ? "border-emerald-300 dark:border-emerald-900" : ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base leading-snug">{meta.titulo}</CardTitle>
          <CardDescription>
            {meta.tipo !== "sonho" && `${TIPOS[meta.tipo].nome} · `}
            até {formatarData(meta.prazo)}{meses >= 0 && !chegou ? ` (${meses === 0 ? "este mês" : `em ${tempo(meses)}`})` : ""}
          </CardDescription>
        </div>
        {chegou && <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600">✓</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums"><strong>{brl(atual)}</strong> <span className="text-muted-foreground">de {brl(meta.valorAlvo)}</span></span>
            <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${chegou ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className={`text-sm ${meses < 0 && !chegou ? "text-amber-700 dark:text-amber-400" : chegou ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{ritmo}</p>

        <div className="flex flex-wrap gap-1.5">
          {onGuardar && !chegou && (
            <Button size="sm" onClick={onGuardar}><PiggyBank className="h-4 w-4" /> Guardei</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setPlanoAberto((v) => !v)}>
            <ListChecks className="h-4 w-4" /> Plano{meusPassos.length ? ` (${feitos}/${meusPassos.length})` : ""}
          </Button>
          {!meta.concluida && falta === 0 && (
            <Button size="sm" variant="outline" onClick={() => updateMeta(meta.id, { concluida: true })}>
              <Check className="h-4 w-4" /> Concluir
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" aria-label="Editar" onClick={onEditar}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir" aria-label="Excluir" onClick={excluir}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {planoAberto && <PlanoDeAcao metaId={meta.id} />}
      </CardContent>
    </Card>
  );
}

/** Passos para chegar à meta: o que fazer e até quando. */
function PlanoDeAcao({ metaId }: { metaId: string }) {
  const { passos, addPasso, updatePasso, removePasso } = usePessoal();
  const lista = passos.filter((p) => p.metaId === metaId);
  const [descricao, setDescricao] = useState("");
  const [quando, setQuando] = useState("");
  const hoje = hojeISO();

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    const ok = await addPasso({ metaId, descricao, quando: quando || undefined, feito: false, ordem: lista.length + 1 });
    if (ok) { setDescricao(""); setQuando(""); }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano de ação</p>
      {lista.length === 0 && (
        <p className="text-xs text-muted-foreground">O que você vai fazer para chegar lá? Ex.: "Abrir uma conta só para isso", "Vender o que não uso".</p>
      )}
      {lista.map((p) => (
        <div key={p.id} className="flex items-start gap-2">
          <Checkbox checked={p.feito} onCheckedChange={(v) => updatePasso(p.id, { feito: v === true })}
            className="mt-0.5" aria-label={`Feito: ${p.descricao}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-snug ${p.feito ? "text-muted-foreground line-through" : ""}`}>{p.descricao}</p>
            {p.quando && (
              <p className={`text-xs ${!p.feito && p.quando < hoje ? "text-red-500" : "text-muted-foreground"}`}>
                até {formatarData(p.quando)}
              </p>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground" title="Remover passo"
            aria-label="Remover passo" onClick={() => removePasso(p.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <form onSubmit={adicionar} className="flex flex-wrap gap-2 pt-1">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200}
          placeholder="Novo passo" className="h-8 min-w-0 flex-1 basis-40 text-sm" aria-label="Novo passo" />
        <Input type="date" value={quando} onChange={(e) => setQuando(e.target.value)}
          className="h-8 w-36 text-sm" aria-label="Até quando" />
        <Button type="submit" size="sm" variant="secondary" className="h-8" disabled={!descricao.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>
    </div>
  );
}

function MetaForm({ editando, tipoInicial, onConcluir }: { editando?: MetaPessoal; tipoInicial?: TipoMeta; onConcluir: () => void }) {
  const { addMeta, updateMeta } = usePessoal();
  const [tipo, setTipo] = useState<TipoMeta>(editando?.tipo ?? tipoInicial ?? "sonho");
  const [titulo, setTitulo] = useState(editando?.titulo ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valorAlvo) : "");
  const [prazo, setPrazo] = useState(editando?.prazo ?? daquiAMeses(12));
  const [guardado, setGuardado] = useState(editando ? String(editando.guardado) : "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    const g = guardado.trim() === "" ? 0 : Number(guardado);
    if (!titulo.trim()) { toast.error("Dê um nome."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe um valor maior que zero."); return; }
    if (!Number.isFinite(g) || g < 0) { toast.error("Valor guardado inválido."); return; }
    if (!prazo) { toast.error("Informe o prazo."); return; }
    setSalvando(true);
    const dados = {
      tipo, titulo, valorAlvo: v, prazo, guardado: tipo === "sonho" ? g : 0, obs,
      // Ao mudar o valor, a meta volta a ficar em aberto se ainda não chegou lá.
      ...(editando && v > editando.valorAlvo ? { concluida: false } : {}),
    };
    const ok = editando ? await updateMeta(editando.id, dados) : !!(await addMeta({ ...dados, concluida: false }));
    setSalvando(false);
    if (ok) { toast.success("Salvo."); onConcluir(); }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <form onSubmit={salvar} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar" : tipo === "sonho" ? "Novo sonho" : "Nova meta"}</DialogTitle>
          <DialogDescription>{TIPOS[tipo].exemplo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMeta)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TIPOS) as TipoMeta[]).map((t) => <SelectItem key={t} value={t}>{TIPOS[t].nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-titulo">Nome</Label>
          <Input id="meta-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
        </div>
        <div className={tipo === "sonho" ? "grid grid-cols-2 gap-3" : ""}>
          <div className="space-y-1.5">
            <Label htmlFor="meta-valor">{TIPOS[tipo].alvo}</Label>
            <Input id="meta-valor" type="number" inputMode="decimal" min="0.01" step="0.01"
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          {tipo === "sonho" && (
            <div className="space-y-1.5">
              <Label htmlFor="meta-guardado">Já guardei (R$)</Label>
              <Input id="meta-guardado" type="number" inputMode="decimal" min="0" step="0.01"
                value={guardado} onChange={(e) => setGuardado(e.target.value)} placeholder="0,00" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-prazo">Até quando</Label>
          <Input id="meta-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRAZOS.map((p) => {
              const data = daquiAMeses(p.meses);
              return (
                <Button key={p.meses} type="button" size="sm" variant={prazo === data ? "default" : "outline"}
                  className="h-7 px-2 text-xs" onClick={() => setPrazo(data)}>
                  {p.rotulo}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-obs">Por que isso é importante para você?</Label>
          <Textarea id="meta-obs" rows={2} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Opcional" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function GuardarForm({ meta, onConcluir }: { meta: MetaPessoal; onConcluir: () => void }) {
  const { updateMeta } = usePessoal();
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe um valor maior que zero."); return; }
    setSalvando(true);
    const total = meta.guardado + v;
    const ok = await updateMeta(meta.id, { guardado: total, ...(total >= meta.valorAlvo ? { concluida: true } : {}) });
    setSalvando(false);
    if (ok) {
      toast.success(total >= meta.valorAlvo ? `Parabéns! "${meta.titulo}" conquistado.` : `Agora são ${brl(total)} guardados.`);
      onConcluir();
    }
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <form onSubmit={salvar} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Guardei para "{meta.titulo}"</DialogTitle>
          <DialogDescription>Já guardado: {brl(meta.guardado)} de {brl(meta.valorAlvo)}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="guardar-valor">Quanto guardou agora (R$)</Label>
          <Input id="guardar-valor" type="number" inputMode="decimal" min="0.01" step="0.01" autoFocus
            value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Guardar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
