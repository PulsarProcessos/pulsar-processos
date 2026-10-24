import { useEffect, useMemo, useState } from "react";
import { Download, Ellipsis, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { detectarPlataforma, useAppInstalado, useInstalarApp } from "@/lib/instalar-app";

// Quem abre o link no celular recebe o convite para instalar o app.
// "Agora não" esconde o convite por alguns dias.
const CHAVE_DISPENSA = "pulsar-convite-instalar-dispensado";
const DIAS_SEM_MOSTRAR = 7;

function foiDispensado() {
  try {
    const quando = Number(localStorage.getItem(CHAVE_DISPENSA));
    return !!quando && Date.now() - quando < DIAS_SEM_MOSTRAR * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dispensar() {
  try {
    localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
  } catch {
    // Sem armazenamento (aba anônima): o convite volta na próxima visita.
  }
}

type Passo = { icone: React.ComponentType<{ className?: string }>; texto: React.ReactNode };

const PASSOS_IPHONE: Passo[] = [
  {
    icone: Share,
    texto: (
      <>
        Toque em <strong>Compartilhar</strong>, o quadrado com a seta para cima. Se não estiver
        à vista, toque nos três pontinhos <Ellipsis className="inline h-4 w-4 align-text-bottom" /> e
        depois em Compartilhar.
      </>
    ),
  },
  { icone: SquarePlus, texto: <>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</> },
  { icone: Download, texto: <>Toque em <strong>Adicionar</strong>. O ícone do Pulsar aparece na sua tela inicial.</> },
];

const PASSOS_ANDROID: Passo[] = [
  { icone: EllipsisVertical, texto: <>Toque nos <strong>três pontinhos</strong> no canto de cima do navegador.</> },
  { icone: Download, texto: <>Toque em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).</> },
  { icone: SquarePlus, texto: <>Confirme em <strong>Instalar</strong>. O ícone do Pulsar aparece na sua tela inicial.</> },
];

export function ConviteInstalar() {
  const instalar = useInstalarApp();
  const instalado = useAppInstalado();
  const plataforma = useMemo(detectarPlataforma, []);
  const [dispensado, setDispensado] = useState(foiDispensado);
  const [aparecer, setAparecer] = useState(false);
  const [passosAbertos, setPassosAbertos] = useState(false);

  // Um instante depois de abrir, para não pular na cara antes da página carregar.
  useEffect(() => {
    const t = setTimeout(() => setAparecer(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (plataforma === "outro" || instalado) return null;

  const clicarInstalar = async () => {
    // Android com o navegador pronto: abre a instalação nativa num toque só.
    if (instalar) {
      await instalar();
      return;
    }
    setPassosAbertos(true);
  };

  const agoraNao = () => {
    dispensar();
    setDispensado(true);
  };

  const iphone = plataforma === "ios";
  const passos = iphone ? PASSOS_IPHONE : PASSOS_ANDROID;

  return (
    <>
      {aparecer && !dispensado && (
        <div
          role="dialog"
          aria-label="Instalar o app Pulsar"
          className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            type="button"
            onClick={agoraNao}
            aria-label="Fechar"
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <img src="/pwa-192x192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Instale o app Pulsar</p>
              <p className="text-xs text-muted-foreground">
                Abra direto da tela inicial, em tela cheia e mais rápido.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={agoraNao}>Agora não</Button>
            <Button size="sm" onClick={clicarInstalar}>
              <Download className="h-4 w-4" /> Instalar
            </Button>
          </div>
        </div>
      )}

      <Drawer open={passosAbertos} onOpenChange={setPassosAbertos}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Instalar o Pulsar {iphone ? "no iPhone" : "no celular"}</DrawerTitle>
            <DrawerDescription>São só 3 toques, e é feito uma vez só.</DrawerDescription>
          </DrawerHeader>
          <ol className="space-y-4 px-4">
            {passos.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <p.icone className="h-5 w-5" />
                </span>
                <p className="pt-1.5 text-sm">
                  <span className="font-semibold">{i + 1}.</span> {p.texto}
                </p>
              </li>
            ))}
          </ol>
          <p className="mx-4 mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {iphone
              ? "Abriu o link pelo WhatsApp ou Instagram? Primeiro abra no Safari (pelo botão de compartilhar ou pelos três pontinhos) e siga os passos lá."
              : "Abriu o link pelo WhatsApp ou Instagram? Primeiro toque nos três pontinhos e em Abrir no Chrome, e siga os passos lá."}
          </p>
          <DrawerFooter>
            <Button onClick={() => setPassosAbertos(false)}>Entendi</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
