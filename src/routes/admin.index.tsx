import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle, Ban, CheckCircle2, Copy, KeyRound, MoreVertical, RotateCcw, ShieldCheck, Trash2, UserPlus, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessao } from "@/components/auth-gate";
import { MODULOS } from "@/lib/modulos";
import {
  MODULOS_LIBERAVEIS, SENHA_MIN, gerarSenha, useAlterarModulos, useBloquearUsuario,
  useCriarUsuario, useExcluirUsuario, useSenhaProvisoria, useUsuarios,
  type ModuloLiberavel, type ResultadoAcesso, type Usuario,
} from "@/lib/usuarios";

export const Route = createFileRoute("/admin/")({
  component: Usuarios,
});

function formatarAcesso(data: string | null) {
  if (!data) return "Nunca entrou";
  return `Último acesso em ${new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}

type Janela =
  | { tipo: "novo" }
  | { tipo: "senha"; usuario: Usuario }
  | { tipo: "excluir"; usuario: Usuario }
  | null;

function Usuarios() {
  const sessao = useSessao();
  const lista = useUsuarios();
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pessoas com acesso</h2>
          <p className="text-sm text-muted-foreground">
            Crie o login de cada pessoa e escolha quais módulos ela pode usar.
          </p>
        </div>
        <Button onClick={() => setJanela({ tipo: "novo" })}>
          <UserPlus className="h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <div className="flex gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Cada pessoa vê só os próprios dados, e só dos módulos liberados. Nem o administrador enxerga os
          lançamentos dos outros: aqui você controla apenas o acesso.
        </p>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {lista.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : lista.isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{(lista.error as Error).message}</p>
          ) : (
            <div className="divide-y divide-border/60">
              {lista.data!.usuarios.map((u) => (
                <LinhaUsuario
                  key={u.id}
                  usuario={u}
                  souEu={u.id === sessao.user.id}
                  onSenha={() => setJanela({ tipo: "senha", usuario: u })}
                  onExcluir={() => setJanela({ tipo: "excluir", usuario: u })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!janela} onOpenChange={(v) => { if (!v) fechar(); }}>
        {janela?.tipo === "novo" && <NovoUsuarioForm onConcluir={fechar} />}
        {janela?.tipo === "senha" && <SenhaProvisoriaForm usuario={janela.usuario} onConcluir={fechar} />}
        {janela?.tipo === "excluir" && <ExcluirUsuarioForm usuario={janela.usuario} onConcluir={fechar} />}
      </Dialog>
    </div>
  );
}

function LinhaUsuario({ usuario: u, souEu, onSenha, onExcluir }: {
  usuario: Usuario;
  souEu: boolean;
  onSenha: () => void;
  onExcluir: () => void;
}) {
  const alterarModulos = useAlterarModulos();
  const bloquear = useBloquearUsuario();

  const alternar = async (m: ModuloLiberavel, ligar: boolean) => {
    const modulos = ligar ? [...u.modulos, m] : u.modulos.filter((x) => x !== m);
    try {
      await alterarModulos.mutateAsync({ user_id: u.id, modulos });
      toast.success(`${MODULOS[m].nome} ${ligar ? "liberado" : "retirado"} para ${u.nome ?? u.email}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const alternarBloqueio = async () => {
    if (!u.bloqueado && !confirm(`Bloquear ${u.nome ?? u.email}? A pessoa perde o acesso na hora.`)) return;
    try {
      await bloquear.mutateAsync({ user_id: u.id, bloquear: !u.bloqueado });
      toast.success(u.bloqueado ? "Acesso desbloqueado." : "Acesso bloqueado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className={`flex flex-col gap-3 p-4 md:flex-row md:items-center ${u.bloqueado ? "bg-red-500/5" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="truncate">{u.nome ?? u.email}</span>
          {souEu && <Badge variant="secondary">Você</Badge>}
          {u.admin && <Badge variant="outline">Administrador</Badge>}
          {u.bloqueado && <Badge variant="destructive">Bloqueado</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {u.nome ? `${u.email} · ` : ""}{formatarAcesso(u.ultimo_acesso)}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {MODULOS_LIBERAVEIS.map((m) => (
          <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={u.modulos.includes(m)}
              disabled={alterarModulos.isPending}
              onCheckedChange={(v) => alternar(m, v)}
              aria-label={`Módulo ${MODULOS[m].nome}`}
            />
            {MODULOS[m].nome}
          </label>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {souEu ? (
              <DropdownMenuItem disabled>Use o menu da sua conta para trocar a sua senha</DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={onSenha}>
                  <KeyRound className="mr-2 h-4 w-4" /> Nova senha provisória
                </DropdownMenuItem>
                <DropdownMenuItem onClick={alternarBloqueio}>
                  {u.bloqueado
                    ? <><RotateCcw className="mr-2 h-4 w-4" /> Desbloquear</>
                    : <><Ban className="mr-2 h-4 w-4" /> Bloquear acesso</>}
                </DropdownMenuItem>
                {!u.admin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onExcluir} className="text-red-600 focus:text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir usuário
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// O link do acesso é sempre o do site publicado, mesmo quando o cadastro é feito pela prévia.
const SITE = "https://pulsar.devalorepulsar.com.br";

/** Depois de criar a conta ou dar senha nova: se o e-mail foi, e os dados para copiar. */
function AcessoEnviado({ titulo, email, senha, resultado, onConcluir }: {
  titulo: string; email: string; senha: string; resultado: ResultadoAcesso; onConcluir: () => void;
}) {
  const texto = `Acesso ao Pulsar\nSite: ${SITE}\nLogin: ${email}\nSenha provisória: ${senha}\n\nNo primeiro acesso, o Pulsar pede para criar a sua própria senha.`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Dados de acesso copiados.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie.");
    }
  };
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>A senha é provisória: no próximo acesso, a pessoa cria a dela.</DialogDescription>
      </DialogHeader>
      {resultado.email_enviado ? (
        <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          E-mail enviado para {email}, com o login, a senha provisória e o link de acesso.
        </p>
      ) : resultado.email_erro ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          O e-mail não foi enviado ({resultado.email_erro}). Copie os dados abaixo e envie para a pessoa.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Copie os dados abaixo e envie para a pessoa. A senha não aparece de novo.</p>
      )}
      <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{texto}</pre>
      <DialogFooter>
        <Button variant="outline" onClick={onConcluir}>Fechar</Button>
        <Button onClick={copiar}><Copy className="h-4 w-4" /> Copiar dados de acesso</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Opção de mandar o acesso por e-mail; desligada (com o motivo) se o envio não foi configurado. */
function EnviarPorEmail({ ligado, onChange }: { ligado: boolean; onChange: (v: boolean) => void }) {
  const configurado = useUsuarios().data?.email_configurado ?? false;
  return (
    <label className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${configurado ? "cursor-pointer" : "opacity-60"}`}>
      <span>
        <span className="block text-sm font-medium">Enviar o acesso por e-mail</span>
        <span className="block text-xs text-muted-foreground">
          {configurado
            ? "A pessoa recebe o login, a senha provisória e o link do Pulsar."
            : "O envio de e-mail ainda não foi configurado. Copie os dados depois de salvar."}
        </span>
      </span>
      <Switch checked={configurado && ligado} disabled={!configurado} onCheckedChange={onChange} />
    </label>
  );
}

function NovoUsuarioForm({ onConcluir }: { onConcluir: () => void }) {
  const criar = useCriarUsuario();
  const configurado = useUsuarios().data?.email_configurado ?? false;
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(gerarSenha);
  const [modulos, setModulos] = useState<ModuloLiberavel[]>([]);
  const [enviar, setEnviar] = useState(true);
  const [criado, setCriado] = useState<{ email: string; senha: string; resultado: ResultadoAcesso } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) { toast.error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`); return; }
    try {
      const resultado = await criar.mutateAsync({
        nome: nome.trim(), email: email.trim(), senha, modulos, enviar_email: configurado && enviar,
      });
      setCriado({ email: email.trim().toLowerCase(), senha, resultado });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (criado) {
    return <AcessoEnviado titulo="Usuário criado" email={criado.email} senha={criado.senha}
      resultado={criado.resultado} onConcluir={onConcluir} />;
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>A pessoa entra com este e-mail e a senha provisória, e cria a dela no primeiro acesso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="u-nome">Nome</Label>
          <Input id="u-nome" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-email">E-mail (login)</Label>
          <Input id="u-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <CampoSenha senha={senha} onChange={setSenha} />
        <div className="space-y-2">
          <Label>Módulos liberados</Label>
          {MODULOS_LIBERAVEIS.map((m) => (
            <label key={m} className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2">
              <span>
                <span className="block text-sm font-medium">{MODULOS[m].nome}</span>
                <span className="block text-xs text-muted-foreground">{MODULOS[m].descricao}</span>
              </span>
              <Switch
                checked={modulos.includes(m)}
                onCheckedChange={(v) => setModulos((p) => (v ? [...p, m] : p.filter((x) => x !== m)))}
              />
            </label>
          ))}
        </div>
        <EnviarPorEmail ligado={enviar} onChange={setEnviar} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={criar.isPending}>Cancelar</Button>
          <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Criando..." : "Criar usuário"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function CampoSenha({ senha, onChange }: { senha: string; onChange: (s: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="u-senha">Senha provisória</Label>
      <div className="flex gap-2">
        <Input id="u-senha" required minLength={SENHA_MIN} autoComplete="off" value={senha}
          onChange={(e) => onChange(e.target.value)} className="font-mono" />
        <Button type="button" variant="outline" onClick={() => onChange(gerarSenha())} title="Gerar outra senha">
          <Wand2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Mínimo de {SENHA_MIN} caracteres. No primeiro acesso, a pessoa cria a dela.</p>
    </div>
  );
}

function SenhaProvisoriaForm({ usuario, onConcluir }: { usuario: Usuario; onConcluir: () => void }) {
  const trocar = useSenhaProvisoria();
  const configurado = useUsuarios().data?.email_configurado ?? false;
  const [senha, setSenha] = useState(gerarSenha);
  const [enviar, setEnviar] = useState(true);
  const [feito, setFeito] = useState<ResultadoAcesso | null>(null);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) { toast.error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`); return; }
    try {
      setFeito(await trocar.mutateAsync({ user_id: usuario.id, senha, enviar_email: configurado && enviar }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (feito) {
    return <AcessoEnviado titulo="Senha provisória definida" email={usuario.email} senha={senha}
      resultado={feito} onConcluir={onConcluir} />;
  }

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={salvar} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Nova senha provisória</DialogTitle>
          <DialogDescription>
            {usuario.nome ? `${usuario.nome} · ` : ""}{usuario.email}. A pessoa é desconectada e, ao entrar com
            esta senha, cria uma nova.
          </DialogDescription>
        </DialogHeader>
        <CampoSenha senha={senha} onChange={setSenha} />
        <EnviarPorEmail ligado={enviar} onChange={setEnviar} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={trocar.isPending}>Cancelar</Button>
          <Button type="submit" disabled={trocar.isPending}>{trocar.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ExcluirUsuarioForm({ usuario, onConcluir }: { usuario: Usuario; onConcluir: () => void }) {
  const excluir = useExcluirUsuario();
  const [confirmacao, setConfirmacao] = useState("");
  const confere = confirmacao.trim().toLowerCase() === usuario.email.toLowerCase();

  const apagar = async () => {
    try {
      await excluir.mutateAsync({ user_id: usuario.id });
      toast.success("Usuário excluído, com todos os dados dele.");
      onConcluir();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Excluir {usuario.nome ?? usuario.email}?</DialogTitle>
        <DialogDescription>
          A conta e <strong>todos os dados</strong> dessa pessoa (lançamentos, dívidas, cadastros) serão
          apagados para sempre. Se a ideia é só tirar o acesso, use "Bloquear acesso".
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="confirma-email">Para confirmar, digite o e-mail: {usuario.email}</Label>
        <Input id="confirma-email" autoComplete="off" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onConcluir} disabled={excluir.isPending}>Cancelar</Button>
        <Button variant="destructive" onClick={apagar} disabled={!confere || excluir.isPending}>
          {excluir.isPending ? "Excluindo..." : "Excluir para sempre"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
