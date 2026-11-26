import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  usePessoal, brl, hojeISO, linhasDoMes, rendaDoMes, resumirDivida, MESES,
} from "@/lib/pessoal-store";

// Tela de entrada do Pessoal: o caminho em 3 partes (Onde estou → Meu mês → Para onde vou),
// a situação de cada uma e o que fazer agora. Tudo calculado dos cadastros da própria pessoa.
export const Route = createFileRoute("/pessoal/")({
  component: MeuCaminho,
});

/** Quanto da renda já está comprometido com contas fixas e parcelas. */
const FAIXAS = [
  { ate: 60, rotulo: "Folga boa", texto: "Sobra espaço para o dia a dia e para guardar.", cor: "text-emerald-600", barra: "bg-emerald-500" },
  { ate: 80, rotulo: "Atenção", texto: "Fica pouco espaço para o dia a dia e para imprevistos.", cor: "text-amber-600", barra: "bg-amber-500" },
  { ate: Infinity, rotulo: "Apertado", texto: "Contas fixas e parcelas levam quase toda a renda. Reduzir parcelas é a prioridade.", cor: "text-red-500", barra: "bg-red-500" },
];

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Passo = { titulo: string; texto: string; para: string; botao: string; alerta?: boolean };

function MeuCaminho() {
  const { rendas, contasFixas, dividas, lancamentos, carregando } = usePessoal();
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const hojeStr = hojeISO();

  const d = useMemo(() => {
    const linhas = linhasDoMes({ lancamentos, contasFixas, dividas }, ano, mes);
    const renda = rendaDoMes(rendas, ano, mes);
    let entradas = 0, pago = 0, aPagar = 0, fixas = 0, parcelas = 0;
    for (const l of linhas) {
      if (l.tipo === "Receita") { entradas += l.valor; continue; }
      if (l.status === "Pago") pago += l.valor; else aPagar += l.valor;
      if (l.origem === "conta_fixa") fixas += l.valor;
      if (l.origem === "parcela") parcelas += l.valor;
    }

    // Vencidas: a mesma regra do Dia a dia — lançamentos a pagar com data passada e as contas
    // fixas deste mês ainda não pagas cujo dia já passou.
    const vencidasLanc = lancamentos.filter((l) => l.tipo === "Despesa" && l.status === "Pendente" && l.data < hojeStr);
    const vencidasFixas = linhas.filter((l) => l.contaFixa && l.data < hojeStr);
    const vencidas = {
      qtd: vencidasLanc.length + vencidasFixas.length,
      total: [...vencidasLanc, ...vencidasFixas].reduce((s, l) => s + l.valor, 0),
    };

    let dividasAtivas = 0, devendo = 0;
    for (const div of dividas) {
      const r = resumirDivida(div, lancamentos);
      if (!r.quitada) dividasAtivas++;
      devendo += r.valorRestante;
    }

    // Sobra média dos 3 meses anteriores que tiveram algum movimento.
    const sobras: number[] = [];
    for (let k = 1; k <= 3; k++) {
      const ref = new Date(ano, mes - 1 - k, 1);
      const a = ref.getFullYear(), m = ref.getMonth() + 1;
      const ls = linhasDoMes({ lancamentos, contasFixas, dividas }, a, m);
      const r = rendaDoMes(rendas, a, m);
      if (r === 0 && ls.length === 0) continue;
      sobras.push(ls.reduce((s, l) => s + (l.tipo === "Receita" ? l.valor : -l.valor), r));
    }
    const sobraMedia = sobras.length ? sobras.reduce((s, v) => s + v, 0) / sobras.length : null;

    return {
      renda, entradas, pago, aPagar, fixas, parcelas, vencidas, dividasAtivas, devendo, sobraMedia,
      mesesNaMedia: sobras.length,
      sobraPrevista: renda + entradas - pago - aPagar,
      comprometido: renda > 0 ? Math.round(((fixas + parcelas) / renda) * 100) : null,
      rendasAtivas: rendas.filter((r) => r.ativa).length,
      fixasAtivas: contasFixas.filter((c) => c.ativa).length,
    };
  }, [rendas, contasFixas, dividas, lancamentos, ano, mes, hojeStr]);

  if (carregando) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  const nomeMes = MESES[mes - 1].toLowerCase();
  const parte1Completa = d.rendasAtivas > 0 && d.fixasAtivas > 0;

  const proximo: Passo = !d.rendasAtivas
    ? { titulo: "Comece pelo que entra", texto: "Cadastre sua renda (salário, pró-labore, aluguel...). Ela é a base de todas as contas.",
        para: "/pessoal/dinheiro-e-contas", botao: "Cadastrar renda" }
    : !d.fixasAtivas
      ? { titulo: "Agora, o que se repete todo mês", texto: "Cadastre as contas fixas (aluguel, luz, internet, escola...) para ver quanto da renda já tem destino certo.",
          para: "/pessoal/dinheiro-e-contas", botao: "Cadastrar contas fixas" }
      : d.vencidas.qtd > 0
        ? { titulo: `${plural(d.vencidas.qtd, "conta vencida", "contas vencidas")}`, texto: `Somam ${brl(d.vencidas.total)}. Pague e marque como paga no Dia a dia.`,
            para: "/pessoal/movimentacoes", botao: "Ver o dia a dia", alerta: true }
        : d.aPagar > 0
          ? { titulo: `Faltam ${brl(d.aPagar)} para pagar em ${nomeMes}`, texto: "Marque o que já pagou e lance os gastos do dia a dia, para a sobra do mês ficar certa.",
              para: "/pessoal/movimentacoes", botao: "Abrir o dia a dia" }
          : { titulo: "Tudo em dia neste mês", texto: "Veja como o seu ano está indo, mês a mês.",
              para: "/pessoal/resultado", botao: "Ver resultado do ano" };

  const faixa = d.comprometido === null ? null : FAIXAS.find((f) => d.comprometido! <= f.ate)!;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className={proximo.alerta
        ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
        : "border-primary/40 bg-linear-to-r from-primary/10 to-transparent"}>
        <CardContent className="flex flex-col gap-4 pt-(--card-pad) sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${proximo.alerta ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
              {proximo.alerta && <AlertTriangle className="h-3.5 w-3.5" />} O que fazer agora
            </p>
            <p className="mt-1 text-lg font-semibold">{proximo.titulo}</p>
            <p className="text-sm text-muted-foreground">{proximo.texto}</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to={proximo.para}>{proximo.botao} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Seu dinheiro em 3 partes: primeiro entender <strong className="text-foreground">onde você está</strong>,
        depois cuidar do <strong className="text-foreground">mês</strong> e, por fim, decidir{" "}
        <strong className="text-foreground">para onde vai o que sobra</strong>.
      </p>

      <ol className="space-y-4">
        <Parte numero={1} titulo="Onde estou" dica="O que entra, o que é fixo e o que devo"
          situacao={parte1Completa
            ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Preenchido</Badge>
            : <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Falta preencher</Badge>}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Dado rotulo="Entra por mês" valor={brl(d.renda)} cor="text-emerald-600"
              detalhe={d.rendasAtivas ? plural(d.rendasAtivas, "renda", "rendas") : "nenhuma renda cadastrada"} />
            <Dado rotulo="Contas fixas" valor={brl(d.fixas)}
              detalhe={d.fixasAtivas ? plural(d.fixasAtivas, "conta", "contas") : "nenhuma conta cadastrada"} />
            <Dado rotulo={`Parcelas em ${nomeMes}`} valor={brl(d.parcelas)}
              detalhe={d.dividasAtivas ? `${plural(d.dividasAtivas, "dívida", "dívidas")} · faltam ${brl(d.devendo)}` : "nenhuma dívida em andamento"} />
          </div>

          {faixa && d.comprometido !== null ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <span>
                  <strong className="tabular-nums">{d.comprometido}%</strong> da sua renda já tem destino certo
                  <span className="text-muted-foreground"> (contas fixas e parcelas)</span>
                </span>
                <span className={`font-semibold ${faixa.cor}`}>{faixa.rotulo}</span>
              </div>
              <div className="relative mt-2 h-3 rounded-full bg-muted">
                <div className={`h-full rounded-full ${faixa.barra}`} style={{ width: `${Math.min(d.comprometido, 100)}%` }} />
                {[60, 80].map((m) => (
                  <span key={m} aria-hidden className="absolute top-0 h-3 w-0.5 bg-background" style={{ left: `${m}%` }} />
                ))}
              </div>
              <div className="relative mt-1 h-4 text-[10px] text-muted-foreground">
                {[60, 80].map((m) => (
                  <span key={m} className="absolute -translate-x-1/2" style={{ left: `${m}%` }}>{m}%</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{faixa.texto} O ideal é ficar abaixo de 60%.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cadastre sua renda para ver quanto dela já está comprometido.</p>
          )}

          {d.dividasAtivas === 0 && dividas.length === 0 && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Tem cartão parcelado, empréstimo ou financiamento? Cadastre em Dívidas para as parcelas entrarem na conta de cada mês.
            </p>
          )}

          <Atalhos itens={[
            { para: "/pessoal/dinheiro-e-contas", rotulo: "Rendas e contas fixas" },
            { para: "/pessoal/dividas", rotulo: "Dívidas" },
          ]} />
        </Parte>

        <Parte numero={2} titulo="Meu mês" dica={`Como está ${nomeMes}: o que entrou, o que já paguei e o que falta`}
          situacao={d.vencidas.qtd > 0
            ? <Badge variant="destructive">{plural(d.vencidas.qtd, "vencida", "vencidas")}</Badge>
            : d.aPagar > 0
              ? <Badge variant="secondary">Em andamento</Badge>
              : d.pago > 0
                ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Em dia</Badge>
                : <Badge variant="outline">Sem movimento</Badge>}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Dado rotulo="Entra no mês" valor={brl(d.renda + d.entradas)} cor="text-emerald-600" />
            <Dado rotulo="Já paguei" valor={brl(d.pago)} cor="text-red-500" />
            <Dado rotulo="Falta pagar" valor={brl(d.aPagar)} cor="text-amber-600" />
            <Dado rotulo="Sobra prevista" valor={brl(d.sobraPrevista)} cor={d.sobraPrevista >= 0 ? "text-primary" : "text-red-500"} />
          </div>
          {d.vencidas.qtd > 0 && (
            <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {plural(d.vencidas.qtd, "conta vencida", "contas vencidas")} somando {brl(d.vencidas.total)}.
            </p>
          )}
          <Atalhos itens={[
            { para: "/pessoal/movimentacoes", rotulo: "Dia a dia" },
            { para: "/pessoal/resultado", rotulo: "Resultado do ano" },
          ]} />
        </Parte>

        <Parte numero={3} titulo="Para onde vou" dica="O que fazer com o que sobra" ultima
          situacao={<Badge variant="outline">Em breve</Badge>}>
          {d.sobraMedia === null ? (
            <p className="text-sm text-muted-foreground">
              Quando houver alguns meses registrados, aqui aparece quanto costuma sobrar por mês.
            </p>
          ) : (
            <p className="text-sm">
              Nos últimos {d.mesesNaMedia === 1 ? "mês" : `${d.mesesNaMedia} meses`}{" "}
              {d.sobraMedia >= 0 ? "sobrou" : "faltou"}, em média,{" "}
              <strong className={`tabular-nums ${d.sobraMedia >= 0 ? "text-primary" : "text-red-500"}`}>{brl(Math.abs(d.sobraMedia))}</strong> por mês.
              {d.sobraMedia >= 0
                ? " É esse dinheiro que constrói o seu futuro."
                : " Antes de pensar no futuro, a parte 2 precisa fechar no azul."}
            </p>
          )}
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>• Dividir a sobra em destinos: guardar, investir, sonhos e lazer</li>
            <li>• Metas e sonhos, com prazo e quanto guardar por mês</li>
            <li>• Bens e investimentos: quanto você tem de verdade</li>
          </ul>
        </Parte>
      </ol>
    </div>
  );
}

function Parte({ numero, titulo, dica, situacao, ultima, children }: {
  numero: number;
  titulo: string;
  dica: string;
  situacao: ReactNode;
  ultima?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 sm:gap-4">
      {/* Linha que liga uma parte à seguinte. */}
      {!ultima && <span aria-hidden className="absolute -bottom-4 left-4 top-9 w-px bg-border sm:left-5 sm:top-11" />}
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:h-10 sm:w-10 sm:text-base">
        {numero}
      </span>
      <Card className="min-w-0 flex-1 border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">{titulo}</CardTitle>
            <CardDescription>{dica}</CardDescription>
          </div>
          {situacao}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </li>
  );
}

function Dado({ rotulo, valor, detalhe, cor = "" }: { rotulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={`text-base font-semibold tabular-nums sm:text-lg ${cor}`}>{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function Atalhos({ itens }: { itens: { para: string; rotulo: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((i) => (
        <Button key={i.para} asChild variant="outline" size="sm">
          <Link to={i.para}>{i.rotulo} <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      ))}
    </div>
  );
}
