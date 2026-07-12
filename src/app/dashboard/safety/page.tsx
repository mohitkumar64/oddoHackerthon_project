"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Users, 
  Wrench, 
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingDown,
  UserX
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";

interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: "CLASS_A" | "CLASS_B" | "CLASS_C";
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
}

interface MaintenanceLog {
  _id: string;
  vehicleId: {
    _id: string;
    registrationNumber: string;
    name: string;
  };
  description: string;
  startDate: string;
  status: "OPEN" | "CLOSED";
}

export default function SafetyDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintLogs, setMaintLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTab = (searchParams.get("tab") as "licenses" | "scores" | "maintenance") || "licenses";

  const handleTabChange = (tabName: "licenses" | "scores" | "maintenance") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabName);
    router.push(`?${params.toString()}`);
  };
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [newScore, setNewScore] = useState("");

  const fetchData = async () => {
    try {
      const driversRes = await fetch("/api/drivers");
      const maintRes = await fetch("/api/maintenance");
      
      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData);
      }
      if (maintRes.ok) {
        const maintData = await maintRes.json();
        // filter to open work orders
        setMaintLogs(maintData.filter((log: MaintenanceLog) => log.status === "OPEN"));
      }
    } catch (err) {
      toast.error("Failed to load compliance audits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleSuspension = async (driver: Driver) => {
    const isSuspended = driver.status === "SUSPENDED";
    const nextStatus = isSuspended ? "AVAILABLE" : "SUSPENDED";

    try {
      const res = await fetch(`/api/drivers/${driver._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...driver,
          status: nextStatus
        }),
      });

      if (res.ok) {
        toast.success(`Driver ${driver.name} is now ${nextStatus === "SUSPENDED" ? "Suspended" : "Reinstated"}`);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update driver status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleUpdateSafetyScore = async (driver: Driver) => {
    const scoreVal = Number(newScore);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      toast.error("Safety score must be between 0 and 100.");
      return;
    }

    try {
      const res = await fetch(`/api/drivers/${driver._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...driver,
          safetyScore: scoreVal
        }),
      });

      if (res.ok) {
        toast.success(`Updated safety score for ${driver.name} to ${scoreVal}`);
        setEditingScoreId(null);
        setNewScore("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update safety score");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Compliance calculations
  const totalDrivers = drivers.length;
  const avgSafetyScore = totalDrivers > 0 
    ? Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / totalDrivers)
    : 0;

  const expiredLicenses = drivers.filter(d => new Date(d.licenseExpiryDate) <= new Date());
  
  const warningLicenses = drivers.filter(d => {
    const expiry = new Date(d.licenseExpiryDate);
    const diffTime = expiry.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  const suspendedDrivers = drivers.filter(d => d.status === "SUSPENDED");

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <ShieldAlert className="size-6 text-muted-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Loading safety records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Safety & Compliance Audit</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Audit driver documentation, licenses, safety metrics, and shop logs</p>
      </div>

      {/* KPI Row */}
      <ScrollReveal yOffset={10}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Avg Safety Score</span>
                <Award className="size-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{avgSafetyScore}/100</div>
              <p className="text-[10px] text-muted-foreground mt-1">Target benchmark: &gt; 85</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Expired Licenses</span>
                <AlertTriangle className="size-4 text-red-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${expiredLicenses.length > 0 ? "text-red-500" : "text-foreground"}`}>
                {expiredLicenses.length}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Requires immediate suspension</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Suspended Drivers</span>
                <UserX className="size-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{suspendedDrivers.length}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Locked from trip dispatch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Active Work Orders</span>
                <Wrench className="size-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{maintLogs.length}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Vehicles currently In Shop</p>
            </CardContent>
          </Card>
        </div>
      </ScrollReveal>

      {/* Tabs Layout */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => handleTabChange("licenses")}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all ${
              activeTab === "licenses"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            License Compliance ({expiredLicenses.length + warningLicenses.length})
          </button>
          <button
            onClick={() => handleTabChange("scores")}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all ${
              activeTab === "scores"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Safety Score Audit
          </button>
          <button
            onClick={() => handleTabChange("maintenance")}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all ${
              activeTab === "maintenance"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Shop Status ({maintLogs.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          {activeTab === "licenses" && (
            <ScrollReveal className="space-y-4">
              {expiredLicenses.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex gap-3 text-xs text-red-600 dark:text-red-400">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Critical Action Required</span>
                    There are {expiredLicenses.length} driver(s) currently registered with expired credentials. Enforce immediate suspensions to prevent operations liability.
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Driver</TableHead>
                    <TableHead className="text-xs">License No.</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => {
                    const expiry = new Date(d.licenseExpiryDate);
                    const isExp = expiry <= new Date();
                    
                    const diffTime = expiry.getTime() - Date.now();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isWarning = diffDays > 0 && diffDays <= 30;

                    return (
                      <TableRow key={d._id}>
                        <TableCell className="font-semibold text-xs py-3">{d.name}</TableCell>
                        <TableCell className="font-mono text-xs">{d.licenseNumber}</TableCell>
                        <TableCell className="text-xs">{d.licenseCategory.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            <span className={isExp ? "text-red-500 font-bold" : isWarning ? "text-amber-500 font-bold" : "text-foreground"}>
                              {expiry.toLocaleDateString()}
                            </span>
                            {isExp && <Badge variant="destructive" className="text-[8px] px-1 py-0 scale-90">Expired</Badge>}
                            {isWarning && <Badge variant="outline" className="text-[8px] px-1 py-0 scale-90 border-amber-500 text-amber-500">Expiring Soon</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={d.status === "SUSPENDED" ? "destructive" : d.status === "AVAILABLE" ? "secondary" : "outline"}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <button
                            onClick={() => handleToggleSuspension(d)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                              d.status === "SUSPENDED"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                            }`}
                          >
                            {d.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollReveal>
          )}

          {activeTab === "scores" && (
            <ScrollReveal className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Driver</TableHead>
                    <TableHead className="text-xs">Safety Score</TableHead>
                    <TableHead className="text-xs">Rating Threshold</TableHead>
                    <TableHead className="text-xs">Roster Status</TableHead>
                    <TableHead className="text-xs text-right">Adjust Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers
                    .sort((a, b) => a.safetyScore - b.safetyScore)
                    .map((d) => {
                      const isLow = d.safetyScore < 70;
                      const isAverage = d.safetyScore >= 70 && d.safetyScore < 85;

                      return (
                        <TableRow key={d._id}>
                          <TableCell className="font-semibold text-xs py-3">{d.name}</TableCell>
                          <TableCell className="py-3">
                            {editingScoreId === d._id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={newScore}
                                  onChange={(e) => setNewScore(e.target.value)}
                                  className="w-16 rounded border bg-background px-1.5 py-0.5 text-xs text-foreground font-mono outline-none"
                                />
                                <button
                                  onClick={() => handleUpdateSafetyScore(d)}
                                  className="text-[9px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded border"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingScoreId(null)}
                                  className="text-[9px] font-bold bg-card border px-2 py-0.5 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold font-mono ${isLow ? "text-red-500" : isAverage ? "text-amber-500" : "text-emerald-500"}`}>
                                  {d.safetyScore}/100
                                </span>
                                {isLow && <TrendingDown className="size-3.5 text-red-500" />}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {isLow ? (
                              <span className="text-red-500 font-medium">Critical (Needs Training)</span>
                            ) : isAverage ? (
                              <span className="text-amber-500 font-medium">Warning (Monitoring)</span>
                            ) : (
                              <span className="text-emerald-500 font-medium">Excellent Status</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={d.status === "SUSPENDED" ? "destructive" : "secondary"}>
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {editingScoreId !== d._id && (
                              <button
                                onClick={() => {
                                  setEditingScoreId(d._id);
                                  setNewScore(String(d.safetyScore));
                                }}
                                className="text-[10px] font-semibold px-2 py-1 rounded border bg-card hover:bg-accent text-foreground transition-colors"
                              >
                                Edit Score
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollReveal>
          )}

          {activeTab === "maintenance" && (
            <ScrollReveal className="space-y-4">
              {maintLogs.length === 0 ? (
                <div className="rounded-xl border border-border p-8 text-center text-xs">
                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-bold text-foreground">Zero Active Shop Repairs</h3>
                  <p className="text-muted-foreground mt-0.5">All fleet vehicle assets are structurally active or parked.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Vehicle</TableHead>
                      <TableHead className="text-xs">Reg No.</TableHead>
                      <TableHead className="text-xs">Issue Description</TableHead>
                      <TableHead className="text-xs">Placed In Shop</TableHead>
                      <TableHead className="text-xs">Roster Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="font-semibold text-xs py-3">{log.vehicleId.name}</TableCell>
                        <TableCell className="font-mono text-xs">{log.vehicleId.registrationNumber}</TableCell>
                        <TableCell className="text-xs">{log.description}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {new Date(log.startDate).toLocaleDateString()} at {new Date(log.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">
                            IN SHOP
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollReveal>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
