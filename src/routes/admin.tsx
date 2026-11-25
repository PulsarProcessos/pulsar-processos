import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuloLayout } from "@/components/modulo-layout";

// Módulo Administração: só para administradores (a função "usuarios" confere de novo no servidor).
export const Route = createFileRoute("/admin")({
  component: () => (
    <ModuloLayout modulo="admin">
      <Outlet />
    </ModuloLayout>
  ),
});
