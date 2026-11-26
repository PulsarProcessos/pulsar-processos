import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SENHA_MIN, mensagemErroSenha } from "@/lib/usuarios";

/**
 * Grava a nova senha da pessoa conectada e tira a marca de senha provisória.
 * auth.updateUser mantém a sessão atual e encerra só as de outros aparelhos (pela rota de
 * administrador o Supabase encerraria também esta).
 */
export async function salvarMinhaSenha(senha: string, confirmacao: string) {
  if (senha.length < SENHA_MIN) throw new Error(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
  if (senha !== confirmacao) throw new Error("As senhas não conferem.");
  const { error } = await supabase.auth.updateUser({ password: senha, data: { trocar_senha: false } });
  if (error) throw new Error(mensagemErroSenha(error.code));
}

/** Os dois campos de senha, iguais na janela do menu e na tela de criar a senha. */
export function CamposNovaSenha({ senha, confirmacao, onSenha, onConfirmacao }: {
  senha: string; confirmacao: string; onSenha: (s: string) => void; onConfirmacao: (s: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="nova-senha">Nova senha</Label>
        <Input id="nova-senha" type="password" autoComplete="new-password" required
          minLength={SENHA_MIN} value={senha} onChange={(e) => onSenha(e.target.value)} />
        <p className="text-xs text-muted-foreground">Mínimo de {SENHA_MIN} caracteres</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
        <Input id="confirmar-senha" type="password" autoComplete="new-password" required
          value={confirmacao} onChange={(e) => onConfirmacao(e.target.value)} />
      </div>
    </>
  );
}

/** Janela "Alterar minha senha" do menu da conta. O <Dialog> fica em quem usa. */
export function TrocarSenhaForm({ email, onConcluir }: { email: string; onConcluir: () => void }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarMinhaSenha(senha, confirmacao);
      toast.success("Sua senha foi alterada.");
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
          <DialogTitle>Alterar minha senha</DialogTitle>
          <DialogDescription>
            {email}. Você continua conectado neste aparelho; nos outros será preciso entrar de novo.
          </DialogDescription>
        </DialogHeader>
        <CamposNovaSenha senha={senha} confirmacao={confirmacao} onSenha={setSenha} onConfirmacao={setConfirmacao} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar senha"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
