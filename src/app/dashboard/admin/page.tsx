"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Settings, 
  Database, 
  Users, 
  Truck, 
  RotateCcw,
  AlertTriangle,
  Unlock,
  ShieldCheck,
  UserCog
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Vehicle {
  _id: string;
  registrationNumber: string;
  name: string;
  status: string;
}

interface Driver {
  _id: string;
  name: string;
  status: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FLEET_MANAGER" | "SAFETY_OFFICER" | "DRIVER";
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Overrides target selection
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [targetVehicleStatus, setTargetVehicleStatus] = useState("AVAILABLE");
  
  const [selectedDriver, setSelectedDriver] = useState("");
  const [targetDriverStatus, setTargetDriverStatus] = useState("AVAILABLE");
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const vRes = await fetch("/api/vehicles");
      const dRes = await fetch("/api/drivers");
      const uRes = await fetch("/api/users");
      
      if (vRes.ok) setVehicles(await vRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    } catch {
      toast.error("Failed to load admin telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResetDb = async () => {
    if (!confirm("Are you sure you want to completely reseed the database? This deletes all current transactions.")) {
      return;
    }
    const toastId = toast.loading("Reseeding database...");
    try {
      const res = await fetch("/api/auth/seed", { method: "POST" });
      if (res.ok) {
        toast.success("Database successfully seeded!", { id: toastId });
        fetchAdminData();
      } else {
        toast.error("Seed failed", { id: toastId });
      }
    } catch {
      toast.error("Network error during seed", { id: toastId });
    }
  };

  const handleVehicleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      toast.error("Please select a vehicle.");
      return;
    }

    setIsUpdating(true);
    try {
      const target = vehicles.find(v => v._id === selectedVehicle);
      if (!target) return;

      const res = await fetch(`/api/vehicles/${selectedVehicle}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          status: targetVehicleStatus
        }),
      });

      if (res.ok) {
        toast.success(`Vehicle ${target.registrationNumber} status overridden to ${targetVehicleStatus}`);
        setSelectedVehicle("");
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update vehicle");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDriverOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) {
      toast.error("Please select a driver.");
      return;
    }

    setIsUpdating(true);
    try {
      const target = drivers.find(d => d._id === selectedDriver);
      if (!target) return;

      const res = await fetch(`/api/drivers/${selectedDriver}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          status: targetDriverStatus
        }),
      });

      if (res.ok) {
        toast.success(`Driver ${target.name} status overridden to ${targetDriverStatus}`);
        setSelectedDriver("");
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update driver");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleChange = async (userId: string, userName: string, newRole: string) => {
    setIsUpdatingRole(userId);
    const toastId = toast.loading(`Updating ${userName}'s role to ${newRole}...`);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success(`Role updated successfully for ${userName}`, { id: toastId });
        fetchAdminData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update role", { id: toastId });
      }
    } catch {
      toast.error("Network error updating role", { id: toastId });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Settings className="size-6 text-muted-foreground animate-spin" />
          <span className="text-xs text-muted-foreground">Loading admin operations console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Global Admin Console</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Override vehicle and driver states, manage user roles, and reset schemas</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel 1: Database Seed */}
        <Card className="md:col-span-1 border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="size-4.5 text-amber-500" />
              <span>Data Seeder Engine</span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              Wipe and reset all MongoDB collections with default operational states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-[11px] text-amber-600 dark:text-amber-400 flex gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Seeding wipes all active trips, expenses, and logs. This is intended solely for evaluator review and reset.
              </span>
            </div>
            
            <button
              onClick={handleResetDb}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>Reset & Seed Database</span>
            </button>
          </CardContent>
        </Card>

        {/* Panel 2: Vehicle Override */}
        <Card className="md:col-span-1 border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Truck className="size-4.5 text-blue-500" />
              <span>Vehicle Override</span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              Force update vehicle status to clear stuck dispatches or locked records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVehicleOverride} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="veh-override-select">
                  Select Vehicle
                </label>
                <select
                  id="veh-override-select"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.registrationNumber} - {v.name} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="veh-override-status">
                  Target Override Status
                </label>
                <select
                  id="veh-override-status"
                  value={targetVehicleStatus}
                  onChange={(e) => setTargetVehicleStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_TRIP">ON_TRIP</option>
                  <option value="IN_SHOP">IN_SHOP</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isUpdating || !selectedVehicle}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-border hover:bg-accent text-foreground py-2 text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Unlock className="size-3.5 text-blue-500" />
                <span>Override Vehicle Status</span>
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Panel 3: Driver Override */}
        <Card className="md:col-span-1 border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="size-4.5 text-emerald-500" />
              <span>Driver Override</span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              Force release driver states in case of roster conflicts or lockouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDriverOverride} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="dr-override-select">
                  Select Driver
                </label>
                <select
                  id="dr-override-select"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground outline-none"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="dr-override-status">
                  Target Override Status
                </label>
                <select
                  id="dr-override-status"
                  value={targetDriverStatus}
                  onChange={(e) => setTargetDriverStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_TRIP">ON_TRIP</option>
                  <option value="OFF_DUTY">OFF_DUTY</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isUpdating || !selectedDriver}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-border hover:bg-accent text-foreground py-2 text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Unlock className="size-3.5 text-emerald-500" />
                <span>Override Driver Status</span>
              </button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* System Accounts Administration */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserCog className="size-4.5 text-primary" />
            <span>User Role Management Console</span>
          </CardTitle>
          <CardDescription className="text-[11px]">
            Lists live registered platform accounts. Admins can update roles (e.g. promoting drivers to FLEET MANAGER).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">User Account Name</th>
                <th className="px-4 py-2.5 font-semibold">System Email Address</th>
                <th className="px-4 py-2.5 font-semibold">Current Assigned Role</th>
                <th className="px-4 py-2.5 font-semibold text-right">Update Permissions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 font-semibold text-foreground">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-accent border text-foreground">
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={u.role}
                      disabled={isUpdatingRole === u._id}
                      onChange={(e) => handleRoleChange(u._id, u.name, e.target.value)}
                      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="FLEET_MANAGER">FLEET MANAGER</option>
                      <option value="SAFETY_OFFICER">SAFETY OFFICER</option>
                      <option value="DRIVER">DRIVER</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
