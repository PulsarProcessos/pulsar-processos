import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AVISOS, TIPOS_COMPROMISSO, estiloTipo, partes, periodo,
  useExcluirCompromisso, useSalvarCompromisso, Compromisso, TipoCompromisso,
} from "@/lib/agenda";

type Props = {
  editando?: Compromisso;
  /** Dia sugerido para um compromisso novo (AAAA-MM-DD). */
  dataPadrao: string;
  onConcluir: () => void;
};

/** Próxima hora cheia e uma hora depois, para sugerir num compromisso novo. */
function horarioSugerido(): { inicio: string; fim: string } {
  const h = Math.min(new Date().getHours() + 1, 22);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { inicio: `${pad(h)}:00`, fim: `${pad(h + 1)}:00` };
}

function maisUmaHora(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Conteúdo da janela de compromisso. O <Dialog> fica em quem usa. */
export function CompromissoForm({ editando, dataPadrao, onConcluir }: Props) {
  const salvar = useSalvarCompromisso();
  const excluir = useExcluirCompromisso();

  const sugerido = horarioSugerido();
  const per = editando ? periodo(editando) : null;
  const [tipo, setTipo] = useState<TipoCompromisso>(editando?.tipo ?? "empreendedor");
  const [titulo, setTitulo] = useState(editando?.titulo ?? "");
  const [diaInteiro, setDiaInteiro] = useState(editando?.diaInteiro ?? false);
  const [dataInicio, setDataInicio] = useState(per?.de ?? dataPadrao);
  const [dataFim, setDataFim] = useState(
    editando ? (editando.diaInteiro ? per!.ate : partes(editando.fim).data) : dataPadrao,
  );
  const [horaInicio, setHoraInicio] = useState(
    editando && !editando.diaInteiro ? partes(editando.inicio).hora : sugerido.inicio,
  );
  const [horaFim, setHoraFim] = useState(
    editando && !editando.diaInteiro ? partes(editando.fim).hora : sugerido.fim,
  );
  const [aviso, setAviso] = useState(
    editando ? (editando.avisoMin == null ? "nenhum" : String(editando.avisoMin)) : "30",
  );
  const [local, setLocal] = useState(editando?.local ?? "");
  const [descricao, setDescricao] = useState(editando?.descricao ?? "");

  const ocupado = salvar.isPending || excluir.isPending;
  const estilo = estiloTipo(tipo);
  const avisoConhecido = AVISOS.some((a) => a.valor === aviso);

  const mudarDataInicio = (v: string) => {
    setDataInicio(v);
    if (!dataFim || dataFim < v) setDataFim(v);
  };
  const mudarHoraInicio = (v: string) => {
    setHoraInicio(v);
    if (dataFim === dataInicio && horaFim <= v) setHoraFim(maisUmaHora(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { toast.error("Informe o título."); return; }
    try {
      await salvar.mutateAsync({
        id: editando?.id,
        tipoAnterior: editando?.tipo,
        tipo,
        titulo,
        diaInteiro,
        dataInicio,
        dataFim,
        horaInicio: diaInteiro ? undefined : horaInicio,
        horaFim: diaInteiro ? undefined : horaFim,
        local,
        descricao,
        avisoMin: aviso === "nenhum" ? null : Number(aviso),
      });
      toast.success(editando ? "Compromisso atualizado." : "Compromisso criado. Já está no seu Google Agenda.");
      onConcluir();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const apagar = async () => {
    if (!editando) return;
    if (!confirm(`Excluir "${editando.titulo}"? Ele também sai do Google Agenda.`)) return;
    try {
      await excluir.mutateAsync(editando);
      toast.success("Compromisso excluído.");
      onConcluir();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <DialogContent className={`border-t-4 sm:max-w-lg ${tipo === "pessoal" ? "border-t-blue-500" : "border-t-orange-500"}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          {editando?.recorrente && (
            <DialogDescription>
              Este compromisso se repete. A mudança vale só para este dia.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-titulo">Título</Label>
            <Input id="c-titulo" required autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Reunião com cliente" />
          </div>
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCompromisso)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_COMPROMISSO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${t.ponto}`} /> {t.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="c-dia-inteiro" className="cursor-pointer">Dia inteiro</Label>
          <Switch id="c-dia-inteiro" checked={diaInteiro} onCheckedChange={setDiaInteiro} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-data-ini">{diaInteiro ? "De" : "Começa"}</Label>
            <Input id="c-data-ini" type="date" required value={dataInicio} onChange={(e) => mudarDataInicio(e.target.value)} />
            {!diaInteiro && (
              <Input type="time" required value={horaInicio} onChange={(e) => mudarHoraInicio(e.target.value)}
                aria-label="Hora de início" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-data-fim">{diaInteiro ? "Até" : "Termina"}</Label>
            <Input id="c-data-fim" type="date" required min={dataInicio} value={dataFim}
              onChange={(e) => setDataFim(e.target.value)} />
            {!diaInteiro && (
              <Input type="time" required value={horaFim} onChange={(e) => setHoraFim(e.target.value)}
                aria-label="Hora de término" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Avisar no celular</Label>
            <Select value={aviso} onValueChange={setAviso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AVISOS.map((a) => <SelectItem key={a.valor} value={a.valor}>{a.nome}</SelectItem>)}
                {!avisoConhecido && <SelectItem value={aviso}>{aviso} minutos antes</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-local">Local</Label>
            <Input id="c-local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-obs">Observação</Label>
          <Textarea id="c-obs" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-full ${estilo.ponto}`} />
          Vai para a agenda "Pulsar · {estilo.nome}" no seu Google Agenda.
        </p>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {editando && (
              <Button type="button" variant="ghost" className="text-red-500" onClick={apagar} disabled={ocupado}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
            {editando?.link && (
              <Button type="button" variant="ghost" asChild>
                <a href={editando.link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Google
                </a>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onConcluir} disabled={ocupado}>Cancelar</Button>
            <Button type="submit" disabled={ocupado}>{salvar.isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
