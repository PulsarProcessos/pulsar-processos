import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/**
 * Fim de cada tela: aponta a tela seguinte no raciocínio do módulo, para a pessoa nunca ficar
 * sem saber o que fazer depois.
 */
export function ProximoPasso({ para, titulo, texto, rotulo = "Próximo passo" }: {
  para: string;
  titulo: string;
  texto: string;
  rotulo?: string;
}) {
  return (
    <Link
      to={para}
      className="group flex items-center gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 transition-colors hover:border-primary hover:bg-primary/10"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{rotulo}</p>
        <p className="mt-0.5 font-semibold text-foreground">{titulo}</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
