import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, KeyRound, LogOut, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessao } from "@/components/auth-gate";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { GuiaCelular } from "@/components/guia-celular";
import { useInstalarApp } from "@/lib/instalar-app";
import { desativarNotificacoes } from "@/lib/notificacoes";

/** Bolinha com as iniciais: conta conectada, trocar a própria senha, instalar o app e sair. */
export function MenuUsuario() {
  const sessao = useSessao();
  const navigate = useNavigate();
  const instalarApp = useInstalarApp();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const email = sessao.user.email ?? "";
  const nome = (sessao.user.user_metadata?.full_name as string | undefined) ?? null;
  const iniciais = (nome || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "??";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Minha conta">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{iniciais}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="text-xs text-muted-foreground">Conectado como</div>
            {nome && <div className="truncate text-sm font-medium">{nome}</div>}
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTrocandoSenha(true)}>
            <KeyRound className="mr-2 h-4 w-4" /> Alterar minha senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGuiaAberto(true)}>
            <Smartphone className="mr-2 h-4 w-4" /> Usar no celular
          </DropdownMenuItem>
          {instalarApp && (
            <DropdownMenuItem onClick={instalarApp}>
              <Download className="mr-2 h-4 w-4" /> Instalar aplicativo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={async () => {
              // Volta ao Início antes de sair: a próxima pessoa não cai na tela de quem saiu.
              await navigate({ to: "/", replace: true });
              // Este aparelho para de receber os avisos de quem saiu.
              await desativarNotificacoes().catch((e) => console.error("desligar notificações", e));
              await supabase.auth.signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={trocandoSenha} onOpenChange={setTrocandoSenha}>
        {trocandoSenha && <TrocarSenhaForm alvo={{ email }} onConcluir={() => setTrocandoSenha(false)} />}
      </Dialog>
      <Dialog open={guiaAberto} onOpenChange={setGuiaAberto}>
        {guiaAberto && <GuiaCelular />}
      </Dialog>
    </>
  );
}
