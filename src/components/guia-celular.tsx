import { useCallback, useEffect, useState } from "react";
import {
  BellRing, CalendarDays, Check, CheckCircle2, Copy, Download, Ellipsis, EllipsisVertical,
  ListChecks, Loader2, Send, Settings, Share, SquarePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { abertoComoApp, detectarPlataforma, useInstalarApp } from "@/lib/instalar-app";
import { useAcesso } from "@/lib/modulos";
import {
  ativarNotificacoes, desativarNotificacoes, enviarTeste, estadoNotificacoes, type EstadoNotificacoes,
} from "@/lib/notificacoes";

type Passo = { icone: React.ComponentType<{ className?: string }>; texto: React.ReactNode };

function Passos({ passos }: { passos: Passo[] }) {
  return (
    <ol className="space-y-3">
      {passos.map((p, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <p.icone className="h-4 w-4" />
          </span>
          <p className="pt-1 text-sm"><span className="font-semibold">{i + 1}.</span> {p.texto}</p>
        </li>
      ))}
    </ol>
  );
}

const Aviso = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{children}</p>
);

// ============ INSTALAR ============
const PASSOS_IPHONE: Passo[] = [
  { icone: Share, texto: <>Abra o Pulsar no <strong>Safari</strong> e toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima). Se não estiver à vista, toque nos três pontinhos <Ellipsis className="inline h-4 w-4 align-text-bottom" /> e depois em Compartilhar.</> },
  { icone: SquarePlus, texto: <>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</> },
  { icone: Check, texto: <>Toque em <strong>Adicionar</strong>. A partir de agora, abra o Pulsar pelo ícone na tela inicial.</> },
];
const PASSOS_ANDROID: Passo[] = [
  { icone: Download, texto: <>Abra o Pulsar no <strong>Chrome</strong>. Se aparecer o aviso <strong>Instale o app Pulsar</strong>, toque em Instalar.</> },
  { icone: EllipsisVertical, texto: <>Se o aviso não aparecer, toque nos <strong>três pontinhos</strong> no canto de cima e em <strong>Instalar app</strong> (ou Adicionar à tela inicial).</> },
  { icone: Check, texto: <>Confirme em <strong>Instalar</strong>. O ícone do Pulsar aparece na tela inicial.</> },
];
const PASSOS_COMPUTADOR: Passo[] = [
  { icone: Download, texto: <>No <strong>Chrome</strong> ou no <strong>Edge</strong>, clique no ícone de instalar no canto direito da barra de endereço.</> },
  { icone: Settings, texto: <>Ou use o menu da sua conta (bolinha com as iniciais) → <strong>Instalar aplicativo</strong>.</> },
];

