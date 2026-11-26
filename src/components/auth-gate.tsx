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
import { CamposNovaSenha, salvarMinhaSenha } from "@/components/trocar-senha-form";

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
  // Entrou pelo link de "Esqueci minha senha": precisa criar uma senha nova antes de usar o app.
  const [recuperando, setRecuperando] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("type=recovery"),
  );
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
      // Link de recuperação vencido (sem sessão) ou saiu: a próxima entrada é um login normal.
      if (!id) setRecuperando(false);
      usuarioAnterior.current = id;
      setSession(s);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === "PASSWORD_RECOVERY") {
        setRecuperando(true);
        // Marca no cadastro também: se fechar a tela sem criar a senha, ela é pedida de novo.
        setTimeout(() => { supabase.auth.updateUser({ data: { trocar_senha: true } }); }, 0);
      }
      aplicar(s);
    });
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
  // Senha provisória (dada pelo administrador) ou link de recuperação: cria a senha antes de tudo.
  if (recuperando || session.user.user_metadata?.trocar_senha === true) {
    return <CriarSenhaPage email={session.user.email ?? ""} recuperacao={recuperando}
      onPronto={() => setRecuperando(false)} />;
  }
  // key: ao trocar de pessoa, toda a árvore é montada do zero (sem estado da anterior).
  return (
    <SessaoContext.Provider value={session} key={session.user.id}>
      {children}
    </SessaoContext.Provider>
  );
}

/** Moldura das telas de fora do app (login, esqueci a senha, criar senha). */
function TelaDeAcesso({ subtitulo, children, rodape = true }: { subtitulo: string; children: React.ReactNode; rodape?: boolean }) {
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
            <CardDescription>{subtitulo}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {rodape && (
        <a href="/privacidade.html" className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline">
          Política de privacidade
        </a>
      )}
    </div>
  );
}

function mensagemErroLogin(codigo: string | undefined) {
  if (codigo === "invalid_credentials") return "E-mail ou senha incorretos.";
  if (codigo === "user_banned") return "Este acesso está bloqueado. Fale com o administrador.";
  if (codigo === "over_request_rate_limit") return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  return "Não foi possível entrar. Verifique a internet e tente de novo.";
}

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Tela de "Esqueci minha senha"; "enviado" mostra a confirmação.
  const [esqueci, setEsqueci] = useState<"nao" | "pedindo" | "enviado">("nao");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(mensagemErroLogin(error.code));
  };

  const pedirLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setBusy(false);
    // A mesma resposta para e-mail cadastrado ou não: a tela não revela quem tem conta.
    if (error && error.code === "over_email_send_rate_limit") {
      toast.error("Muitos pedidos seguidos. Espere alguns minutos e tente de novo.");
      return;
    }
    if (error) console.error("recuperação de senha", error);
    setEsqueci("enviado");
  };

  if (esqueci === "enviado") {
    return (
      <TelaDeAcesso subtitulo="Esqueci minha senha">
        <div className="space-y-4 text-center text-sm">
          <p>
            Se <strong>{email.trim()}</strong> tiver acesso ao Pulsar, chega nele um e-mail com um link para
            criar uma nova senha.
          </p>
          <p className="text-muted-foreground">Não chegou em alguns minutos? Confira a caixa de spam.</p>
          <Button variant="outline" className="w-full" onClick={() => setEsqueci("nao")}>Voltar para o login</Button>
        </div>
      </TelaDeAcesso>
    );
  }

  if (esqueci === "pedindo") {
    return (
      <TelaDeAcesso subtitulo="Esqueci minha senha">
        <form onSubmit={pedirLink} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Digite o e-mail que você usa para entrar. Vamos mandar um link para você criar uma nova senha.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="esqueci-email">E-mail</Label>
            <Input id="esqueci-email" type="email" required autoFocus value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Enviando..." : "Enviar link"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setEsqueci("nao")}>
            Voltar para o login
          </Button>
        </form>
      </TelaDeAcesso>
    );
  }

  return (
    <TelaDeAcesso subtitulo="Acesse sua conta para continuar">
      {/* Sem cadastro pelo site: usuários novos são criados na Administração. */}
      <form onSubmit={handleLogin} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">E-mail</Label>
          <Input id="login-email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="login-password">Senha</Label>
            <button type="button" onClick={() => setEsqueci("pedindo")}
              className="text-xs text-primary underline-offset-4 hover:underline">
              Esqueci minha senha
            </button>
          </div>
          <Input id="login-password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </TelaDeAcesso>
  );
}

/** Primeiro acesso com senha provisória, ou volta pelo link de recuperação: cria a senha da pessoa. */
function CriarSenhaPage({ email, recuperacao, onPronto }: { email: string; recuperacao: boolean; onPronto: () => void }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarMinhaSenha(senha, confirmacao);
      toast.success("Senha criada. Bem-vindo ao Pulsar!");
      onPronto();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaDeAcesso subtitulo={recuperacao ? "Crie uma nova senha" : "Crie a sua senha"} rodape={false}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {recuperacao
            ? `Digite a nova senha de ${email} para voltar a usar o Pulsar.`
            : `Você entrou com uma senha provisória. Agora crie a sua, que só você vai saber.`}
        </p>
        <CamposNovaSenha senha={senha} confirmacao={confirmacao} onSenha={setSenha} onConfirmacao={setConfirmacao} />
        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar e entrar"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
          Sair
        </Button>
      </form>
    </TelaDeAcesso>
  );
}
