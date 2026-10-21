import { useSyncExternalStore } from "react";

// O navegador (Chrome, Edge, Android) dispara "beforeinstallprompt" uma vez, logo no
// carregamento; guardamos o evento para oferecer "Instalar aplicativo" no menu depois.
// Safari no iPhone não tem esse evento: lá a instalação é por Compartilhar > Adicionar à Tela de Início.

type EventoInstalacao = Event & { prompt: () => Promise<void> };

let eventoGuardado: EventoInstalacao | null = null;
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
