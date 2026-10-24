import { useSyncExternalStore } from "react";

// O navegador (Chrome, Edge, Samsung no Android) dispara "beforeinstallprompt" quando o app
// pode ser instalado; guardamos o evento para abrir a instalação num toque depois.
// Safari no iPhone não tem esse evento: lá a instalação é por Compartilhar > Adicionar à Tela de Início.

type EventoInstalacao = Event & { prompt: () => Promise<void> };

let eventoGuardado: EventoInstalacao | null = null;
let instaladoAgora = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    instaladoAgora = true;
    avisar();
  });
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Função para abrir a instalação, ou null quando o navegador não oferece (ou já instalou). */
export function useInstalarApp(): (() => Promise<void>) | null {
  const evento = useSyncExternalStore(assinar, () => eventoGuardado);
  if (!evento) return null;
  return async () => {
    await evento.prompt();
    eventoGuardado = null;
    avisar();
  };
}

/** Verdadeiro quando o sistema está aberto como app instalado (ou acabou de ser instalado). */
export function useAppInstalado(): boolean {
  return useSyncExternalStore(assinar, () => instaladoAgora || abertoComoApp());
}

function abertoComoApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type Plataforma = "ios" | "android" | "outro";

// Usado pela prévia em moldura de celular (preview/celular.html), só no modo de prévia.
export const CHAVE_SIMULAR_PLATAFORMA = "pulsar-simular-plataforma";

export function detectarPlataforma(): Plataforma {
  if (import.meta.env.DEV) {
    const simulada = sessionStorage.getItem(CHAVE_SIMULAR_PLATAFORMA);
    if (simulada === "ios" || simulada === "android") return simulada;
  }
  const ua = navigator.userAgent;
  // iPad com iPadOS se apresenta como Mac, mas tem tela de toque.
  const ipad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || ipad) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "outro";
}
