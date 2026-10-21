import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MESES } from "@/lib/pessoal-store";

type Props = {
  ano: number;
  mes: number; // 1-12
  onChange: (ano: number, mes: number) => void;
};

export function MesNavegador({ ano, mes, onChange }: Props) {
  const navegar = (dir: -1 | 1) => {
    let m = mes + dir;
    let y = ano;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    onChange(y, m);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navegar(-1)} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[160px] rounded-md border px-4 py-2 text-center text-sm font-medium">
        {MESES[mes - 1]} de {ano}
      </div>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navegar(1)} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
