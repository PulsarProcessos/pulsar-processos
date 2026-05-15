import { Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/financeiro": "Financeiro · Visão Geral",
  "/financeiro/lancamentos": "Financeiro · Lançamentos",
  "/financeiro/metas": "Financeiro · Metas",
  "/comercial": "Comercial · Pipeline",
  "/comercial/clientes": "Comercial · Clientes",
  "/marketing": "Marketing · Leads",
  "/marketing/campanhas": "Marketing · Campanhas",
  "/configuracoes": "Configurações",
};

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Pulsar";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center gap-4">
            <h1 className="text-base font-semibold text-foreground md:text-lg">
              {title}
            </h1>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="h-9 w-64 pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  AC
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
