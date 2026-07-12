"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Lock, Mail, Loader2, Key } from "lucide-react";
import { DemoSwitcher } from "@/components/demo-switcher";
import { Toaster } from "@/components/ui/sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.push("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setPageLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Welcome back! Loading your workspace...");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.message || "Invalid credentials.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 font-sans">
        <div className="flex flex-col items-center gap-2">
          <Truck className="size-8 text-white animate-bounce" />
          <span className="text-sm text-zinc-400 font-medium">Loading TransitOps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 font-sans relative overflow-hidden">
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black pointer-events-none" />

      {/* Main Grid Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="flex size-12 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-md">
            <Truck className="size-6" />
          </div>
          <h1 className="mt-6 text-xl font-bold tracking-tight text-white">Sign in to TransitOps</h1>
          <p className="mt-1.5 text-xs text-zinc-400">
            Enterprise Transport & Roster Operations Console
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-zinc-500" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. manager@transitops.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-zinc-500" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo instructions box */}
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-[11px] text-zinc-400 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
            <Key className="size-3.5 text-amber-500" />
            <span>Hackathon Quick-Access Notes</span>
          </div>
          <p className="leading-normal">
            For evaluation, you can use the floating <strong>Demo Console</strong> widget in the bottom-right corner to automatically sign in with seeded credentials or reset the database instantly.
          </p>
          <div className="border-t border-zinc-800/80 pt-2 space-y-1 font-mono text-[10px]">
            <div>• Manager: <span className="text-zinc-300">manager@transitops.com</span></div>
            <div>• Driver: <span className="text-zinc-300">driver@transitops.com</span></div>
            <div>• Common Password: <span className="text-zinc-300">password123</span></div>
          </div>
        </div>
      </div>

      {/* Floating Demo Swapper console */}
      <DemoSwitcher />

      {/* global alert toaster */}
      <Toaster richColors theme="dark" position="top-right" />
    </div>
  );
}