function Instalar() {
  const plataforma = detectarPlataforma();
  const instalar = useInstalarApp();
  const [aparelho, setAparelho] = useState<string>(plataforma === "ios" ? "iphone" : plataforma === "android" ? "android" : "computador");
  const endereco = window.location.origin;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(endereco);
      toast.success("Endereço copiado. Cole no navegador do celular.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-4">
      {abertoComoApp() && (
        <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Você já está usando o Pulsar instalado neste aparelho.
        </p>
      )}
      {instalar && (
        <Button className="w-full" onClick={instalar}><Download className="h-4 w-4" /> Instalar agora</Button>
      )}
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="truncate">{endereco}</span>
        <Button variant="ghost" size="sm" onClick={copiar}><Copy className="h-4 w-4" /> Copiar</Button>
      </div>
      <Tabs value={aparelho} onValueChange={setAparelho}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="iphone">iPhone</TabsTrigger>
          <TabsTrigger value="android">Android</TabsTrigger>
          <TabsTrigger value="computador">Computador</TabsTrigger>
        </TabsList>
        <TabsContent value="iphone" className="space-y-3 pt-3">
          <Passos passos={PASSOS_IPHONE} />
          <Aviso>Abriu o link pelo WhatsApp ou Instagram? Primeiro abra no Safari (pelo botão de compartilhar ou pelos três pontinhos). Dentro desses apps não dá para instalar.</Aviso>
        </TabsContent>
        <TabsContent value="android" className="space-y-3 pt-3">
          <Passos passos={PASSOS_ANDROID} />
          <Aviso>Abriu o link pelo WhatsApp ou Instagram? Toque nos três pontinhos e em Abrir no Chrome antes.</Aviso>
        </TabsContent>
        <TabsContent value="computador" className="pt-3">
          <Passos passos={PASSOS_COMPUTADOR} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ NOTIFICAÇÕES ============
function NotificacoesPulsar({ irParaInstalar }: { irParaInstalar: () => void }) {
  const acesso = useAcesso();
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const atualizar = useCallback(() => {
    estadoNotificacoes().then(setEstado).catch(() => setEstado("sem-suporte"));
  }, []);
  useEffect(atualizar, [atualizar]);

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true);
    try {
      await acao();
      toast.success(sucesso);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
      atualizar();
    }
  };

  const plataforma = detectarPlataforma();
  const oQue: string[] = [];
  if (acesso.pode("pessoal")) oQue.push("contas fixas, parcelas de dívidas e lançamentos do Pessoal que vencem no dia");
  if (acesso.pode("empreendedor")) oQue.push("o que há para pagar e receber no dia no financeiro do Empreendedor");

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4 text-primary" /> Avisos do Pulsar</h3>
      <p className="text-sm text-muted-foreground">
        Todo dia às 8h, se houver algo vencendo, o Pulsar avisa: {oQue.join("; ") || "os vencimentos do dia"}.
        Os avisos chegam só neste aparelho e só para a sua conta.
      </p>

      {estado === null && <p className="text-sm text-muted-foreground">Verificando este aparelho...</p>}

      {estado === "ligado" && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Ativadas neste aparelho
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={ocupado}
              onClick={() => executar(enviarTeste, "Teste enviado. O aviso deve chegar em instantes.")}>
              <Send className="h-4 w-4" /> Enviar um teste
            </Button>
            <Button variant="ghost" size="sm" disabled={ocupado}
              onClick={() => executar(desativarNotificacoes, "Notificações desativadas neste aparelho.")}>
              Desativar
            </Button>
          </div>
        </>
      )}

      {estado === "desligado" && (
        <>
          <Passos passos={[
            { icone: BellRing, texto: <>Toque em <strong>Ativar notificações</strong> aqui embaixo.</> },
            { icone: Check, texto: <>O aparelho vai perguntar se o Pulsar pode enviar notificações: toque em <strong>Permitir</strong>.</> },
            { icone: Send, texto: <>Toque em <strong>Enviar um teste</strong> para conferir que o aviso chega.</> },
          ]} />
          <Button className="w-full" disabled={ocupado}
            onClick={() => executar(ativarNotificacoes, "Notificações ativadas neste aparelho.")}>
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Ativar notificações
          </Button>
        </>
      )}

      {estado === "instalar-primeiro" && (
        <>
          <Aviso>No iPhone, as notificações só funcionam com o Pulsar <strong>instalado na tela de início</strong> e aberto pelo ícone (iOS 16.4 ou mais novo).</Aviso>
          <Passos passos={[
            { icone: Download, texto: <>Instale o Pulsar seguindo a aba <strong>Instalar</strong>.</> },
            { icone: SquarePlus, texto: <>Abra o Pulsar pelo <strong>ícone na tela inicial</strong>.</> },
            { icone: BellRing, texto: <>Volte aqui (menu da sua conta → <strong>Usar no celular</strong> → Notificações) e toque em <strong>Ativar notificações</strong>.</> },
          ]} />
          <Button variant="outline" className="w-full" onClick={irParaInstalar}>Ver como instalar</Button>
        </>
      )}

      {estado === "bloqueado" && (
        <>
          <Aviso>As notificações do Pulsar foram recusadas neste aparelho. Para liberar:</Aviso>
          <Passos passos={plataforma === "ios"
            ? [
                { icone: Settings, texto: <>Abra os <strong>Ajustes</strong> do iPhone → <strong>Notificações</strong>.</> },
                { icone: ListChecks, texto: <>Toque em <strong>Pulsar</strong> e ligue <strong>Permitir Notificações</strong>.</> },
                { icone: BellRing, texto: <>Volte ao Pulsar e abra esta tela de novo.</> },
              ]
            : plataforma === "android"
              ? [
                  { icone: Settings, texto: <>Segure o ícone do Pulsar → <strong>Informações do app</strong> (ou Configurações → Apps → Pulsar).</> },
                  { icone: ListChecks, texto: <>Toque em <strong>Notificações</strong> e ligue <strong>Permitir notificações</strong>.</> },
                  { icone: BellRing, texto: <>Volte ao Pulsar e abra esta tela de novo.</> },
                ]
              : [
                  { icone: Settings, texto: <>Clique no ícone à esquerda do endereço do site (o cadeado ou as configurações).</> },
                  { icone: ListChecks, texto: <>Em <strong>Notificações</strong>, escolha <strong>Permitir</strong> e recarregue a página.</> },
                ]} />
        </>
      )}

      {estado === "sem-suporte" && (
        <Aviso>Este navegador não recebe notificações. No celular, use o Pulsar instalado (aba Instalar); no computador, use o Chrome ou o Edge.</Aviso>
      )}

      {estado === "so-no-app-publicado" && (
        <Aviso>As notificações funcionam no Pulsar publicado (pulsar.devalorepulsar.com.br), não na prévia de desenvolvimento.</Aviso>
      )}
    </section>
  );
}

