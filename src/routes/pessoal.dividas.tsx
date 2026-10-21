import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  usePessoal, brl, formatarData, formatarMesAno, hojeISO, resumirDivida, Divida, ResumoDivida,
} from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/dividas")({
  component: Dividas,
});

const SEM_CATEGORIA = "__none__";

function Dividas() {
  const { dividas, lancamentos, carregando } = usePessoal();
  const [form, setForm] = useState<{ aberto: boolean; editando?: Divida }>({ aberto: false });

  const lista = useMemo(() => {
    const comResumo = dividas.map((d) => ({ divida: d, resumo: resumirDivida(d, lancamentos) }));
    // Em andamento primeiro; quitadas no fim.
    return comResumo.sort((a, b) => Number(a.resumo.quitada) - Number(b.resumo.quitada));
  }, [dividas, lancamentos]);

  const totais = useMemo(() => {
    const mesAtual = hojeISO().slice(0, 7);
    let devendo = 0, doMes = 0, ativas = 0;
    for (const { resumo } of lista) {
      devendo += resumo.valorRestante;
      if (!resumo.quitada) ativas++;
      doMes += resumo.parcelas.filter((p) => p.data.startsWith(mesAtual)).reduce((s, p) => s + p.valor, 0);
    }
    return { devendo, doMes, ativas };
  }, [lista]);

  const cards = [
    { titulo: "Total que ainda devo", valor: brl(totais.devendo), cor: "text-red-500" },
    { titulo: "Parcelas deste mês", valor: brl(totais.doMes), cor: "text-amber-600" },
    { titulo: "Dívidas em andamento", valor: String(totais.ativas), cor: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ aberto: true })}>
          <Plus className="h-4 w-4" /> Nova dívida
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.titulo} className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription>{c.titulo}</CardDescription>
              <CardTitle className={`text-2xl tabular-nums ${c.cor}`}>{c.valor}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {carregando ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : lista.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma dívida cadastrada. Clique em "Nova dívida" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map(({ divida, resumo }) => (
            <DividaCard key={divida.id} divida={divida} resumo={resumo}
              onEditar={() => setForm({ aberto: true, editando: divida })} />
          ))}
        </div>
      )}

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && <DividaForm editando={form.editando} onConcluir={() => setForm({ aberto: false })} />}
      </Dialog>
    </div>
  );
}

