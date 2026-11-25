import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import pulsarLogo from "@/assets/pulsar-logo.png";
import { limparAssinaturaDeOutraPessoa } from "@/lib/notificacoes";

const SessaoContext = createContext<Session | null>(null);

/** Sessão de quem está conectado. Só existe dentro do AuthGate (ou seja, sempre logado). */
export function useSessao(): Session {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error("useSessao precisa estar dentro do AuthGate");
  return sessao;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const usuarioAnterior = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const aplicar = (s: Session | null) => {
      const id = s?.user.id ?? null;
      if (usuarioAnterior.current !== undefined && usuarioAnterior.current !== id) {
        // Trocou de pessoa (ou saiu) no mesmo aparelho: nada do usuário anterior pode ficar na memória.
        queryClient.clear();
        // Quem acabou de entrar começa no Início, não na última tela de quem usou antes.
        if (id) router.navigate({ to: "/", replace: true });
      }
      // O aparelho não pode continuar recebendo avisos de outra pessoa. Fora do callback do
      // Supabase (chamar o banco dentro dele pode travar a sessão).
      if (id && usuarioAnterior.current !== id) setTimeout(() => limparAssinaturaDeOutraPessoa(), 0);
      usuarioAnterior.current = id;
      setSession(s);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => aplicar(s));
    supabase.auth.getSession().then(({ data }) => {
      aplicar(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  // key: ao trocar de pessoa, toda a árvore é montada do zero (sem estado da anterior).
  return (
    <SessaoContext.Provider value={session} key={session.user.id}>
      {children}
    </SessaoContext.Provider>
  );
}

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center">
            <img src={pulsarLogo} alt="Pulsar" className="h-full w-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">
              PULS<span className="text-primary">AR</span>
            </CardTitle>
            <CardDescription>Acesse sua conta para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sem cadastro pelo site: usuários novos são criados no painel do Supabase. */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-mail</Label>
              <Input id="login-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <Input id="login-password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <a href="/privacidade.html" className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline">
        Política de privacidade
      </a>
    </div>
  );
}
