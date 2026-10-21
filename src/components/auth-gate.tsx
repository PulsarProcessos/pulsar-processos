import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import pulsarLogo from "@/assets/pulsar-logo.png";

type AuthGateProps = {
  children: React.ReactNode;
  onSession?: (session: Session | null) => void;
};

export function AuthGate({ children, onSession }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      onSession?.(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      onSession?.(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [onSession]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  return <>{children}</>;
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
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
    </div>
  );
}
