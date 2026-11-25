import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Smartphone } from "lucide-react";
import pulsarLogo from "@/assets/pulsar-logo.png";
import { useSessao } from "@/components/auth-gate";
import { MenuUsuario } from "@/components/menu-usuario";
import { GuiaCelular } from "@/components/guia-celular";
import { Dialog } from "@/components/ui/dialog";
import { useAcesso } from "@/lib/modulos";

export const Route = createFileRoute("/")({
  component: Inicio,
});

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Tela inicial: um cartão para cada módulo liberado para a pessoa. */
function Inicio() {
  const sessao = useSessao();
  const acesso = useAcesso();
  const nome = (sessao.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const [guiaAberto, setGuiaAberto] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <img src={pulsarLogo} alt="Pulsar" className="h-9 w-9 object-contain" />
          <span className="text-sm font-bold tracking-[0.15em]">
            PULS<span className="text-primary">AR</span>
          </span>
        </div>
        <MenuUsuario />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {saudacao()}{nome ? `, ${nome}` : ""}!
        </h1>
        <p className="mt-1 text-muted-foreground">Escolha onde você quer trabalhar agora.</p>

        {acesso.carregando ? (
          <p className="mt-10 text-sm text-muted-foreground">Carregando...</p>
        ) : acesso.erro ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Não foi possível carregar os seus módulos. Verifique a internet e recarregue a página.
          </p>
        ) : acesso.modulos.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed bg-background p-8 text-center">
            <p className="font-medium">Nenhum módulo liberado ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Fale com o administrador para liberar o seu acesso.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {acesso.modulos.map((m) => (
              <Link
                key={m.id}
                to={m.rota}
                className={`group flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${m.cor.fundo}`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm ${m.cor.icone}`}>
                  <m.icone className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{m.nome}</span>
                  <span className="block text-sm text-muted-foreground">{m.descricao}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setGuiaAberto(true)}
          className="mt-6 flex w-full items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
        >
          <Smartphone className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="font-medium">Usar no celular</span>
            <span className="block text-xs text-muted-foreground">Passo a passo para instalar o app e ativar as notificações</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </main>

      <Dialog open={guiaAberto} onOpenChange={setGuiaAberto}>
        {guiaAberto && <GuiaCelular />}
      </Dialog>
    </div>
  );
}
