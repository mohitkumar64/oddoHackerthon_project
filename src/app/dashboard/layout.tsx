"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { DemoSwitcher } from "@/components/demo-switcher";
import {
  Truck,
  Users,
  Route,
  Wrench,
  DollarSign,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  UserCheck,
  Home,
  Navigation
} from "lucide-react";
import Link from "next/link";

interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FLEET_MANAGER" | "SAFETY_OFFICER" | "DRIVER";
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setLoading(false);
          return;
        }
      }
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background font-sans">
        <div className="flex flex-col items-center gap-2">
          <Truck className="size-8 text-primary animate-bounce" />
          <span className="text-sm text-muted-foreground font-medium">Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Navigation config based on role
  const navigationItems = [
    {
      name: "Dashboard Home",
      href: "/dashboard",
      icon: Home,
      roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "DRIVER"],
    },
    {
      name: "Live Fleet Map",
      href: "/dashboard/fleet-manager?tab=live-map",
      icon: Navigation,
      roles: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER"],
    },
    {
      name: "Fleet Registry",
      href: "/dashboard/fleet-manager?tab=vehicles",
      icon: Truck,
      roles: ["ADMIN", "FLEET_MANAGER"],
    },
    {
      name: "Driver Roster",
      href: "/dashboard/fleet-manager?tab=drivers",
      icon: Users,
      roles: ["ADMIN", "FLEET_MANAGER"],
    },
    {
      name: "Trip Dispatcher",
      href: "/dashboard/fleet-manager?tab=trips",
      icon: Route,
      roles: ["ADMIN", "FLEET_MANAGER"],
    },
    {
      name: "Safety & Compliance",
      href: "/dashboard/safety?tab=licenses",
      icon: ShieldCheck,
      roles: ["ADMIN", "SAFETY_OFFICER"],
    },
    {
      name: "Driver Scores Audit",
      href: "/dashboard/safety?tab=scores",
      icon: Users,
      roles: ["SAFETY_OFFICER"],
    },
    {
      name: "Shop Status (Repairs)",
      href: "/dashboard/safety?tab=maintenance",
      icon: Wrench,
      roles: ["SAFETY_OFFICER"],
    },
    {
      name: "Maintenance Logs (Admin)",
      href: "/dashboard/fleet-manager?tab=maintenance",
      icon: Wrench,
      roles: ["ADMIN", "FLEET_MANAGER"],
    },
    {
      name: "Expenses & Finance",
      href: "/dashboard/fleet-manager?tab=expenses",
      icon: DollarSign,
      roles: ["ADMIN", "FLEET_MANAGER"],
    },
    {
      name: "My Driver Console",
      href: "/dashboard/driver",
      icon: UserCheck,
      roles: ["DRIVER"],
    },
  ];

  const filteredNav = navigationItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-muted/30 font-sans text-base">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-border gap-2">
          <Truck className="size-6 text-foreground" />
          <span className="text-lg font-bold tracking-tight text-foreground">TransitOps</span>
          <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground border">SAAS</span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const hasQuery = item.href.includes("?");
            const isActive = hasQuery
              ? (pathname === item.href.split("?")[0] && searchParams.get("tab") === new URLSearchParams(item.href.split("?")[1]).get("tab"))
              : (pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="size-4.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-none">{user.name}</p>
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider leading-none mt-1 inline-block">
                {user.role.replace("_", " ")}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile Top Bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-card md:hidden">
          <div className="flex items-center gap-2">
            <Truck className="size-5" />
            <span className="text-base font-bold tracking-tight text-foreground">TransitOps</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden">
            <div className="fixed inset-y-0 left-0 w-64 border-r border-border bg-card p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Truck className="size-5" />
                  <span className="text-base font-bold tracking-tight text-foreground">TransitOps</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1.5">
                {filteredNav.map((item) => {
                  const hasQuery = item.href.includes("?");
                  const isActive = hasQuery
                    ? (pathname === item.href.split("?")[0] && searchParams.get("tab") === new URLSearchParams(item.href.split("?")[1]).get("tab"))
                    : (pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard"));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <item.icon className="size-4.5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground leading-none">{user.name}</p>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase mt-1 inline-block">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-accent transition-colors"
                  >
                    <LogOut className="size-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          <Suspense fallback={
            <div className="flex h-[30vh] items-center justify-center">
              <span className="text-sm text-muted-foreground">Loading workspace view...</span>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>

      {/* Floating Demo Swapper console */}
      <DemoSwitcher />

      {/* global alert toaster */}
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-background font-sans">
        <div className="flex flex-col items-center gap-2">
          <Truck className="size-8 text-primary animate-bounce" />
          <span className="text-sm text-muted-foreground font-medium font-sans">Loading workspace shell...</span>
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
