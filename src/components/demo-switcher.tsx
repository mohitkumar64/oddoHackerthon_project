"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Key, 
  Database, 
  ShieldAlert, 
  User, 
  Briefcase, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw,
  Sparkles
} from "lucide-react";

interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FLEET_MANAGER" | "SAFETY_OFFICER" | "DRIVER";
}

export function DemoSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setCurrentSession(data.user);
          return;
        }
      }
      setCurrentSession(null);
    } catch {
      setCurrentSession(null);
    }
  };

  useEffect(() => {
    fetchSession();
    // Poll session occasionally or listen to router updates
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, []);

  const switchRole = async (email: string, roleName: string) => {
    setIsLoading(true);
    const toastId = toast.loading(`Logging in as ${roleName}...`);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });

      if (res.ok) {
        toast.success(`Switched role to ${roleName}`, { id: toastId });
        await fetchSession();
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to log in", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error while switching role", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndSeedDatabase = async () => {
    if (!confirm("Are you sure you want to completely reset and reseed the database? This wipes all existing records.")) {
      return;
    }
    setIsLoading(true);
    const toastId = toast.loading("Wiping and seeding MongoDB database...");
    try {
      const res = await fetch("/api/auth/seed", {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Database successfully reset and seeded!", { id: toastId });
        
        // Log back in as Fleet Manager by default to show seeded data
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "manager@transitops.com", password: "password123" }),
        });

        if (loginRes.ok) {
          await fetchSession();
          router.push("/dashboard/fleet-manager");
          router.refresh();
        }
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to seed database", { id: toastId });
      }
    } catch {
      toast.error("Network error during database seed", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans">
      {/* Expanded Console */}
      {isOpen && (
        <div className="mb-2 w-72 rounded-xl border border-border bg-card p-4 shadow-xl ring-1 ring-black/5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-amber-500" />
              <span>Demo Controls</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* Active Session Status */}
          <div className="mb-4 rounded-lg bg-muted/50 p-2 text-xs">
            <span className="text-muted-foreground">Active Account:</span>
            {currentSession ? (
              <div className="mt-1 font-medium text-foreground">
                <span className="font-semibold">{currentSession.name}</span>
                <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground px-1 bg-accent border rounded">
                  {currentSession.role.replace("_", " ")}
                </span>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{currentSession.email}</div>
              </div>
            ) : (
              <div className="mt-1 font-medium text-red-500">Not Authenticated</div>
            )}
          </div>

          {/* Role Switching Panel */}
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Switch Role Account</span>
            <div className="mt-1.5 flex flex-col gap-1">
              <button
                disabled={isLoading}
                onClick={() => switchRole("admin@transitops.com", "Admin")}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <Settings className="size-3.5 text-red-500" />
                <div className="flex-1 text-left">Admin</div>
              </button>
              
              <button
                disabled={isLoading}
                onClick={() => switchRole("manager@transitops.com", "Fleet Manager")}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <Briefcase className="size-3.5 text-blue-500" />
                <div className="flex-1 text-left">Fleet Manager</div>
              </button>
              
              <button
                disabled={isLoading}
                onClick={() => switchRole("safety@transitops.com", "Safety Officer")}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <ShieldAlert className="size-3.5 text-emerald-500" />
                <div className="flex-1 text-left">Safety Officer</div>
              </button>
              
              <button
                disabled={isLoading}
                onClick={() => switchRole("driver@transitops.com", "Driver (John)")}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <User className="size-3.5 text-amber-500" />
                <div className="flex-1 text-left">Driver John (Available)</div>
              </button>

              <button
                disabled={isLoading}
                onClick={() => switchRole("driver2@transitops.com", "Driver (Alex)")}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <User className="size-3.5 text-amber-500" />
                <div className="flex-1 text-left">Driver Alex (Available)</div>
              </button>
            </div>
          </div>

          {/* Database Resetter */}
          <button
            disabled={isLoading}
            onClick={resetAndSeedDatabase}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            <Database className="size-3.5" />
            <span>Reset & Seed Database</span>
          </button>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all duration-200"
      >
        {isOpen ? (
          <>
            <span>Close Console</span>
            <ChevronDown className="size-3.5" />
          </>
        ) : (
          <>
            <Key className="size-3.5 text-amber-500 animate-pulse" />
            <span>Demo Console</span>
            <ChevronUp className="size-3.5" />
          </>
        )}
      </button>
    </div>
  );
}
