import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MesNavegador } from "@/components/pessoal/mes-navegador";
import { LancamentoForm } from "@/components/pessoal/lancamento-form";
import {
  usePessoal, brl, chaveMes, formatarData, hojeISO, LancamentoPessoal,
} from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/lancamentos")({
  component: LancamentosPessoais,
});

function LancamentosPessoais() {
  const { lancamentos, categorias, dividas, carregando, updateLancamento, removeLancamento } = usePessoal();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<{ aberto: boolean; editando?: LancamentoPessoal }>({ aberto: false });

  const chave = chaveMes(ano, mes);
  const hojeStr = hojeISO();

  const doMes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lancamentos
      .filter((l) => l.data.startsWith(chave))
      .filter((l) => !termo || l.descricao.toLowerCase().includes(termo))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [lancamentos, chave, busca]);

  const totais = useMemo(() => ({
    entradas: doMes.filter((l) => l.tipo === "Receita").reduce((s, l) => s + l.valor, 0),
    saidas: doMes.filter((l) => l.tipo === "Despesa").reduce((s, l) => s + l.valor, 0),
  }), [doMes]);

  const nomeCategoria = (id?: string) => categorias.find((c) => c.id === id)?.nome;
  const detalhe = (l: LancamentoPessoal) => {
    if (l.dividaId) {
      const d = dividas.find((x) => x.id === l.dividaId);
      return `Parcela ${l.parcelaNumero}/${d?.totalParcelas ?? "?"}`;
    }
    return l.contaFixaId ? "Conta fixa" : undefined;
  };

  const alternarStatus = (l: LancamentoPessoal) =>
    updateLancamento(l.id, { status: l.status === "Pago" ? "Pendente" : "Pago" });

  const excluir = async (l: LancamentoPessoal) => {
    if (l.dividaId) {
      toast.error("Parcelas de dívida são apagadas junto com a dívida, na aba Dívidas.");
      return;
    }
    if (!confirm(`Excluir o lançamento "${l.descricao}"?`)) return;
    await removeLancamento(l.id);
  };

  const dataPadrao = chave === hojeStr.slice(0, 7) ? hojeStr : `${chave}-01`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavegador ano={ano} mes={mes} onChange={(y, m) => { setAno(y); setMes(m); }} />
        <Button onClick={() => setForm({ aberto: true })}>
          <Plus className="h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Lançamentos</CardTitle>
            <CardDescription>
              Entradas {brl(totais.entradas)} · Saídas {brl(totais.saidas)}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar descrição..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : doMes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum lançamento neste mês. Clique em "Novo lançamento" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-28">Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {doMes.map((l) => {
                  const d = detalhe(l);
                  const pago = l.status === "Pago";
                  const rotulo = l.tipo === "Receita"
                    ? (pago ? "Recebido" : "A receber")
                    : (pago ? "Pago" : "A pagar");
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="tabular-nums">{formatarData(l.data)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.descricao}</div>
                        {d && <div className="text-xs text-muted-foreground">{d}</div>}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {nomeCategoria(l.categoriaId) ?? "—"}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${l.tipo === "Receita" ? "text-emerald-600" : ""}`}>
                        {l.tipo === "Receita" ? "+ " : ""}{brl(l.valor)}
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => alternarStatus(l)} title="Clique para alterar">
                          <Badge
                            variant={pago ? "default" : "secondary"}
                            className={pago ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                          >
                            {rotulo}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => setForm({ aberto: true, editando: l })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" title="Excluir"
                            onClick={() => excluir(l)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && (
          <LancamentoForm
            editando={form.editando}
            dataPadrao={dataPadrao}
            onConcluir={() => setForm({ aberto: false })}
          />
        )}
      </Dialog>
    </div>
  );
}