function DividaCard({ divida, resumo, onEditar }: { divida: Divida; resumo: ResumoDivida; onEditar: () => void }) {
  const { updateLancamento, removeDivida } = usePessoal();

  const pagarProxima = async () => {
    if (!resumo.proxima) return;
    const ok = await updateLancamento(resumo.proxima.id, { status: "Pago" });
    if (ok) toast.success(`Parcela ${resumo.proxima.parcelaNumero}/${resumo.total} paga.`);
  };

  const excluir = async () => {
    if (!confirm(`Excluir a dívida "${divida.descricao}" e todas as ${resumo.total} parcelas dela, inclusive as já pagas?`)) return;
    await removeDivida(divida.id);
  };

  const status = resumo.quitada
    ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Quitada</Badge>
    : resumo.emAtraso
      ? <Badge variant="destructive">Em atraso</Badge>
      : <Badge variant="secondary">Em dia</Badge>;

  const numeros = [
    { rotulo: "Parcela", valor: brl(divida.valorParcela) },
    { rotulo: "Total da dívida", valor: brl(resumo.valorTotal) },
    { rotulo: "Já paguei", valor: brl(resumo.valorPago), cor: "text-emerald-600" },
    { rotulo: "Falta pagar", valor: brl(resumo.valorRestante), cor: "text-red-500" },
  ];

  return (
    <Card className="flex flex-col border-border/60">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{divida.descricao}</CardTitle>
          {status}
        </div>
        <CardDescription>
          {divida.credor ? `${divida.credor} · ` : ""}
          {formatarMesAno(divida.primeiraParcela)}
          {resumo.ultimaData ? ` a ${formatarMesAno(resumo.ultimaData)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{resumo.pagas} de {resumo.total} parcelas pagas</span>
            <span className="font-semibold tabular-nums">{resumo.percentual}%</span>
          </div>
          <Progress value={resumo.percentual} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {numeros.map((n) => (
            <div key={n.rotulo}>
              <p className="text-xs text-muted-foreground">{n.rotulo}</p>
              <p className={`text-sm font-semibold tabular-nums ${n.cor ?? ""}`}>{n.valor}</p>
            </div>
          ))}
        </div>

        {resumo.proxima && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Próxima: </span>
            parcela {resumo.proxima.parcelaNumero} · {formatarData(resumo.proxima.data)} · {brl(resumo.proxima.valor)}
          </div>
        )}

        {divida.obs && <p className="text-xs text-muted-foreground">{divida.obs}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {resumo.proxima ? (
            <Button size="sm" variant="outline" onClick={pagarProxima}>
              <Check className="h-4 w-4" /> Paguei a parcela {resumo.proxima.parcelaNumero}
            </Button>
          ) : <span />}
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={onEditar}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir" onClick={excluir}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DividaForm({ editando, onConcluir }: { editando?: Divida; onConcluir: () => void }) {
  const { categorias, salvarDivida } = usePessoal();
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [credor, setCredor] = useState(editando?.credor ?? "");
  const [valorParcela, setValorParcela] = useState(editando ? String(editando.valorParcela) : "");
  const [totalParcelas, setTotalParcelas] = useState(editando ? String(editando.totalParcelas) : "");
  const [primeira, setPrimeira] = useState(editando?.primeiraParcela ?? hojeISO());
  const [pagas, setPagas] = useState("0");
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [salvando, setSalvando] = useState(false);

  const cats = categorias.filter((c) => c.tipo === "Despesa");
  const v = Number(valorParcela);
  const n = Number(totalParcelas);
  const previa = Number.isFinite(v) && v > 0 && Number.isInteger(n) && n > 0 && primeira
    ? (() => {
        const [y, m] = primeira.split("-").map(Number);
        const fim = new Date(y, m - 1 + n - 1, 1);
        return `Total de ${brl(v * n)} · última parcela em ${formatarMesAno(`${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-01`)}`;
      })()
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(pagas);
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe o valor da parcela."); return; }
    if (!Number.isInteger(n) || n < 1 || n > 600) { toast.error("A quantidade de parcelas precisa ser de 1 a 600."); return; }
    if (!primeira) { toast.error("Informe a data da primeira parcela."); return; }
    if (!editando && (!Number.isInteger(p) || p < 0 || p > n)) {
      toast.error(`As parcelas já pagas precisam ser de 0 a ${n}.`);
      return;
    }
    setSalvando(true);
    const ok = await salvarDivida({
      descricao, credor, valorParcela: v, totalParcelas: n, primeiraParcela: primeira,
      categoriaId, obs, parcelasPagas: p,
    }, editando?.id);
    setSalvando(false);
    if (ok) { toast.success("Dívida salva."); onConcluir(); }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar dívida" : "Nova dívida"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "As parcelas já pagas continuam como estão; as que faltam pagar são refeitas com os novos dados."
              : "Cada parcela vira uma linha nas Movimentações do mês em que vence."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="d-desc">Descrição</Label>
            <Input id="d-desc" required value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Empréstimo, Carro" />
          </div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1">
            <Label htmlFor="d-credor">Com quem (credor)</Label>
            <Input id="d-credor" value={credor} onChange={(e) => setCredor(e.target.value)} placeholder="Ex.: Banco, Loja" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="d-valor">Valor da parcela (R$)</Label>
            <Input id="d-valor" type="number" inputMode="decimal" min="0.01" step="0.01" required
              value={valorParcela} onChange={(e) => setValorParcela(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-qtd">Quantidade de parcelas</Label>
            <Input id="d-qtd" type="number" min="1" max="600" required value={totalParcelas}
              onChange={(e) => setTotalParcelas(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="d-primeira">Vencimento da 1ª parcela</Label>
            <Input id="d-primeira" type="date" required value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
          </div>
          {!editando && (
            <div className="space-y-1.5">
              <Label htmlFor="d-pagas">Parcelas já pagas</Label>
              <Input id="d-pagas" type="number" min="0" value={pagas} onChange={(e) => setPagas(e.target.value)} />
            </div>
          )}
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
        <div className="space-y-1.5">
          <Label htmlFor="d-obs">Observação</Label>
          <Textarea id="d-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        {previa && <p className="text-sm text-muted-foreground">{previa}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
