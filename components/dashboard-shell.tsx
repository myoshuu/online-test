"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  LogOut,
  UserCircle,
  BookOpen,
  GraduationCap,
  Menu,
  X,
  FileQuestion,
} from "lucide-react";
import { logout } from "@/actions/Auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type DashboardShellProps = {
  children: React.ReactNode;
  currentUser: {
    id: string;
    name: string;
    nim: string;
    role: "ADMIN" | "LECTURER" | "STUDENT";
    avatarUrl?: string | null;
  };
};

const navConfig = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "LECTURER", "STUDENT"],
  },
  {
    label: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    label: "Subjects",
    href: "/dashboard/admin/subjects",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    label: "Questions",
    href: "/dashboard/admin/questions",
    icon: FileQuestion,
    roles: ["ADMIN"],
  },
  {
    label: "My Tests",
    href: "/dashboard/lecturer/tests",
    icon: GraduationCap,
    roles: ["LECTURER"],
  },
  {
    label: "My Students",
    href: "/dashboard/lecturer/students",
    icon: Users,
    roles: ["LECTURER"],
  },
  {
    label: "My Tests",
    href: "/dashboard/student/tests",
    icon: GraduationCap,
    roles: ["STUDENT"],
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: UserCircle,
    roles: ["ADMIN", "LECTURER", "STUDENT"],
  },
] as const;

export function DashboardShell({ children, currentUser }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = currentUser.role;

  const navItems = useMemo(
    () => navConfig.filter((item) => item.roles.includes(role)),
    [role]
  );

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return "U";
    const parts = fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "");
    const initials = parts.slice(0, 2).join("");
    return initials || "U";
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col border-r border-border bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/75 overflow-y-auto">
        <div className="p-6 border-b border-border space-y-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-border bg-primary/10 group-hover:border-primary transition-colors">
              {currentUser.avatarUrl ? (
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {getInitials(currentUser.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium capitalize text-muted-foreground">
                Welcome back
              </p>
              <p className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                {currentUser.name}
              </p>
            </div>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            {currentUser.role}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-4 mt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start cursor-pointer shadow-none hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
          <div className="pt-4 mt-6 border-t border-border">
            <div className="rounded-lg border border-border bg-muted/60 p-4">
              <p className="text-sm font-semibold mb-1">Need help?</p>
              <p className="text-xs text-muted-foreground">
                Contact your administrator if you need access to additional
                features or permissions.
              </p>
            </div>
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 flex-col border-r border-border bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/75 overflow-y-auto z-50 lg:hidden">
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-4 group cursor-pointer flex-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-border bg-primary/10 group-hover:border-primary transition-colors">
                    {currentUser.avatarUrl ? (
                      <Image
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                        {getInitials(currentUser.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium capitalize text-muted-foreground">
                      Welcome back
                    </p>
                    <p className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                      {currentUser.name}
                    </p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                {currentUser.role}
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-4 mt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full justify-start cursor-pointer shadow-none hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
              <div className="pt-4 mt-6 border-t border-border">
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-sm font-semibold mb-1">Need help?</p>
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator if you need access to additional
                    features or permissions.
                  </p>
                </div>
              </div>
            </nav>
          </aside>
        </>
      )}

      <div className="flex lg:ml-72 min-h-screen">
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80 sticky top-0 z-10">
            <div className="px-3 sm:px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold lg:text-xl">
                    Dashboard
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Manage your account and activities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  {role}
                </div>
                <ThemeToggle />
                <Link
                  href="/dashboard/profile"
                  className="hidden lg:flex items-center gap-3 rounded-full border border-border bg-card px-3 py-2 hover:border-primary cursor-pointer transition-colors"
                >
                  <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden border border-border bg-primary/10">
                    {currentUser.avatarUrl ? (
                      <Image
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary text-sm font-semibold">
                        {getInitials(currentUser.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {currentUser.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.nim || ""}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

