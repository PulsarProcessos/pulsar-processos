import type { ReactNode } from "react";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { House, Lock } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MenuUsuario } from "@/components/menu-usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MODULOS, tituloDaTela, useAcesso, type ModuloId } from "@/lib/modulos";

function TelaCentral({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">{children}</div>;
}

/**
 * Moldura de um módulo: confere o acesso antes de montar qualquer coisa (os dados do módulo só
 * são carregados por quem tem acesso), e mostra só o menu daquele módulo, com o botão Início.
 */
export function ModuloLayout({ modulo: id, children }: { modulo: ModuloId; children: ReactNode }) {
  const acesso = useAcesso();
  const modulo = MODULOS[id];
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  if (acesso.carregando) {
    return <TelaCentral><p className="text-sm text-muted-foreground">Carregando...</p></TelaCentral>;
  }

  // Quem não é administrador não deve nem saber que a Administração existe: volta ao Início.
  if (id === "admin" && !acesso.erro && !acesso.pode(id)) return <Navigate to="/" replace />;

  if (acesso.erro || !acesso.pode(id)) {
    return (
      <TelaCentral>
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="items-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </span>
            <CardTitle>{acesso.erro ? "Não foi possível conferir o acesso" : `Sem acesso ao módulo ${modulo.nome}`}</CardTitle>
            <CardDescription>
              {acesso.erro
                ? "Verifique a internet e tente de novo."
                : "Este módulo não está liberado para a sua conta. Fale com o administrador."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/"><House className="h-4 w-4" /> Voltar ao início</Link></Button>
          </CardContent>
        </Card>
      </TelaCentral>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar modulo={modulo} />
      {/* min-w-0: tabelas largas rolam dentro do próprio quadro em vez de alargar a tela. */}
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground md:text-lg">
            {tituloDaTela(modulo, caminho)}
          </h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/"><House className="h-4 w-4" /> <span className="hidden sm:inline">Início</span></Link>
          </Button>
          <MenuUsuario />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
