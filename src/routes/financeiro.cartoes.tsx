import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronLeft, ChevronRight, CreditCard, Pencil } from "lucide-react";
import { useData, Lancamento } from "@/lib/data-store";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro/cartoes")({
  component: Cartoes,
});

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function brl(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string) {
  const d = parseISO(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

/**
 * Janela de fatura cujo vencimento cai em (vencMonth, vencYear).
 * Janela = (fechamento mês anterior, fechamento do mês de venc].
 * Retorna { fechamento, vencimento, ini, fim } — strings ISO.
 */
function janelaFatura(fechamentoDia: number, vencimentoDia: number, vencMonth: number, vencYear: number) {
  // fechamento da fatura: dia `fechamentoDia` do mês de vencimento (ou mês anterior, se fechamento>venc)
  // Para simplificar: fechamento ocorre no mês imediatamente anterior ao vencimento se vencimentoDia < fechamentoDia,
  // caso contrário, no mesmo mês de vencimento.
  let fechMonth = vencMonth;
  let fechYear = vencYear;
  if (vencimentoDia < fechamentoDia) {
    fechMonth -= 1;
    if (fechMonth < 0) { fechMonth = 11; fechYear -= 1; }
  }
  const fechamento = new Date(fechYear, fechMonth, fechamentoDia);
  const vencimento = new Date(vencYear, vencMonth, vencimentoDia);
  // ini = dia seguinte ao fechamento anterior
  const fechAnt = new Date(fechamento);
  fechAnt.setMonth(fechAnt.getMonth() - 1);
  const ini = new Date(fechAnt);
  ini.setDate(ini.getDate() + 1);
  return {
    fechamento: toISO(fechamento),
    vencimento: toISO(vencimento),
    ini: toISO(ini),
    fim: toISO(fechamento), // inclusivo
  };
}

function Cartoes() {
  const {
    bancos, lancamentos, categorias, pagamentosFatura, transferencias,
    addPagamentoFatura, removePagamentoFatura,
    updateLancamento, removeLancamento,
  } = useData();

  const cartoes = useMemo(() => bancos.filter((b) => b.tipo === "Cartao"), [bancos]);
  const contas = useMemo(() => bancos.filter((b) => b.tipo === "Conta"), [bancos]);

  const [cartaoId, setCartaoId] = useState<string>(cartoes[0]?.id ?? "");
  // selecionar primeiro automaticamente
  if (cartaoId === "" && cartoes[0]) {
    setCartaoId(cartoes[0].id);
  }
  const cartao = cartoes.find((c) => c.id === cartaoId);

  const hoje = new Date();
  const [refMes, setRefMes] = useState<number>(hoje.getMonth());
  const [refAno, setRefAno] = useState<number>(hoje.getFullYear());

  function navMes(delta: number) {
    let m = refMes + delta;
    let y = refAno;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setRefMes(m); setRefAno(y);
  }

  const fech = cartao?.fechamentoDia ?? 1;
  const venc = cartao?.vencimentoDia ?? fech;

  const janela = useMemo(() => janelaFatura(fech, venc, refMes, refAno), [fech, venc, refMes, refAno]);

  // Lançamentos do cartão no ciclo
  const lancsCiclo = useMemo(() => {
    if (!cartao) return [];
    return lancamentos
      .filter((l) => l.bancoId === cartao.id && l.data >= janela.ini && l.data <= janela.fim)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [lancamentos, cartao, janela.ini, janela.fim]);

  // Saldo anterior (= soma dos lançamentos do cartão antes do início do ciclo + pagamentos antes)
  const saldoAnterior = useMemo(() => {
    if (!cartao) return 0;
    const sL = lancamentos
      .filter((l) => l.bancoId === cartao.id && l.data < janela.ini)
      .reduce((s, l) => s + (l.tipo === "Receita" ? -l.valor : l.valor), 0); // perspectiva da fatura (despesa aumenta)
    const sP = pagamentosFatura
      .filter((p) => p.cartaoId === cartao.id && p.data < janela.ini)
      .reduce((s, p) => s - p.valor, 0);
    const sT = transferencias
      .filter((t) => t.bancoDestinoId === cartao.id && t.afetaFatura && t.data < janela.ini)
      .reduce((s, t) => s - t.valor, 0);
    return sL + sP + sT;
  }, [cartao, lancamentos, pagamentosFatura, transferencias, janela.ini]);

  // Total da fatura do ciclo (apenas lançamentos do ciclo)
  const totalCiclo = useMemo(() =>
    lancsCiclo.reduce((s, l) => s + (l.tipo === "Receita" ? -l.valor : l.valor), 0),
    [lancsCiclo]);

  // Pagamentos desta competência (competenciaRef === janela.ini)
  const pagamentosDesta = useMemo(() => {
    if (!cartao) return [];
    return pagamentosFatura
      .filter((p) => p.cartaoId === cartao.id && p.competenciaRef === janela.ini)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [pagamentosFatura, cartao, janela.ini]);

  const totalPago = pagamentosDesta.reduce((s, p) => s + p.valor, 0);
  const valorFatura = saldoAnterior + totalCiclo - totalPago;
  const faturaQuitada = valorFatura <= 0.005;

  // Transferências cujo destino é este cartão dentro do ciclo (histórico/informativo)
  const transfersDoCiclo = useMemo(() => {
    if (!cartao) return [];
    return transferencias
      .filter((t) => t.bancoDestinoId === cartao.id && t.data >= janela.ini && t.data <= janela.vencimento)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [transferencias, cartao, janela.ini, janela.vencimento]);

  // Agrupar lançamentos por dia para tabela com "Saldo final do dia"
  const grupos = useMemo(() => {
    const map = new Map<string, typeof lancsCiclo>();
    for (const l of lancsCiclo) {
      const arr = map.get(l.data) ?? [];
      arr.push(l);
      map.set(l.data, arr);
    }
    let acc = saldoAnterior;
    return Array.from(map.entries()).map(([data, itens]) => {
      const delta = itens.reduce((s, l) => s + (l.tipo === "Receita" ? -l.valor : l.valor), 0);
      acc += delta;
      return { data, itens, saldoFinalDia: acc };
    });
  }, [lancsCiclo, saldoAnterior]);

  // -------- Dialog Informar pagamento --------
  const [payOpen, setPayOpen] = useState(false);
  const [payContaId, setPayContaId] = useState<string>("");
  const [payValor, setPayValor] = useState<string>("");
  const [payData, setPayData] = useState<string>(toISO(new Date()));
  const [payDesc, setPayDesc] = useState<string>("");
  const [paySaving, setPaySaving] = useState(false);

  function abrirPagamento() {
    if (!cartao) return;
    setPayContaId(contas[0]?.id ?? "");
    setPayValor(Math.max(valorFatura, 0).toFixed(2));
    setPayData(toISO(new Date()));
    setPayDesc(`Pagamento fatura ${cartao.nome} – ${MESES[refMes]}/${refAno}`);
    setPayOpen(true);
  }

  async function confirmarPagamento() {
    if (!cartao) return;
    const valor = Number(payValor.replace(",", "."));
    if (!payContaId) { toast.error("Selecione a conta de origem"); return; }
    if (!valor || valor <= 0) { toast.error("Informe um valor válido"); return; }
    setPaySaving(true);
    try {
      await addPagamentoFatura({
        cartaoId: cartao.id,
        contaOrigemId: payContaId,
        data: payData,
        valor,
        descricao: payDesc,
        competenciaRef: janela.ini,
      });
      toast.success("Pagamento de fatura registrado");
      setPayOpen(false);
    } finally {
      setPaySaving(false);
    }
  }

  // -------- Dialog Editar lançamento --------
  const [editOpen, setEditOpen] = useState(false);
  const [editLanc, setEditLanc] = useState<Lancamento | null>(null);
  const [editData, setEditData] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"Pago" | "Pendente">("Pendente");
  const [editSaving, setEditSaving] = useState(false);

  function abrirEdicao(l: Lancamento) {
    setEditLanc(l);
    setEditData(l.data);
    setEditDesc(l.desc);
    setEditValor(l.valor.toFixed(2));
    setEditCategoriaId(l.categoriaId);
    setEditStatus(l.status);
    setEditOpen(true);
  }

  async function confirmarEdicao() {
    if (!editLanc) return;
    const valor = Number(editValor.replace(",", "."));
    if (!editDesc.trim()) { toast.error("Informe a descrição"); return; }
    if (!valor || valor <= 0) { toast.error("Informe um valor válido"); return; }
    setEditSaving(true);
    try {
      await updateLancamento(editLanc.id, {
        data: editData,
        desc: editDesc,
        valor,
        categoriaId: editCategoriaId || editLanc.categoriaId,
        status: editStatus,
      });
      toast.success("Lançamento atualizado");
      setEditOpen(false);
      setEditLanc(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function excluirLanc(l: Lancamento) {
    if (!confirm(`Excluir o lançamento "${l.desc}"?`)) return;
    await removeLancamento(l.id);
    toast.success("Lançamento excluído");
  }


  if (cartoes.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">Cartões</h1>
        <p className="text-sm text-muted-foreground">
          Nenhum cartão cadastrado. Crie um banco do tipo "Cartão" em{" "}
          <Link to="/financeiro/cadastros" className="text-primary underline">Cadastros</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[260px]">
          <Select value={cartaoId} onValueChange={setCartaoId}>
            <SelectTrigger className="h-10">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-600" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {cartoes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild variant="outline">
          <Link to="/financeiro/cadastros">Editar conta</Link>
        </Button>
      </div>

      {/* Ações + navegação mês */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button onClick={abrirPagamento} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Informar pagamento
          </Button>
          <Button asChild variant="outline">
            <Link to="/financeiro/lancamentos">Adicionar lançamento</Link>
          </Button>
        </div>
        <div className="flex items-center border rounded-md">
          <Button variant="ghost" size="icon" onClick={() => navMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-4 text-sm font-medium min-w-[160px] text-center">
            {MESES[refMes]} de {refAno}
          </div>
          <Button variant="ghost" size="icon" onClick={() => navMes(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Saldo anterior:</span>
              <span className={saldoAnterior > 0 ? "text-red-600" : "text-emerald-700"}>
                R$ {brl(-saldoAnterior)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Fechamento:</span>
              <span>{fmtDate(janela.fim)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium">Vencimento</div>
            <div className="text-2xl font-bold">{fmtDate(janela.vencimento)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium">Valor da fatura</div>
            <div className={`text-2xl font-bold ${faturaQuitada ? "text-emerald-700" : "text-red-600"}`}>
              R$ {brl(-valorFatura)}
            </div>
            {faturaQuitada && totalPago > 0.005 && (
              <Badge variant="outline" className="mt-1 border-emerald-600 text-emerald-700">Quitada</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de lançamentos por dia */}
      <Card>
        <CardContent className="p-0">
          {grupos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum lançamento neste ciclo.
            </div>
          ) : (
            grupos.map(({ data, itens, saldoFinalDia }) => (
              <div key={data} className="border-b last:border-b-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[140px]">{fmtDate(data)}</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="w-[100px]">Parcela</TableHead>
                      <TableHead className="text-right w-[140px]">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((l) => {
                      const cat = categorias.find((c) => c.id === l.categoriaId);
                      const sinal = l.tipo === "Receita" ? l.valor : -l.valor;
                      return (
                        <TableRow key={l.id}>
                          <TableCell></TableCell>
                          <TableCell className="font-medium">{l.desc}</TableCell>
                          <TableCell>{cat?.nome ?? "—"}</TableCell>
                          <TableCell>
                            {l.parcelaNumero && l.parcelaTotal
                              ? `${l.parcelaNumero}/${l.parcelaTotal}` : "—"}
                          </TableCell>
                          <TableCell className={`text-right ${sinal < 0 ? "text-red-600" : "text-emerald-700"}`}>
                            {sinal < 0 ? "−" : ""}{brl(Math.abs(sinal))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="font-medium">Saldo final do dia</TableCell>
                      <TableCell className={`text-right font-bold ${saldoFinalDia > 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {saldoFinalDia > 0 ? "−" : ""}{brl(Math.abs(saldoFinalDia))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pagamentos desta fatura */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">Pagamentos desta fatura</h3>
          {pagamentosDesta.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum pagamento registrado para esta fatura.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Conta origem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentosDesta.map((p) => {
                  const conta = bancos.find((b) => b.id === p.contaOrigemId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{fmtDate(p.data)}</TableCell>
                      <TableCell>{conta?.nome ?? "—"}</TableCell>
                      <TableCell>{p.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right text-emerald-700 font-medium">
                        R$ {brl(p.valor)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Excluir este pagamento?")) removePagamentoFatura(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transferências (informativo) */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">Transferências para este cartão no período</h3>
          {transfersDoCiclo.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma transferência no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Afeta fatura?</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfersDoCiclo.map((t) => {
                  const orig = bancos.find((b) => b.id === t.bancoOrigemId);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{fmtDate(t.data)}</TableCell>
                      <TableCell>{orig?.nome ?? "—"}</TableCell>
                      <TableCell>{t.descricao ?? "—"}</TableCell>
                      <TableCell>
                        {t.afetaFatura
                          ? <Badge variant="outline" className="border-amber-500 text-amber-700">Sim (histórico)</Badge>
                          : <Badge variant="outline">Não</Badge>}
                      </TableCell>
                      <TableCell className="text-right">R$ {brl(t.valor)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Informar pagamento */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar pagamento · {cartao?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Conta de origem</Label>
              <Select value={payContaId} onValueChange={setPayContaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input value={payValor} onChange={(e) => setPayValor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={payData} onChange={(e) => setPayData(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarPagamento} disabled={paySaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {paySaving ? "Salvando…" : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
