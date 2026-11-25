import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CalendarDays, Loader2, LogOut, MapPin, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MesNavegador } from "@/components/pessoal/mes-navegador";
import { CompromissoForm } from "@/components/agenda/compromisso-form";
import {
  TIPOS_COMPROMISSO, estiloTipo, horario, periodo, somarDias, textoAviso, urlConectarGoogle,
  useCompromissos, useDesconectarGoogle, useStatusAgenda, Compromisso,
} from "@/lib/agenda";

export const Route = createFileRoute("/empreendedor/agenda")({
  component: Agenda,
});

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Agenda() {
  const status = useStatusAgenda();

  // Volta do Google depois de conectar a conta: avisa e limpa o endereço.
  useEffect(() => {
    const resultado = new URLSearchParams(window.location.search).get("google");
    if (!resultado) return;
    if (resultado === "conectado") toast.success("Google Agenda conectado.");
    else if (resultado === "cancelado") toast("Conexão com o Google cancelada.");
    else toast.error("Não foi possível conectar o Google Agenda. Tente de novo.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  if (status.isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;
  }
  if (status.isError || !status.data) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {(status.error as Error)?.message ?? "Não foi possível abrir a agenda."}
      </p>
    );
  }
  if (!status.data.conectado) return <ConectarGoogle configurado={status.data.configurado} />;
  return <AgendaConectada email={status.data.email} />;
}

