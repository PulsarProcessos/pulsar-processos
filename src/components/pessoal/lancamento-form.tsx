import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  usePessoal, LancamentoPessoal, StatusPag, TipoMov,
} from "@/lib/pessoal-store";

const SEM_CATEGORIA = "__none__";

type Props = {
  editando?: LancamentoPessoal;
  dataPadrao: string;
  onConcluir: () => void;
};

/** Conteúdo da janela de novo lançamento / edição. O <Dialog> fica em quem usa. */
export function LancamentoForm({ editando, dataPadrao, onConcluir }: Props) {
  const { categorias, dividas, addLancamento, updateLancamento } = usePessoal();
  const divida = editando?.dividaId ? dividas.find((d) => d.id === editando.dividaId) : undefined;
  // Parcelas de dívida: descrição, tipo e categoria vêm da dívida.
  const ehParcela = !!editando?.dividaId;

  const [tipo, setTipo] = useState<TipoMov>(editando?.tipo ?? "Despesa");
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? dataPadrao);
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [status, setStatus] = useState<StatusPag>(editando?.status ?? "Pago");
  const [obs, setObs] = useState(editando?.obs ?? "");
  const [salvando, setSalvando] = useState(false);

  const cats = categorias.filter((c) => c.tipo === tipo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Informe um valor maior que zero."); return; }
    if (!data) { toast.error("Informe a data."); return; }

    setSalvando(true);
    const dados = ehParcela
      ? { valor: v, data, status, obs: obs.trim() }
      : { tipo, descricao: descricao.trim(), valor: v, data, status, categoriaId, obs: obs.trim() };
    const ok = editando
      ? await updateLancamento(editando.id, dados)
      : !!(await addLancamento(dados as Omit<LancamentoPessoal, "id">));
    setSalvando(false);
    if (ok) {
      toast.success(editando ? "Lançamento atualizado." : "Lançamento salvo.");
      onConcluir();
    }
  };

  const rotuloStatus = tipo === "Receita"
    ? { Pago: "Recebido", Pendente: "A receber" }
    : { Pago: "Pago", Pendente: "A pagar" };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          {ehParcela && (
            <DialogDescription>
              Parcela {editando?.parcelaNumero}/{divida?.totalParcelas ?? "?"} de {divida?.descricao ?? "uma dívida"}.
              Para mudar a descrição ou a quantidade de parcelas, edite a dívida na aba Dívidas.
            </DialogDescription>
          )}
        </DialogHeader>

        {!ehParcela && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoMov); setCategoriaId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Despesa">Saída (gasto)</SelectItem>
                    <SelectItem value="Receita">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={categoriaId || SEM_CATEGORIA}
                  onValueChange={(v) => setCategoriaId(v === SEM_CATEGORIA ? "" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-descricao">Descrição</Label>
              <Input id="pl-descricao" required value={descricao}
                onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Mercado, Farmácia" />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pl-valor">Valor (R$)</Label>
            <Input id="pl-valor" type="number" inputMode="decimal" min="0.01" step="0.01" required
              value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-data">{tipo === "Receita" ? "Data" : "Data / vencimento"}</Label>
            <Input id="pl-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Situação</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusPag)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pago">{rotuloStatus.Pago}</SelectItem>
              <SelectItem value="Pendente">{rotuloStatus.Pendente}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pl-obs">Observação</Label>
          <Textarea id="pl-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onConcluir} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