function AvisosDaAgenda() {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Avisos da Agenda</h3>
      <p className="text-sm text-muted-foreground">
        Os lembretes dos compromissos chegam pelo app <strong>Google Agenda</strong>, no horário que você escolhe em
        "Avisar no celular" ao marcar cada compromisso.
      </p>
      <Passos passos={[
        { icone: Download, texto: <>Instale o app <strong>Google Agenda</strong> (<a className="text-primary underline" href="https://apps.apple.com/app/google-calendar/id909319292" target="_blank" rel="noreferrer">App Store</a> ou <a className="text-primary underline" href="https://play.google.com/store/apps/details?id=com.google.android.calendar" target="_blank" rel="noreferrer">Play Store</a>).</> },
        { icone: Check, texto: <>Entre com a <strong>mesma conta Google</strong> que está conectada na Agenda do Pulsar.</> },
        { icone: ListChecks, texto: <>No menu ☰ do Google Agenda, confirme que <strong>Pulsar · Pessoal</strong> e <strong>Pulsar · Empreendedor</strong> estão marcadas.</> },
        { icone: Settings, texto: <>Permita as notificações do Google Agenda: no iPhone, <strong>Ajustes → Notificações → Google Agenda</strong>; no Android, segure o ícone do Google Agenda → <strong>Informações do app → Notificações</strong>.</> },
      ]} />
    </section>
  );
}

/** Conteúdo da janela "Usar no celular". O <Dialog> fica em quem usa. */
export function GuiaCelular({ abaInicial = "instalar" }: { abaInicial?: "instalar" | "notificacoes" }) {
  const acesso = useAcesso();
  const [aba, setAba] = useState<string>(abaInicial);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Usar o Pulsar no celular</DialogTitle>
        <DialogDescription>Instale o app e ligue os avisos. É feito uma vez em cada aparelho.</DialogDescription>
      </DialogHeader>
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instalar">Instalar</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="instalar" className="pt-3">
          <Instalar />
        </TabsContent>
        <TabsContent value="notificacoes" className="space-y-4 pt-3">
          <NotificacoesPulsar irParaInstalar={() => setAba("instalar")} />
          {acesso.pode("empreendedor") && <AvisosDaAgenda />}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
