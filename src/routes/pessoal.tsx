import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuloLayout } from "@/components/modulo-layout";
import { PessoalProvider } from "@/lib/pessoal-store";

// Módulo Pessoal: os dados só são carregados depois de conferir o acesso.
export const Route = createFileRoute("/pessoal")({
  component: () => (
    <ModuloLayout modulo="pessoal">
      <PessoalProvider>
        <Outlet />
      </PessoalProvider>
    </ModuloLayout>
  ),
});
