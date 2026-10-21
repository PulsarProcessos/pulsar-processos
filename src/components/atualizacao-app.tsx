import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

const UMA_HORA = 60 * 60 * 1000;

/**
 * Avisa quando uma versão nova do sistema foi publicada. Não recarrega sozinho para não
 * perder um formulário pela metade: o usuário clica em "Atualizar" quando puder.
 */
export function AtualizacaoApp() {
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      // O app pode ficar aberto por dias: procura versão nova a cada hora e sempre que
      // ele volta para a frente da tela.
      setInterval(() => registro.update(), UMA_HORA);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registro.update();
      });
    },
  });

  useEffect(() => {
    if (!precisaAtualizar) return;
    toast("Nova versão do Pulsar disponível", {
      id: "atualizacao-app",
      description: "Salve o que estiver fazendo e clique em Atualizar para ver as novidades.",
      duration: Infinity,
      action: { label: "Atualizar", onClick: () => updateServiceWorker(true) },
    });
  }, [precisaAtualizar, updateServiceWorker]);

  return null;
}
