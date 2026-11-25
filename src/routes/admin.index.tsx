import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Copy, KeyRound, MoreVertical, RotateCcw, ShieldCheck, Trash2, UserPlus, Wand2 } from "lucide-react";
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
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { MODULOS } from "@/lib/modulos";
import {
  MODULOS_LIBERAVEIS, SENHA_MIN, gerarSenha, useAlterarModulos, useBloquearUsuario,
  useCriarUsuario, useExcluirUsuario, useUsuarios, type ModuloLiberavel, type Usuario,
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
        {janela?.tipo === "senha" && <TrocarSenhaForm alvo={janela.usuario} onConcluir={fechar} />}
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
                  <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
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

function NovoUsuarioForm({ onConcluir }: { onConcluir: () => void }) {
  const criar = useCriarUsuario();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(gerarSenha);
  const [modulos, setModulos] = useState<ModuloLiberavel[]>([]);
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) { toast.error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`); return; }
    try {
      await criar.mutateAsync({ nome: nome.trim(), email: email.trim(), senha, modulos });
      setCriado({ email: email.trim().toLowerCase(), senha });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (criado) {
    const texto = `Acesso ao Pulsar\nSite: ${window.location.origin}\nLogin: ${criado.email}\nSenha: ${criado.senha}`;
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
          <DialogTitle>Usuário criado</DialogTitle>
          <DialogDescription>
            Envie estes dados para a pessoa. A senha não aparece de novo; se perder, use "Alterar senha".
          </DialogDescription>
        </DialogHeader>
        <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">{texto}</pre>
        <DialogFooter>
          <Button variant="outline" onClick={onConcluir}>Fechar</Button>
          <Button onClick={copiar}><Copy className="h-4 w-4" /> Copiar dados de acesso</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>A pessoa entra no Pulsar com este e-mail e esta senha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="u-nome">Nome</Label>
          <Input id="u-nome" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-email">E-mail (login)</Label>
          <Input id="u-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-senha">Senha</Label>
          <div className="flex gap-2">
            <Input id="u-senha" required minLength={SENHA_MIN} autoComplete="off" value={senha}
              onChange={(e) => setSenha(e.target.value)} className="font-mono" />
            <Button type="button" variant="outline" onClick={() => setSenha(gerarSenha())} title="Gerar outra senha">
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Mínimo de {SENHA_MIN} caracteres. A pessoa pode trocar depois.</p>
        </div>
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={criar.isPending}>Cancelar</Button>
          <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Criando..." : "Criar usuário"}</Button>
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
