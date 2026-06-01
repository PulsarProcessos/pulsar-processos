import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useData, Lancamento, LancStatus, LancTipo, Rateio, Transferencia,
} from "@/lib/data-store";

export const Route = createFileRoute("/financeiro/lancamentos")({
  component: Lancamentos,
});

function Lancamentos() {
  const { lancamentos, categorias, contatos, bancos, saldoBanco, removeLancamento } = useData();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBanco, setFiltroBanco] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const filtered = useMemo(
    () =>
      lancamentos.filter(
        (r) =>
          (filtroTipo === "todos" || r.tipo === filtroTipo) &&
          (filtroCat === "todas" || r.categoriaId === filtroCat) &&
          (filtroStatus === "todos" || r.status === filtroStatus) &&
          (filtroBanco === "todos" || r.bancoId === filtroBanco),
      ),
    [lancamentos, filtroTipo, filtroCat, filtroStatus, filtroBanco],
  );

  const catName = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const contName = (id?: string) =>
    id ? contatos.find((c) => c.id === id)?.nome ?? "—" : "—";
  const bancoName = (id?: string) =>
    id ? bancos.find((b) => b.id === id)?.nome ?? "—" : "—";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie clientes, fornecedores, bancos e plano de contas em{" "}
        <Link to="/financeiro/cadastros" className="text-primary underline">
          Cadastros
        </Link>
        .
      </p>

      {bancos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {bancos.map((b) => {
            const s = saldoBanco(b.id);
            return (
              <Card key={b.id} className="border-border/60">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">{b.nome}</p>
                  <p className={`text-lg font-semibold ${s < 0 ? "text-red-500" : "text-foreground"}`}>
                    R$ {s.toLocaleString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={filtroCat} onValueChange={setFiltroCat}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banco</Label>
              <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <TransferenciaDialog />
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditando(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditando(null)}>
                  <Plus className="h-4 w-4" /> Novo Lançamento
                </Button>
              </DialogTrigger>
              <LancamentoForm
                key={editando?.id ?? "novo"}
                editando={editando}
                onClose={() => setOpen(false)}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente / Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{r.data}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{r.desc}</span>
                      {r.parcelaTotal ? (
                        <Badge variant="outline" className="text-[10px]">
                          {r.parcelaNumero}/{r.parcelaTotal}
                        </Badge>
                      ) : null}
                      {r.rateios && r.rateios.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Layers className="h-3 w-3" /> Rateado
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{contName(r.contatoId)}</TableCell>
                  <TableCell><Badge variant="outline">{catName(r.categoriaId)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{bancoName(r.bancoId)}</TableCell>
                  <TableCell>
                    {r.tipo === "Receita" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">Receita</Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-0">Despesa</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${r.tipo === "Receita" ? "text-emerald-600" : "text-red-500"}`}>
                    {r.tipo === "Receita" ? "+" : "−"} R$ {r.valor.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {r.status === "Pendente" ? (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">Pendente</Badge>
                    ) : (
                      <Badge variant="secondary">Pago</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditando(r); setOpen(true); }}
                      ><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                        onClick={() => removeLancamento(r.id)}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransferenciasTable />
    </div>
  );
}

type ParcelaPreview = { numero: number; data: string; valor: number };

function LancamentoForm({
  editando, onClose,
}: { editando: Lancamento | null; onClose: () => void }) {
  const {
    categorias, contatos, bancos,
    addLancamento, updateLancamento, addParcelamento,
  } = useData();
  const [tipo, setTipo] = useState<LancTipo>(editando?.tipo ?? "Despesa");
  const [desc, setDesc] = useState(editando?.desc ?? "");
  const [valor, setValor] = useState(editando ? String(editando.valor) : "");
  const [data, setData] = useState(editando?.data ?? new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState(editando?.categoriaId ?? "");
  const [contatoId, setContatoId] = useState(editando?.contatoId ?? "");
  const [bancoId, setBancoId] = useState(editando?.bancoId ?? "");
  const [status, setStatus] = useState<LancStatus>(editando?.status ?? "Pago");

  // Parcelamento
  const [parcelar, setParcelar] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [parcelasCustom, setParcelasCustom] = useState<ParcelaPreview[]>([]);

  // Rateio
  const [habilitarRateio, setHabilitarRateio] = useState(
    (editando?.rateios?.length ?? 0) > 0,
  );
  const [rateios, setRateios] = useState<Rateio[]>(
    editando?.rateios && editando.rateios.length > 0
      ? editando.rateios.map((r) => ({
          categoriaId: r.categoriaId,
          valor: r.valor,
          percentual: r.percentual,
          descricao: r.descricao,
        }))
      : [{ categoriaId: "", valor: 0 }, { categoriaId: "", valor: 0 }],
  );

  const [erro, setErro] = useState("");

  const isEdit = Boolean(editando);
  const catsFiltradas = categorias.filter((c) => c.tipo === tipo);
  const contatosFiltrados = contatos.filter((c) =>
    tipo === "Receita" ? c.tipo === "Cliente" : c.tipo === "Fornecedor",
  );

  const valorNum = Number(valor) || 0;

  // Build / sync parcelas preview when valor/parcelas/data change
  const recomputeParcelas = (v: number, n: number, primeira: string) => {
    if (!primeira || n < 2) { setParcelasCustom([]); return; }
    const vp = Math.round((v / n) * 100) / 100;
    const resto = Math.round((v - vp * n) * 100) / 100;
    const [y, m, d] = primeira.split("-").map(Number);
    const list: ParcelaPreview[] = Array.from({ length: n }).map((_, i) => {
      const dt = new Date(y, (m - 1) + i, d);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return { numero: i + 1, data: dateStr, valor: i === n - 1 ? vp + resto : vp };
    });
    setParcelasCustom(list);
  };

  const togglePar = (v: boolean) => {
    setParcelar(v);
    if (v) recomputeParcelas(valorNum, parcelas, data);
    else setParcelasCustom([]);
  };

  const setParcelaData = (idx: number, novaData: string) => {
    setParcelasCustom((prev) => prev.map((p, i) => i === idx ? { ...p, data: novaData } : p));
  };

  const totalRateio = rateios.reduce((s, r) => s + (Number(r.valor) || 0), 0);

  const addRateio = () => setRateios((r) => [...r, { categoriaId: "", valor: 0 }]);
  const removeRateio = (i: number) => setRateios((r) => r.filter((_, idx) => idx !== i));
  const updateRateio = (i: number, patch: Partial<Rateio>) =>
    setRateios((r) => r.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const submit = async () => {
    setErro("");
    if (!desc.trim()) return setErro("Informe a descrição.");
    if (valorNum <= 0) return setErro("Valor deve ser positivo.");
    if (!data) return setErro("Informe a data.");
    if (!habilitarRateio && !categoriaId) return setErro("Selecione a categoria.");
    if (habilitarRateio) {
      if (rateios.length < 2) return setErro("Adicione ao menos 2 rateios.");
      if (rateios.some((r) => !r.categoriaId)) return setErro("Cada rateio precisa de categoria.");
      if (Math.abs(totalRateio - valorNum) > 0.01) {
        return setErro(`Soma dos rateios (R$ ${totalRateio.toFixed(2)}) deve ser igual ao valor total (R$ ${valorNum.toFixed(2)}).`);
      }
    }

    const baseRateios: Rateio[] | undefined = habilitarRateio
      ? rateios.map((r) => ({
          categoriaId: r.categoriaId,
          valor: Number(r.valor),
          percentual: valorNum > 0 ? Math.round((Number(r.valor) / valorNum) * 10000) / 100 : undefined,
          descricao: r.descricao,
        }))
      : undefined;

    if (parcelar && !isEdit) {
      if (parcelas < 2) return setErro("Parcelamento exige 2 ou mais parcelas.");
      // Use customized parcelas if user edited dates; otherwise compute from primeira data
      const grupoUid = (crypto as any).randomUUID();
      // We'll insert one-by-one to respect custom dates
      const { addLancamento: insertOne } = { addLancamento };
      for (let i = 0; i < parcelasCustom.length; i++) {
        const p = parcelasCustom[i];
        const inserted = await insertOne({
          data: p.data,
          desc: `${desc.trim()} (${p.numero}/${parcelasCustom.length})`,
          categoriaId: habilitarRateio ? "" : categoriaId,
          contatoId: contatoId || undefined,
          bancoId: bancoId || undefined,
          tipo,
          valor: p.valor,
          status,
          parcelaGrupoId: grupoUid,
          parcelaNumero: p.numero,
          parcelaTotal: parcelasCustom.length,
          rateios: baseRateios
            ? baseRateios.map((r) => ({
                ...r,
                valor: Math.round((r.valor * (p.valor / valorNum)) * 100) / 100,
              }))
            : undefined,
        });
        // ensure inserted not unused
        void inserted;
      }
      // suppress lint
      void addParcelamento;
      void grupoUid;
      onClose();
      return;
    }

    const payload: Omit<Lancamento, "id"> = {
      data,
      desc: desc.trim(),
      categoriaId: habilitarRateio ? "" : categoriaId,
      contatoId: contatoId || undefined,
      bancoId: bancoId || undefined,
      tipo,
      valor: valorNum,
      status,
      rateios: baseRateios,
    };
    if (isEdit && editando) await updateLancamento(editando.id, payload);
    else await addLancamento(payload);
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 max-w-sm">
          {(["Receita", "Despesa"] as LancTipo[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={isEdit}
              onClick={() => { setTipo(t); setCategoriaId(""); setContatoId(""); }}
              className={`rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                tipo === t
                  ? t === "Receita" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Seção: Informações do lançamento */}
        <section className="rounded-lg border border-border/60 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Informações do lançamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label>{tipo === "Receita" ? "Cliente" : "Fornecedor"}</Label>
              <Select value={contatoId} onValueChange={setContatoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contatosFiltrados.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Nenhum cadastro.
                    </div>
                  ) : contatosFiltrados.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de competência *</Label>
              <Input type="date" value={data} onChange={(e) => {
                setData(e.target.value);
                if (parcelar) recomputeParcelas(valorNum, parcelas, e.target.value);
              }} />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label>Descrição *</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor *</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => {
                setValor(e.target.value);
                if (parcelar) recomputeParcelas(Number(e.target.value) || 0, parcelas, data);
              }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-1 flex flex-col">
              <Label>Habilitar rateio</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={habilitarRateio}
                  onCheckedChange={(v) => {
                    setHabilitarRateio(v);
                    if (v && rateios.length < 2) {
                      setRateios([{ categoriaId: "", valor: 0 }, { categoriaId: "", valor: 0 }]);
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {habilitarRateio ? "Ativado" : "Desativado"}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Categoria {habilitarRateio ? "" : "*"}</Label>
              <Select
                value={categoriaId}
                onValueChange={setCategoriaId}
                disabled={habilitarRateio}
              >
                <SelectTrigger>
                  <SelectValue placeholder={habilitarRateio ? "Definida no rateio" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {catsFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LancStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Seção: Rateio */}
        {habilitarRateio && (
          <section className="rounded-lg border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Rateio por categoria</h3>
              <Button type="button" size="sm" variant="outline" onClick={addRateio}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {rateios.map((r, i) => {
                const pct = valorNum > 0 ? ((Number(r.valor) || 0) / valorNum) * 100 : 0;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={r.categoriaId ?? ""} onValueChange={(v) => updateRateio(i, { categoriaId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {catsFiltradas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input type="number" min="0" step="0.01" value={r.valor}
                        onChange={(e) => updateRateio(i, { valor: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">%</Label>
                      <Input type="number" min="0" step="0.01" value={pct.toFixed(2)}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          updateRateio(i, { valor: Math.round((valorNum * p / 100) * 100) / 100 });
                        }} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500"
                        disabled={rateios.length <= 2}
                        onClick={() => removeRateio(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground">Total rateado</span>
              <span className={Math.abs(totalRateio - valorNum) > 0.01 ? "text-red-500 font-medium" : "text-emerald-600 font-medium"}>
                R$ {totalRateio.toFixed(2)} / R$ {valorNum.toFixed(2)}
              </span>
            </div>
          </section>
        )}

        {/* Seção: Condição de pagamento */}
        <section className="rounded-lg border border-border/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Condição de pagamento</h3>
            {!isEdit && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Parcelar?</span>
                <Switch checked={parcelar} onCheckedChange={togglePar} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Parcelamento</Label>
              {parcelar ? (
                <Input type="number" min="2" max="60" value={parcelas}
                  onChange={(e) => {
                    const n = Math.max(2, Number(e.target.value) || 2);
                    setParcelas(n);
                    recomputeParcelas(valorNum, n, data);
                  }} />
              ) : (
                <Input value="À vista" disabled />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>1º vencimento</Label>
              <Input type="date" value={data} onChange={(e) => {
                setData(e.target.value);
                if (parcelar) recomputeParcelas(valorNum, parcelas, e.target.value);
              }} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta de pagamento</Label>
              <Select value={bancoId} onValueChange={setBancoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">Cadastre um banco.</div>
                  ) : bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {parcelar && parcelasCustom.length > 0 && (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelasCustom.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{p.numero}/{parcelasCustom.length}</TableCell>
                      <TableCell>
                        <Input type="date" value={p.data} onChange={(e) => setParcelaData(i, e.target.value)} className="h-8" />
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.valor.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{isEdit ? "Salvar alterações" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TransferenciaDialog() {
  const { bancos, addTransferencia } = useData();
  const [open, setOpen] = useState(false);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");

  const reset = () => {
    setOrigem(""); setDestino(""); setValor(""); setData(""); setDescricao(""); setErro("");
  };

  const submit = async () => {
    if (!origem || !destino) { setErro("Selecione os bancos de origem e destino."); return; }
    if (origem === destino) { setErro("Origem e destino devem ser diferentes."); return; }
    const v = Number(valor);
    if (Number.isNaN(v) || v <= 0) { setErro("Valor deve ser positivo."); return; }
    if (!data) { setErro("Informe a data."); return; }
    await addTransferencia({
      data, bancoOrigemId: origem, bancoDestinoId: destino,
      valor: v, descricao: descricao.trim() || undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="h-4 w-4" /> Transferência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transferência entre bancos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {bancos.length < 2 && (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Cadastre pelo menos 2 bancos em Cadastros para fazer transferências.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Banco de origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Banco de destino</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.filter((b) => b.id !== origem).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} />
          </div>
          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={bancos.length < 2}>Salvar transferência</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferenciasTable() {
  const { transferencias, bancos, removeTransferencia } = useData();
  const bancoName = (id: string) => bancos.find((b) => b.id === id)?.nome ?? "—";

  if (transferencias.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <p className="text-sm font-semibold">Transferências entre bancos</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferencias.map((t: Transferencia) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{t.data}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoOrigemId)}</TableCell>
                <TableCell className="text-sm">{bancoName(t.bancoDestinoId)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.descricao ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">R$ {t.valor.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                    onClick={() => removeTransferencia(t.id)}
                  ><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