function ConectarGoogle({ configurado }: { configurado: boolean }) {
  const [abrindo, setAbrindo] = useState(false);

  const conectar = async () => {
    setAbrindo(true);
    try {
      window.location.href = await urlConectarGoogle();
    } catch (e) {
      toast.error((e as Error).message);
      setAbrindo(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg border-border/60">
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarDays className="h-6 w-6" />
        </span>
        <CardTitle>Conecte o seu Google Agenda</CardTitle>
        <CardDescription>
          O Pulsar cria duas agendas no seu Google, "Pulsar · Pessoal" e "Pulsar · Empreendedor".
          O que você marcar aqui aparece lá e vice-versa, e os avisos chegam no celular pelo app
          Google Agenda. O Pulsar só mexe nessas duas agendas; o resto da sua agenda fica de fora.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {configurado ? (
          <Button onClick={conectar} disabled={abrindo}>
            {abrindo && <Loader2 className="h-4 w-4 animate-spin" />} Conectar com o Google
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            A ligação com o Google ainda não foi configurada no servidor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type Form = { aberto: boolean; editando?: Compromisso; data?: string };

function AgendaConectada({ email }: { email: string | null }) {
  const hoje = new Date();
  const hojeStr = iso(hoje);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  // No celular a grade do mês fica apertada: começa na lista.
  const [visao, setVisao] = useState<"mes" | "lista">(() =>
    window.matchMedia("(max-width: 767px)").matches ? "lista" : "mes",
  );
  const [form, setForm] = useState<Form>({ aberto: false });
  const desconectar = useDesconectarGoogle();

  // A grade mostra 6 semanas a partir do domingo antes do dia 1.
  const dias = useMemo(() => {
    const primeiro = new Date(ano, mes - 1, 1);
    const inicio = new Date(ano, mes - 1, 1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => iso(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)));
  }, [ano, mes]);
  const chave = `${ano}-${pad(mes)}`;

  const lista = useCompromissos(dias[0], dias[41], true);

  const porDia = useMemo(() => {
    const m = new Map<string, Compromisso[]>();
    for (const c of lista.data ?? []) {
      const { de, ate } = periodo(c);
      for (let d = de; d <= ate; d = somarDias(d, 1)) {
        if (!m.has(d)) m.set(d, []);
        m.get(d)!.push(c);
      }
    }
    return m;
  }, [lista.data]);

  const diasDoMesComCompromisso = useMemo(
    () => dias.filter((d) => d.startsWith(chave) && porDia.has(d)),
    [dias, chave, porDia],
  );

  const novo = (data?: string) =>
    setForm({ aberto: true, data: data ?? (chave === hojeStr.slice(0, 7) ? hojeStr : `${chave}-01`) });
  const abrir = (c: Compromisso) => setForm({ aberto: true, editando: c });

  const sair = async () => {
    if (!confirm("Desconectar o Google Agenda? Os compromissos continuam no Google; só deixam de aparecer aqui.")) return;
    await desconectar.mutateAsync().catch(() => undefined);
    toast.success("Google Agenda desconectado.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavegador ano={ano} mes={mes} onChange={(y, m) => { setAno(y); setMes(m); }} />
        <div className="flex items-center gap-2">
          <Tabs value={visao} onValueChange={(v) => setVisao(v as "mes" | "lista")}>
            <TabsList>
              <TabsTrigger value="mes">Mês</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => novo()}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {TIPOS_COMPROMISSO.map((t) => (
          <span key={t.valor} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${t.ponto}`} /> {t.nome}
          </span>
        ))}
        {lista.isFetching && (
          <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Atualizando</span>
        )}
      </div>

      {lista.isError ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {(lista.error as Error).message}
          </CardContent>
        </Card>
      ) : visao === "mes" ? (
        <Card className="overflow-hidden border-border/60">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((d) => {
              const doMes = d.startsWith(chave);
              const itens = porDia.get(d) ?? [];
              return (
                <div
                  key={d}
                  role="button"
                  tabIndex={0}
                  onClick={() => novo(d)}
                  onKeyDown={(e) => { if (e.key === "Enter") novo(d); }}
                  className={`min-h-20 cursor-pointer border-b border-r p-1 text-left transition-colors hover:bg-muted/40 md:min-h-28 ${doMes ? "" : "bg-muted/20 text-muted-foreground"}`}
                >
                  <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${d === hojeStr ? "bg-primary font-semibold text-primary-foreground" : ""}`}>
                    {Number(d.slice(8))}
                  </div>
                  <div className="space-y-0.5">
                    {itens.slice(0, 3).map((c) => (
                      <button
                        key={`${c.tipo}-${c.id}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); abrir(c); }}
                        className={`block w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[11px] leading-tight ${estiloTipo(c.tipo).cartao}`}
                        title={`${horario(c)} · ${c.titulo}`}
                      >
                        <span className="hidden md:inline">{c.diaInteiro ? "" : `${horario(c).slice(0, 5)} `}</span>
                        {c.titulo}
                      </button>
                    ))}
                    {itens.length > 3 && (
                      <p className="px-1 text-[11px] text-muted-foreground">+{itens.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {lista.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : diasDoMesComCompromisso.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum compromisso neste mês. Toque em "Novo" para marcar um.
              </CardContent>
            </Card>
          ) : (
            diasDoMesComCompromisso.map((d) => (
              <div key={d} className={d < hojeStr ? "opacity-60" : ""}>
                <p className="mb-2 text-sm font-semibold capitalize">
                  {d === hojeStr ? "Hoje · " : ""}
                  {new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="space-y-2">
                  {porDia.get(d)!.map((c) => (
                    <button
                      key={`${c.tipo}-${c.id}`}
                      type="button"
                      onClick={() => abrir(c)}
                      className={`block w-full rounded-lg border-l-4 px-4 py-3 text-left shadow-sm transition-opacity hover:opacity-90 ${estiloTipo(c.tipo).cartao}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium opacity-80">{horario(c)}</span>
                        <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
                          {estiloTipo(c.tipo).nome}
                        </span>
                      </div>
                      <p className="mt-0.5 font-semibold">{c.titulo}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs opacity-80">
                        {c.local && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.local}</span>}
                        {c.avisoMin != null && (
                          <span className="flex items-center gap-1">
                            <BellRing className="h-3 w-3" />
                            {textoAviso(c.avisoMin)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>
          Conectado ao Google Agenda{email ? ` de ${email}` : ""}. Os avisos chegam no celular pelo app Google Agenda.
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={sair} disabled={desconectar.isPending}>
          <LogOut className="h-3.5 w-3.5" /> Desconectar
        </Button>
      </div>

      <Dialog open={form.aberto} onOpenChange={(v) => { if (!v) setForm({ aberto: false }); }}>
        {form.aberto && (
          <CompromissoForm
            editando={form.editando}
            dataPadrao={form.data ?? hojeStr}
            onConcluir={() => setForm({ aberto: false })}
          />
        )}
      </Dialog>
    </div>
  );
}
