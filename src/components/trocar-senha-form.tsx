import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SENHA_MIN, chamarUsuarios, mensagemErroSenha } from "@/lib/usuarios";

type Props = {
  /** Quem vai ter a senha trocada. Sem user_id, é a própria pessoa conectada. */
  alvo: { id?: string; email: string };
  onConcluir: () => void;
};

/** Conteúdo da janela de troca de senha. O <Dialog> fica em quem usa. */
export function TrocarSenhaForm({ alvo, onConcluir }: Props) {
  const qc = useQueryClient();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const propria = !alvo.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MIN) { toast.error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`); return; }
    if (senha !== confirmacao) { toast.error("As senhas não conferem."); return; }
    setSalvando(true);
    try {
      if (propria) {
        // auth.updateUser mantém a sessão atual e encerra só as de outros aparelhos.
        // Pela rota de administrador o Supabase encerraria também esta sessão.
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw new Error(mensagemErroSenha(error.code));
      } else {
        await chamarUsuarios({ acao: "trocar_senha", user_id: alvo.id, senha });
        qc.invalidateQueries({ queryKey: ["usuarios"] });
      }
      toast.success(propria ? "Sua senha foi alterada." : `Senha de ${alvo.email} alterada.`);
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
          <DialogTitle>{propria ? "Alterar minha senha" : "Alterar senha"}</DialogTitle>
          <DialogDescription>
            {alvo.email}.{" "}
            {propria
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
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar senha"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
