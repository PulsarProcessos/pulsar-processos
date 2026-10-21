import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/configuracoes")({
  component: Configuracoes,
});

type Usuario = { id: string; email: string; nome: string | null; ultimo_acesso: string | null };

const SENHA_MIN = 8;

// A troca de senha de outros usuários precisa da chave secreta do Supabase,
// por isso passa pela Edge Function "usuarios" (supabase/functions/usuarios).
async function chamarUsuarios<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("usuarios", { body });
  if (error) {
    let mensagem = "Não foi possível falar com o servidor. Tente novamente.";
    if (error instanceof FunctionsHttpError) {
      const corpo = await error.context.json().catch(() => null);
      if (corpo?.erro) mensagem = corpo.erro;
    }
    throw new Error(mensagem);
  }
  return data as T;
}

function mensagemErroSenha(codigo: string | undefined) {
  if (codigo === "same_password") return "A nova senha precisa ser diferente da atual.";
  if (codigo === "weak_password") return "Senha fraca. Use letras, números e símbolos.";
  return "Não foi possível alterar a senha.";
}

function formatarAcesso(data: string | null) {
  if (!data) return "Nunca acessou";
  return `Último acesso em ${new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}

function UsuariosCard() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [admin, setAdmin] = useState(false);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [trocando, setTrocando] = useState<Usuario | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMeuId(data.session?.user.id ?? null));
    chamarUsuarios<{ admin: boolean; usuarios: Usuario[] }>({ acao: "listar" })
      .then((r) => {
        setAdmin(r.admin);
        setUsuarios(r.usuarios);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <Card className="border-border/60 lg:col-span-2">
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>
          {admin ? "Altere a senha de acesso de qualquer usuário" : "Altere a sua senha de acesso"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {usuarios.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{u.nome ?? u.email}</span>
                    {u.id === meuId && <Badge variant="secondary">Você</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.nome ? `${u.email} · ` : ""}
                    {formatarAcesso(u.ultimo_acesso)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTrocando(u)}>
                  <KeyRound className="h-4 w-4" />
                  Alterar senha
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!trocando} onOpenChange={(v) => { if (!v) setTrocando(null); }}>
        {trocando && (
          <TrocarSenhaForm
            usuario={trocando}
            ehVoce={trocando.id === meuId}
            onConcluir={() => setTrocando(null)}
          />
        )}
      </Dialog>
    </Card>
  );
}

function TrocarSenhaForm({
  usuario,
  ehVoce,
  onConcluir,
}: {
  usuario: Usuario;
  ehVoce: boolean;
  onConcluir: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) {
      toast.error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    try {
      if (ehVoce) {
        // auth.updateUser mantém a sessão atual e encerra só as de outros aparelhos.
        // Pela rota de administrador o Supabase encerraria também esta sessão.
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw new Error(mensagemErroSenha(error.code));
      } else {
        await chamarUsuarios({ acao: "trocar_senha", user_id: usuario.id, senha });
      }
      toast.success(`Senha de ${usuario.email} alterada.`);
      onConcluir();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            {usuario.email}.{" "}
            {ehVoce
              ? "Você continua conectado neste aparelho; nos outros será preciso entrar de novo."
              : "A pessoa será desconectada e precisará entrar com a nova senha."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <Input id="nova-senha" type="password" autoComplete="new-password" required
            minLength={SENHA_MIN} value={senha} onChange={(e) => setSenha(e.target.value)} />
          <p className="text-xs text-muted-foreground">Mínimo de {SENHA_MIN} caracteres</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
          <Input id="confirmar-senha" type="password" autoComplete="new-password" required
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar senha"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Configuracoes() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <UsuariosCard />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" defaultValue="Ana Carolina" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" defaultValue="ana@pulsar.app" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" defaultValue="Head de Operações" />
          </div>
          <Button>Salvar alterações</Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>Notificações e comportamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { l: "Resumo diário por e-mail", d: "Receber métricas todo dia às 8h" },
            { l: "Alertas de metas", d: "Notificar quando metas atingirem 80%" },
            { l: "Novidades do produto", d: "Receber atualizações da Pulsar" },
          ].map((p, i) => (
            <div key={p.l}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.l}</p>
                  <p className="text-xs text-muted-foreground">{p.d}</p>
                </div>
                <Switch defaultChecked={i !== 2} />
              </div>
              {i < 2 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
