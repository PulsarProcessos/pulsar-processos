import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MesNavegador } from "@/components/pessoal/mes-navegador";
import { ProximoPasso } from "@/components/proximo-passo";
import {
  usePessoal, brl, divisaoDoMes, MESES, Destino, DestinoInput, ItemDivisao,
} from "@/lib/pessoal-store";
import { COR_SEM_DESTINO as COR_OUTROS, corDoDestino } from "@/lib/cores-destinos";

// Parte 3 do caminho (Para onde vou): cada real que entra ganha um destino.
export const Route = createFileRoute("/pessoal/divisao")({
  component: Divisao,
});

const SUGESTAO = [
  { nome: "Contas e dia a dia", percentual: 60, texto: "Contas fixas, parcelas, mercado, transporte..." },
  { nome: "Investir", percentual: 15, texto: "Para o dinheiro trabalhar por você." },
  { nome: "Sonhos", percentual: 10, texto: "Viagem, carro, reforma: o que você quer conquistar." },
  { nome: "Aproveitar a vida", percentual: 10, texto: "Lazer sem culpa, porque já está planejado." },
  { nome: "Reserva para imprevistos", percentual: 5, texto: "Para os sustos não virarem dívida." },
];

const PADRAO = "__padrao__";
const fmtPct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

function Divisao() {
  const dados = usePessoal();
  const { destinos, categorias, carregando, usarDivisaoSugerida, ligarCategoriaDestino } = dados;
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ajustando, setAjustando] = useState(false);
  const [criando, setCriando] = useState(false);

  const div = useMemo(() => divisaoDoMes(dados, ano, mes), [dados, ano, mes]);
  const padrao = destinos.find((d) => d.padrao);
  const catsGasto = categorias.filter((c) => c.tipo === "Despesa");

  if (carregando) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  if (destinos.length === 0) {
    const comecar = async () => {
      setCriando(true);
      const ok = await usarDivisaoSugerida();
      setCriando(false);
      if (ok) toast.success("Divisão criada. Ajuste os percentuais quando quiser.");
    };
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Dê um destino para cada real que entra</CardTitle>
            <CardDescription>
              Antes de gastar, decida quanto da renda vai para cada coisa. Assim o dinheiro para investir e
              para os sonhos não fica para "se sobrar". Uma sugestão para começar:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-border/60">
              {SUGESTAO.map((s) => (
                <li key={s.nome} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{s.texto}</p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-primary">{s.percentual}%</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Você pode mudar nomes e percentuais depois. Quer separar uma parte para doar ou ajudar alguém?
              É só criar um destino. Também criamos as categorias Investimentos, Guardado para sonhos, Lazer e
              Reserva, para os lançamentos contarem no destino certo.
            </p>
            <Button onClick={comecar} disabled={criando} className="w-full sm:w-auto">
              {criando ? "Criando..." : "Usar esta divisão"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nomeMes = MESES[mes - 1].toLowerCase();
  const fechado = Math.abs(div.totalPercentual - 100) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavegador ano={ano} mes={mes} onChange={(y, m) => { setAno(y); setMes(m); }} />
        <Button variant="outline" onClick={() => setAjustando(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Ajustar divisão
        </Button>
      </div>

      <Distribuicao itens={div.itens} entradas={div.entradas} semDestino={div.semDestino} nomeMes={nomeMes} />

      {!fechado && (
        <p className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          A divisão soma {fmtPct(div.totalPercentual)}. Ajuste para fechar 100%.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {div.itens.map(({ destino, planejado, usado }, i) => {
          const pct = planejado > 0 ? (usado / planejado) * 100 : usado > 0 ? 100 : 0;
          const diferenca = planejado - usado;
          return (
            <Card key={destino.id} className="min-w-0 border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: corDoDestino(i) }} />
                    {destino.nome}
                  </CardTitle>
                  {destino.padrao && <CardDescription>Todo gasto sem outro destino conta aqui</CardDescription>}
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">{fmtPct(destino.percentual)}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Planejado</span>
                  <span className="font-semibold tabular-nums">{brl(planejado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usado no mês</span>
                  <span className="font-semibold tabular-nums">{brl(usado)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: corDoDestino(i) }} />
                </div>
                <p className={`text-xs ${diferenca < 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {diferenca >= 0
                    ? `Faltam ${brl(diferenca)} para o planejado`
                    : `${brl(-diferenca)} acima do planejado`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {div.semDestino > 0 && (
        <p className="text-sm text-muted-foreground">
          {brl(div.semDestino)} em gastos ficaram sem destino. Marque um destino como padrão em "Ajustar divisão".
        </p>
      )}

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Categorias de cada destino</CardTitle>
          <CardDescription>
            Os gastos de cada categoria contam para o destino escolhido. Ex.: lance a aplicação do mês no Dia a dia
            com a categoria Investimentos, e ela conta em "Investir".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {catsGasto.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria de gasto cadastrada.</p>
          ) : (
            <div className="@container divide-y divide-border/60">
              {catsGasto.map((c) => (
                <div key={c.id} className="flex flex-col gap-1.5 py-2.5 @md:flex-row @md:items-center @md:justify-between @md:gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{c.nome}</span>
                  <Select value={c.destinoId && destinos.some((d) => d.id === c.destinoId) ? c.destinoId : PADRAO}
                    onValueChange={(v) => ligarCategoriaDestino(c.id, v === PADRAO ? null : v)}>
                    <SelectTrigger className="h-9 w-full @md:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PADRAO}>{padrao ? `${padrao.nome} (padrão)` : "Sem destino"}</SelectItem>
                      {destinos.filter((d) => !d.padrao).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProximoPasso para="/pessoal/metas" titulo="Metas e sonhos"
        texto="Dê nome, valor e prazo ao que você quer conquistar, e veja quanto guardar por mês." />

      <Dialog open={ajustando} onOpenChange={setAjustando}>
        {ajustando && <AjustarDivisao destinos={destinos} onConcluir={() => setAjustando(false)} />}
      </Dialog>
    </div>
  );
}

type Fatia = { nome: string; valor: number; cor: string; rotulo: string };

/** Duas pizzas com as mesmas cores: como a renda foi planejada e como foi usada no mês. */
function Distribuicao({ itens, entradas, semDestino, nomeMes }: {
  itens: ItemDivisao[]; entradas: number; semDestino: number; nomeMes: string;
}) {
  const planejado: Fatia[] = itens.map((it, i) => ({
    nome: it.destino.nome, valor: it.destino.percentual, cor: corDoDestino(i),
    rotulo: `${fmtPct(it.destino.percentual)} · ${brl(it.planejado)}`,
  }));
  const totalUsado = itens.reduce((s, it) => s + it.usado, 0) + semDestino;
  const usado: Fatia[] = [
    ...itens.map((it, i) => ({
      nome: it.destino.nome, valor: it.usado, cor: corDoDestino(i),
      rotulo: `${brl(it.usado)} · ${totalUsado > 0 ? fmtPct(Math.round((it.usado / totalUsado) * 100)) : "0%"}`,
    })),
    ...(semDestino > 0 ? [{ nome: "Sem destino", valor: semDestino, cor: COR_OUTROS, rotulo: brl(semDestino) }] : []),
  ];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle>Como a renda está distribuída</CardTitle>
        <CardDescription>
          Entrou em {nomeMes}: <strong className="tabular-nums text-emerald-600">{brl(entradas)}</strong>.
          Cada percentual é calculado sobre esse valor.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-[1fr_1fr_minmax(0,1.2fr)] lg:items-center lg:gap-6">
        <Rosca titulo="Como planejei" centro="100%" fatias={planejado} vazio="" />
        <Rosca titulo={`Como usei em ${nomeMes}`} centro={brl(totalUsado)} fatias={usado}
          vazio="Nenhum gasto neste mês." />
        {/* Legenda com nome e valores: a cor nunca é a única pista. */}
        <ul className="col-span-2 space-y-2.5 lg:col-span-1">
          {itens.map((it, i) => (
            <li key={it.destino.id} className="flex items-start gap-2.5 text-sm">
              <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: corDoDestino(i) }} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 font-medium leading-snug">{it.destino.nome}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{fmtPct(it.destino.percentual)}</span>
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  planejado {brl(it.planejado)} · usado {brl(it.usado)}
                </p>
              </div>
            </li>
          ))}
          {semDestino > 0 && (
            <li className="flex items-start gap-2.5 text-sm">
              <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: COR_OUTROS }} />
              <span className="flex-1">Sem destino <span className="text-xs text-muted-foreground">· usado {brl(semDestino)}</span></span>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function Rosca({ titulo, centro, fatias, vazio }: { titulo: string; centro: string; fatias: Fatia[]; vazio: string }) {
  const comValor = fatias.filter((f) => f.valor > 0);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-center text-xs font-medium sm:text-sm">{titulo}</figcaption>
      <div className="relative mx-auto h-40 w-full max-w-60 sm:h-48">
        {comValor.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">{vazio}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* isAnimationActive={false}: com a animação de entrada do recharts 2 a rosca não aparecia. */}
                <Pie data={comValor} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="92%"
                  startAngle={90} endAngle={-270} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                  {comValor.map((f) => <Cell key={f.nome} fill={f.cor} />)}
                </Pie>
                <Tooltip
                  formatter={(_v: number, nome: string, item: { payload?: Fatia }) => [item.payload?.rotulo ?? "", nome]}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums sm:text-sm">
              {centro}
            </span>
          </>
        )}
      </div>
    </figure>
  );
}

type Linha = DestinoInput & { chave: string; texto: string };

function AjustarDivisao({ destinos, onConcluir }: { destinos: Destino[]; onConcluir: () => void }) {
  const { salvarDestinos } = usePessoal();
  const semPadrao = !destinos.some((d) => d.padrao);
  const [linhas, setLinhas] = useState<Linha[]>(() => [...destinos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((d, i) => ({ ...d, padrao: d.padrao || (semPadrao && i === 0), chave: d.id, texto: String(d.percentual) })));
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const total = linhas.reduce((s, l) => s + (Number(l.texto.replace(",", ".")) || 0), 0);
  const fechado = Math.abs(total - 100) < 0.01;
  const mudar = (chave: string, p: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...p } : l)));

  const remover = (l: Linha) => {
    setLinhas((ls) => ls.filter((x) => x.chave !== l.chave));
    if (l.id) setRemovidos((r) => [...r, l.id!]);
  };
  const adicionar = () => setLinhas((ls) => [
    ...ls, { chave: `novo-${Date.now()}`, nome: "", percentual: 0, texto: "0", padrao: false, ordem: ls.length + 1 },
  ]);

  const salvar = async () => {
    const nomes = linhas.map((l) => l.nome.trim().toLowerCase());
    if (nomes.some((n) => !n)) { toast.error("Dê um nome para cada destino."); return; }
    if (new Set(nomes).size !== nomes.length) { toast.error("Há dois destinos com o mesmo nome."); return; }
    const pcts = linhas.map((l) => Number(l.texto.replace(",", ".")));
    if (pcts.some((p) => !Number.isFinite(p) || p < 0 || p > 100)) { toast.error("Cada percentual vai de 0 a 100."); return; }
    if (!fechado) { toast.error("A soma precisa dar 100%."); return; }
    setSalvando(true);
    const ok = await salvarDestinos(
      linhas.map((l, i) => ({ id: l.id, nome: l.nome, percentual: pcts[i], padrao: l.padrao, ordem: i + 1 })),
      removidos,
    );
    setSalvando(false);
    if (ok) { toast.success("Divisão salva."); onConcluir(); }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Ajustar divisão</DialogTitle>
        <DialogDescription>Os percentuais precisam somar 100%. O destino padrão recebe os gastos sem outro destino.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.chave} className="flex items-center gap-2">
            <Input value={l.nome} onChange={(e) => mudar(l.chave, { nome: e.target.value })} maxLength={60}
              placeholder="Nome do destino" className="min-w-0 flex-1" aria-label="Nome do destino" />
            <div className="relative w-20 shrink-0">
              <Input value={l.texto} onChange={(e) => mudar(l.chave, { texto: e.target.value })} inputMode="decimal"
                className="pr-6 text-right tabular-nums" aria-label={`Percentual de ${l.nome || "destino"}`} />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            {l.padrao ? (
              <Badge variant="outline" className="w-16 shrink-0 justify-center">padrão</Badge>
            ) : (
              <Button size="icon" variant="ghost" className="h-9 w-16 shrink-0 text-red-500" title="Remover" aria-label="Remover"
                onClick={() => remover(l)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={adicionar}><Plus className="h-4 w-4" /> Novo destino</Button>
      </div>
      <p className={`text-sm font-medium ${fechado ? "text-emerald-600" : "text-amber-700 dark:text-amber-400"}`}>
        Total: {fmtPct(total)}{fechado ? " ✓" : total < 100 ? ` · faltam ${fmtPct(100 - total)}` : ` · passou ${fmtPct(total - 100)}`}
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando || !fechado}>{salvando ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
