import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Pencil, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MesNavegador } from "@/components/pessoal/mes-navegador";
import { LancamentoForm } from "@/components/pessoal/lancamento-form";
import {
  usePessoal, brl, chaveMes, competenciaDe, dataNoMes, formatarData, hojeISO,
  ContaFixa, LancamentoPessoal, StatusPag, TipoMov,
} from "@/lib/pessoal-store";

export const Route = createFileRoute("/pessoal/")({
  component: Movimentacoes,
});

type Linha = {
  chave: string;
  data: string;
  descricao: string;
  detalhe?: string;
  categoriaId?: string;
  tipo: TipoMov;
  valor: number;
  status: StatusPag;
  lancamento?: LancamentoPessoal;
  /** Conta fixa que ainda não foi paga neste mês (não existe lançamento para ela). */
  contaFixa?: ContaFixa;
};

type Filtro = "todos" | "a-pagar" | "pagos" | "entradas";

function Movimentacoes() {
  const {
    lancamentos, contasFixas, rendas, dividas, categorias, carregando,
    updateLancamento, removeLancamento, pagarContaFixa,
  } = usePessoal();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [form, setForm] = useState<{ aberto: boolean; editando?: LancamentoPessoal }>({ aberto: false });

  const chave = chaveMes(ano, mes);
  const competencia = competenciaDe(ano, mes);
  const hojeStr = hojeISO();

  const linhas = useMemo<Linha[]>(() => {
    const doMes = lancamentos.filter((l) => l.data.startsWith(chave));
    const lista: Linha[] = doMes.map((l) => {
      const divida = l.dividaId ? dividas.find((d) => d.id === l.dividaId) : undefined;
      return {
        chave: l.id,
        data: l.data,
        descricao: l.descricao,
        detalhe: divida
          ? `Parcela ${l.parcelaNumero}/${divida.totalParcelas}`
          : l.contaFixaId ? "Conta fixa" : undefined,
        categoriaId: l.categoriaId,
        tipo: l.tipo,
        valor: l.valor,
        status: l.status,
        lancamento: l,
      };
    });
    // Contas fixas: aparecem todo mês a partir do início, até serem pagas.
    const pagas = new Set(
      lancamentos.filter((l) => l.contaFixaId && l.competencia === competencia).map((l) => l.contaFixaId),
    );
    for (const c of contasFixas) {
      if (!c.ativa || c.inicio > competencia || pagas.has(c.id)) continue;
      lista.push({
        chave: `cf-${c.id}`,
        data: dataNoMes(ano, mes, c.diaVencimento),
        descricao: c.descricao,
        detalhe: "Conta fixa",
        categoriaId: c.categoriaId,
        tipo: "Despesa",
        valor: c.valor,
        status: "Pendente",
        contaFixa: c,
      });
    }
    return lista.sort((a, b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao));
  }, [lancamentos, contasFixas, dividas, chave, competencia, ano, mes]);

  const resumo = useMemo(() => {
    const renda = rendas.filter((r) => r.ativa).reduce((s, r) => s + r.valor, 0);
    let entradas = 0, gasto = 0, aPagar = 0;
    for (const l of linhas) {
      if (l.tipo === "Receita") entradas += l.valor;
      else if (l.status === "Pago") gasto += l.valor;
      else aPagar += l.valor;
    }
    return { renda, entradas, gasto, aPagar, saldo: renda + entradas - gasto - aPagar };
  }, [rendas, linhas]);

  // Contas de meses anteriores que ficaram sem pagar.
  const atrasadas = useMemo(() => {
    const inicioMes = `${chave}-01`;
    const lista = lancamentos.filter(
      (l) => l.tipo === "Despesa" && l.status === "Pendente" && l.data < inicioMes && l.data < hojeStr,
    );
    return { qtd: lista.length, total: lista.reduce((s, l) => s + l.valor, 0) };
  }, [lancamentos, chave, hojeStr]);

  const visiveis = linhas.filter((l) => {
    if (filtro === "a-pagar") return l.tipo === "Despesa" && l.status === "Pendente";
    if (filtro === "pagos") return l.tipo === "Despesa" && l.status === "Pago";
    if (filtro === "entradas") return l.tipo === "Receita";
    return true;
  });

  const nomeCategoria = (id?: string) => categorias.find((c) => c.id === id)?.nome;

  const marcarPago = async (l: Linha) => {
    const ok = l.contaFixa
      ? await pagarContaFixa(l.contaFixa, ano, mes)
      : !!l.lancamento && (await updateLancamento(l.lancamento.id, { status: "Pago" }));
    if (ok) toast.success(l.tipo === "Receita" ? "Marcado como recebido." : "Marcado como pago.");
  };

  const desfazer = async (l: Linha) => {
    if (!l.lancamento) return;
    // Conta fixa paga é um lançamento criado ao pagar; desfazer apaga e ela volta a "a pagar".
    if (l.lancamento.contaFixaId) await removeLancamento(l.lancamento.id);
    else await updateLancamento(l.lancamento.id, { status: "Pendente" });
  };

  const dataPadrao = chave === hojeStr.slice(0, 7) ? hojeStr : `${chave}-01`;

  const situacao = (l: Linha) => {
    if (l.tipo === "Receita") {
      return l.status === "Pago"
        ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Recebido</Badge>
        : <Badge variant="secondary">A receber</Badge>;
    }
    if (l.status === "Pago") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Pago</Badge>;
    if (l.data < hojeStr) return <Badge variant="destructive">Vencida</Badge>;
    return <Badge variant="secondary">A pagar</Badge>;
  };

  const cards = [
    { titulo: "Renda do mês", valor: resumo.renda + resumo.entradas, cor: "text-emerald-600",
      dica: resumo.entradas > 0 ? `${brl(resumo.renda)} de rendas + ${brl(resumo.entradas)} de outras entradas` : "Rendas cadastradas em Dinheiro e Contas" },
    { titulo: "Já gastei", valor: resumo.gasto, cor: "text-red-500", dica: "Saídas marcadas como pagas" },
    { titulo: "Falta pagar", valor: resumo.aPagar, cor: "text-amber-600", dica: "Contas, parcelas e lançamentos a pagar" },
    { titulo: "Sobra prevista", valor: resumo.saldo, cor: resumo.saldo >= 0 ? "text-primary" : "text-red-500",
      dica: "Renda − já gastei − falta pagar" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavegador ano={ano} mes={mes} onChange={(y, m) => { setAno(y); setMes(m); }} />
        <Button onClick={() => setForm({ aberto: true })}>
          <Plus className="h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {atrasadas.qtd > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {atrasadas.qtd === 1 ? "1 conta de meses anteriores ficou" : `${atrasadas.qtd} contas de meses anteriores ficaram`}{" "}
          sem pagar, somando {brl(atrasadas.total)}. Volte o mês para vê-las.
        </div>
      )}

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription>Tudo o que entra e sai no mês, incluindo contas fixas e parcelas de dívidas</CardDescription>
          </div>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="a-pagar">A pagar</TabsTrigger>
              <TabsTrigger value="pagos">Pagos</TabsTrigger>
              <TabsTrigger value="entradas">Entradas</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : visiveis.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada por aqui neste mês.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-28">Situação</TableHead>
                  <TableHead className="w-32 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((l) => (
                  <TableRow key={l.chave}>
                    <TableCell className="tabular-nums">{formatarData(l.data)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{l.descricao}</div>
                      {l.detalhe && <div className="text-xs text-muted-foreground">{l.detalhe}</div>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {nomeCategoria(l.categoriaId) ?? "—"}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${l.tipo === "Receita" ? "text-emerald-600" : ""}`}>
                      {l.tipo === "Receita" ? "+ " : ""}{brl(l.valor)}
                    </TableCell>
                    <TableCell>{situacao(l)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {l.status === "Pendente" ? (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => marcarPago(l)}>
                            <Check className="h-4 w-4" /> {l.tipo === "Receita" ? "Recebi" : "Paguei"}
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Desfazer pagamento"
                            onClick={() => desfazer(l)}>
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        {l.lancamento && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => setForm({ aberto: true, editando: l.lancamento })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
