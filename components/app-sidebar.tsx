"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ListChecks, History, Building2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  {
    title: "Tests",
    url: "/tests",
    icon: ListChecks,
  },
  {
    title: "Execution History",
    url: "/executions",
    icon: History,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Check if current path matches this menu item
  const isActive = (url: string) => {
    if (url === "/tests") {
      return (
        pathname === "/" ||
        pathname === "/tests" ||
        pathname.startsWith("/tests/")
      );
    }
    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon">
      {/* Team Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-6 items-center justify-center rounded-lg bg-secondary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-xs text-muted-foreground">
                  Team
                </span>
                <span className="truncate font-semibold">WebQA</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:p-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    onClick={() => router.push(item.url)}
                    tooltip={item.title}
                  >
                    <a>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
