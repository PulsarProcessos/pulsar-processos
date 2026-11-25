import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, House } from "lucide-react";
import pulsarLogo from "@/assets/pulsar-logo.png";
import type { Modulo } from "@/lib/modulos";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Menu lateral de um módulo: só as telas daquele módulo, e o Início para trocar de módulo.
 * Recolhido, mostra só os ícones e abre por cima da tela ao passar o mouse; ao escolher uma
 * tela, volta a ficar recolhido. O que muda quando recolhe usa as classes
 * group-data-[collapsible=icon], que seguem a aparência (inclusive aberto pelo mouse).
 */
export function AppSidebar({ modulo }: { modulo: Modulo }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const atual = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  // No celular o menu fica por cima da tela: fecha ao escolher uma opção.
  const fechar = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar collapsible="icon" expandOnHover className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
            <img src={pulsarLogo} alt="Pulsar" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col whitespace-nowrap leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-[0.15em] text-sidebar-foreground">
              PULS<span className="text-primary">AR</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
              {modulo.nome}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" onClick={fechar}>
                    <House className="h-4 w-4" />
                    <span>Início</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {modulo.menu.map((item) => {
                if (!item.filhos) {
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={atual === item.url}>
                        <Link to={item.url} onClick={fechar}>
                          <item.icone className="h-4 w-4" />
                          <span>{item.titulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const grupoAtivo = item.filhos.some((f) => f.url === atual);
                return (
                  <Collapsible key={item.url} defaultOpen={grupoAtivo} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={grupoAtivo}>
                          <item.icone className="h-4 w-4" />
                          <span>{item.titulo}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.filhos.map((filho) => (
                            <SidebarMenuSubItem key={filho.url}>
                              <SidebarMenuSubButton asChild isActive={atual === filho.url}>
                                <Link to={filho.url} onClick={fechar}>
                                  <span>{filho.titulo}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="whitespace-nowrap text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:invisible">
          v2.0 · Pulsar
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
