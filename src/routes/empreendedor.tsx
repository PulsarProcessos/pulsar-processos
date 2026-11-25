import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuloLayout } from "@/components/modulo-layout";
import { DataProvider } from "@/lib/data-store";

// Módulo Empreendedor: os dados da empresa só são carregados depois de conferir o acesso.
export const Route = createFileRoute("/empreendedor")({
  component: () => (
    <ModuloLayout modulo="empreendedor">
      <DataProvider>
        <Outlet />
      </DataProvider>
    </ModuloLayout>
  ),
});
