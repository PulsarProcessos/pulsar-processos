import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  TrendingUp,
  Handshake,
  Megaphone,
  Settings,
  ChevronRight,
} from "lucide-react";
import pulsarLogo from "@/assets/pulsar-logo.png";

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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; url: string }[];
};

const items: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: TrendingUp,
    children: [
      { title: "Visão Geral", url: "/financeiro" },
      { title: "Lançamentos", url: "/financeiro/lancamentos" },
      { title: "Cadastros", url: "/financeiro/cadastros" },
      { title: "Metas", url: "/financeiro/metas" },
    ],
  },
  {
    title: "Comercial",
    url: "/comercial",
    icon: Handshake,
    children: [
      { title: "Pipeline", url: "/comercial" },
      { title: "Cadastros", url: "/comercial/cadastros" },
    ],
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Megaphone,
    children: [
      { title: "Leads", url: "/marketing" },
      { title: "Campanhas", url: "/marketing/campanhas" },
      { title: "Calendário", url: "/marketing/calendario" },
    ],
  },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url;
  const groupActive = (item: NavItem) =>
    item.children?.some((c) => pathname === c.url) ?? false;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-sidebar-border">
            <img src={pulsarLogo} alt="Pulsar" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-[0.15em] text-sidebar-foreground">
                PULS<span className="text-primary">AR</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
                Processos
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                if (!item.children) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={groupActive(item)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={groupActive(item)}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === child.url}
                              >
                                <Link to={child.url}>
                                  <span>{child.title}</span>
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
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50">
            v1.0 · Pulsar
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
