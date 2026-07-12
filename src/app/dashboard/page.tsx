"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const role = data.user.role;
            if (role === "ADMIN") {
              router.replace("/dashboard/admin");
            } else if (role === "FLEET_MANAGER") {
              router.replace("/dashboard/fleet-manager");
            } else if (role === "SAFETY_OFFICER") {
              router.replace("/dashboard/safety");
            } else if (role === "DRIVER") {
              router.replace("/dashboard/driver");
            } else {
              router.replace("/login");
            }
            return;
          }
        }
        router.replace("/login");
      } catch {
        router.replace("/login");
      }
    };

    checkRoleAndRedirect();
  }, [router]);

  return (
    <div className="flex h-[50vh] w-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-2">
        <Truck className="size-8 text-primary animate-bounce" />
        <span className="text-sm text-muted-foreground font-medium">Redirecting to workspace...</span>
      </div>
    </div>
  );
}
