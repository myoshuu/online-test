"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  LogOut,
  User as UserIcon,
  ClipboardList,
} from "lucide-react";
import { logout } from "@/actions/Auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DashboardSidebarProps {
  user: {
    id: string;
    name: string;
    nim: string;
    role: "ADMIN" | "LECTURER" | "STUDENT";
  };
}

const menuItems = {
  ADMIN: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Users",
      icon: Users,
      href: "/dashboard/users",
    },
    {
      title: "Subjects",
      icon: BookOpen,
      href: "/dashboard/subjects",
    },
    {
      title: "Tests",
      icon: FileText,
      href: "/dashboard/tests",
    },
  ],
  LECTURER: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "My Tests",
      icon: FileText,
      href: "/dashboard/tests",
    },
    {
      title: "Subjects",
      icon: BookOpen,
      href: "/dashboard/subjects",
    },
    {
      title: "Results",
      icon: ClipboardList,
      href: "/dashboard/results",
    },
  ],
  STUDENT: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "My Tests",
      icon: FileText,
      href: "/dashboard/tests",
    },
    {
      title: "My Results",
      icon: ClipboardList,
      href: "/dashboard/results",
    },
  ],
};

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = menuItems[user.role] || [];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Online Test</span>
            <span className="text-xs text-muted-foreground">Education Platform</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="w-full justify-start"
                    >
                      <Link href={item.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <Separator className="my-2" />
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full justify-start">
                  <div className="flex w-full items-center gap-2 px-2 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.role} • {user.nim}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

