import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useData, LancStatus } from "@/lib/data-store";
import { hojeISO } from "@/lib/pessoal-store";

const NENHUM = "__none__";

/**
 * Ponte do Comercial para o Financeiro: quando um negócio é ganho, oferece lançar a receita no
 * Extrato já preenchida com cliente e valor. O <Dialog> fica em quem usa.
 */
export function ReceitaDoNegocio({ negocio, onConcluir }: {
  negocio: { cliente: string; titulo: string; valor: number };
  onConcluir: () => void;
}) {
  const { categorias, bancos, contatos, addLancamento } = useData();
  const navigate = useNavigate();
  const catsReceita = categorias.filter((c) => c.tipo === "Receita");
  const contas = bancos.filter((b) => b.tipo === "Conta");
  const nomeCliente = negocio.cliente.trim().toLowerCase();
  const contato = contatos.find((c) => c.tipo === "Cliente" && c.nome.trim().toLowerCase() === nomeCliente);

  const [descricao, setDescricao] = useState(`${negocio.titulo} — ${negocio.cliente}`);
  const [valor, setValor] = useState(negocio.valor > 0 ? String(negocio.valor) : "");
  const [data, setData] = useState(hojeISO());
  const [categoriaId, setCategoriaId] = useState(catsReceita[0]?.id ?? "");
  const [bancoId, setBancoId] = useState(contas[0]?.id ?? "");
  const [status, setStatus] = useState<LancStatus>("Pendente");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe um valor maior que zero."); return; }
    if (!data) { toast.error("Informe a data."); return; }
    setSalvando(true);
    const novo = await addLancamento({
      data, desc: descricao.trim(), tipo: "Receita", valor: v, status,
      categoriaId, bancoId: bancoId || undefined, contatoId: contato?.id,
    });
    setSalvando(false);
    if (!novo) return;
    toast.success("Receita lançada no Extrato.", {
      action: { label: "Ver extrato", onClick: () => navigate({ to: "/empreendedor/financeiro/lancamentos" }) },
    });
    onConcluir();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={salvar} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Venda fechada! Lançar a receita?</DialogTitle>
          <DialogDescription>
            Para a venda aparecer no Financeiro, registre quanto e quando você vai receber.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rn-desc">Descrição</Label>
          <Input id="rn-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={160} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rn-valor">Valor (R$)</Label>
            <Input id="rn-valor" type="number" inputMode="decimal" min="0.01" step="0.01"
              value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rn-data">Data do recebimento</Label>
            <Input id="rn-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoriaId || NENHUM} onValueChange={(v) => setCategoriaId(v === NENHUM ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Sem categoria</SelectItem>
                {catsReceita.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Select value={bancoId || NENHUM} onValueChange={(v) => setBancoId(v === NENHUM ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Sem conta</SelectItem>
                {contas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Situação</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LancStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendente">A receber</SelectItem>
              <SelectItem value="Pago">Já recebi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {contato && (
          <p className="text-xs text-muted-foreground">Ligada ao cliente {contato.nome}, dos Cadastros do Financeiro.</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Agora não</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Lançando..." : "Lançar no Financeiro"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
