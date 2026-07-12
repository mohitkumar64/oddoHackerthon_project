"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  DollarSign, 
  AlertTriangle,
  LogOut,
  Calendar,
  Compass,
  FileText,
  Activity
} from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";

interface Vehicle {
  _id: string;
  registrationNumber: string;
  name: string;
  odometer: number;
}

interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: "CLASS_A" | "CLASS_B" | "CLASS_C";
  licenseExpiryDate: string;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
  safetyScore: number;
}

interface Trip {
  _id: string;
  tripNumber: string;
  source: string;
  destination: string;
  plannedDistance: number;
  cargoWeight: number;
  revenue: number;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  vehicleId: Vehicle;
}

export default function DriverDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Completion form states
  const [finalOdo, setFinalOdo] = useState("");
  const [fuelConsumed, setFuelConsumed] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense form states
  const [expenseType, setExpenseType] = useState<"TOLL" | "OTHER">("TOLL");
  const [expenseCost, setExpenseCost] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [isLoggingExpense, setIsLoggingExpense] = useState(false);

  const fetchDriverData = async () => {
    try {
      // 1. Fetch current user session
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) return;
      const meData = await meRes.json();
      
      if (!meData.authenticated || !meData.user.driverId) {
        toast.error("User does not have an associated driver profile.");
        setLoading(false);
        return;
      }

      const driverId = meData.user.driverId;

      // 2. Fetch driver profile details
      const driversRes = await fetch("/api/drivers");
      if (driversRes.ok) {
        const driversList: Driver[] = await driversRes.json();
        const profile = driversList.find(d => d._id === driverId);
        if (profile) {
          setDriver(profile);
          
          // 3. If driver is On Trip, fetch active trip
          if (profile.status === "ON_TRIP") {
            const tripsRes = await fetch(`/api/trips?driverId=${driverId}&status=DISPATCHED`);
            if (tripsRes.ok) {
              const tripsList: Trip[] = await tripsRes.json();
              if (tripsList.length > 0) {
                setActiveTrip(tripsList[0]);
                // Pre-populate odometer
                setFinalOdo(String(tripsList[0].vehicleId.odometer + tripsList[0].plannedDistance));
              }
            }
          } else {
            setActiveTrip(null);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load driver console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const handleToggleDuty = async () => {
    if (!driver) return;
    const newStatus = driver.status === "AVAILABLE" ? "OFF_DUTY" : "AVAILABLE";
    
    try {
      const res = await fetch(`/api/drivers/${driver._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...driver,
          status: newStatus
        }),
      });

      if (res.ok) {
        toast.success(`Duty status updated to ${newStatus}`);
        fetchDriverData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update duty status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !finalOdo || !fuelConsumed) {
      toast.error("Please fill in final odometer and fuel consumed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${activeTrip._id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalOdometer: Number(finalOdo),
          fuelConsumed: Number(fuelConsumed),
          fuelCost: fuelCost ? Number(fuelCost) : undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Trip marked completed. Odometer advanced & fuel expense logged.");
        setFinalOdo("");
        setFuelConsumed("");
        setFuelCost("");
        fetchDriverData();
      } else {
        toast.error(data.message || "Failed to complete trip.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !expenseCost) {
      toast.error("Please specify expense cost.");
      return;
    }

    setIsLoggingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: activeTrip.vehicleId._id,
          tripId: activeTrip._id,
          type: expenseType,
          cost: Number(expenseCost),
          description: expenseDesc || `${expenseType.charAt(0) + expenseType.slice(1).toLowerCase()} on Route`,
        }),
      });

      if (res.ok) {
        toast.success(`${expenseType} expense successfully recorded.`);
        setExpenseCost("");
        setExpenseDesc("");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to log expense.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setIsLoggingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="size-6 text-muted-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Loading driver parameters...</span>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="rounded-xl border border-destructive bg-destructive/5 p-6 text-center">
        <AlertTriangle className="size-8 text-destructive mx-auto mb-2" />
        <h3 className="text-sm font-bold text-destructive">No Driver Profile</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          This account is not mapped to any driver profile in the system database. Please contact your Fleet Manager to register your driver profile first.
        </p>
      </div>
    );
  }

  const isExpired = new Date(driver.licenseExpiryDate) <= new Date();

  return (
    <ScrollReveal className="max-w-md mx-auto space-y-6 font-sans select-none pb-12">
      {/* 1. Roster Status Card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Welcome, {driver.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">License: {driver.licenseNumber} ({driver.licenseCategory})</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Safety Score</span>
            <span className={`text-xl font-bold font-mono ${driver.safetyScore >= 85 ? "text-emerald-500" : driver.safetyScore >= 70 ? "text-amber-500" : "text-destructive"}`}>
              {driver.safetyScore}/100
            </span>
          </div>
        </div>

        {/* License Expiry Check */}
        {isExpired && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2.5 items-start text-xs text-destructive">
            <AlertTriangle className="size-4.5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Critical: License Expired</span>
              Your driver license expired on {new Date(driver.licenseExpiryDate).toLocaleDateString()}. You cannot drive or accept routes until this is updated.
            </div>
          </div>
        )}

        {/* Status indicator row */}
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${
              driver.status === "AVAILABLE" ? "bg-emerald-500 animate-pulse" : 
              driver.status === "ON_TRIP" ? "bg-blue-500 animate-pulse" : 
              driver.status === "SUSPENDED" ? "bg-destructive" : "bg-muted-foreground"
            }`} />
            <span className="text-xs font-semibold uppercase text-foreground">
              {driver.status.replace("_", " ")}
            </span>
          </div>

          {/* Toggle Availability Switch (Only if not suspended or expired) */}
          {driver.status !== "SUSPENDED" && !isExpired && driver.status !== "ON_TRIP" && (
            <button
              onClick={handleToggleDuty}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                driver.status === "AVAILABLE"
                  ? "bg-card border-border hover:bg-accent text-foreground"
                  : "bg-primary text-primary-foreground border-transparent hover:opacity-90"
              }`}
            >
              {driver.status === "AVAILABLE" ? "Go Off Duty" : "Go Available"}
            </button>
          )}
        </div>
      </div>

      {/* 2. active Trip Dispatch Console */}
      {driver.status === "ON_TRIP" && activeTrip ? (
        <div className="space-y-6">
          {/* Trip Details Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Active Dispatch</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">{activeTrip.tripNumber}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Odometer Start</span>
                <span className="text-xs font-bold font-mono text-foreground">{activeTrip.vehicleId.odometer} km</span>
              </div>
            </div>

            {/* Route Map summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-3 text-xs mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Source</span>
                  <span className="font-semibold">{activeTrip.source}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-border/80 pt-2">
                <MapPin className="size-4 text-emerald-500" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Destination</span>
                  <span className="font-semibold">{activeTrip.destination}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center font-mono">
              <div>
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Planned Dist</span>
                <span className="text-xs font-bold text-foreground">{activeTrip.plannedDistance} km</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Cargo Weight</span>
                <span className="text-xs font-bold text-foreground">{activeTrip.cargoWeight} kg</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Billing Revenue</span>
                <span className="text-xs font-bold text-emerald-500">${activeTrip.revenue}</span>
              </div>
            </div>
          </div>

          {/* Complete Trip Action Form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
              <CheckCircle2 className="size-4.5 text-emerald-500" />
              <span>Complete assigned trip</span>
            </h3>

            <form onSubmit={handleCompleteTrip} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="final-odo">
                  Final Odometer Reading (km)
                </label>
                <input
                  id="final-odo"
                  type="number"
                  required
                  min={activeTrip.vehicleId.odometer}
                  value={finalOdo}
                  onChange={(e) => setFinalOdo(e.target.value)}
                  placeholder={`Must be at least ${activeTrip.vehicleId.odometer} km`}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors font-mono"
                />
                <span className="text-[9px] text-muted-foreground block">
                  Current vehicle mileage is {activeTrip.vehicleId.odometer} km. Planned trip distance was {activeTrip.plannedDistance} km.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="fuel-liters">
                    Fuel Consumed (L)
                  </label>
                  <input
                    id="fuel-liters"
                    type="number"
                    required
                    min="1"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="fuel-cost">
                    Fuel Cost ($)
                  </label>
                  <input
                    id="fuel-cost"
                    type="number"
                    min="0"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? "Submitting Logs..." : "Submit & Complete Route"}
              </button>
            </form>
          </div>

          {/* Quick Expense Logger (Tolls/Incidentals) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
              <DollarSign className="size-4.5 text-blue-500" />
              <span>Log trip expense</span>
            </h3>

            <form onSubmit={handleLogExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Expense Type
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground outline-none focus:border-primary transition-colors"
                  >
                    <option value="TOLL">Toll Fee</option>
                    <option value="OTHER">Other Expense</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="exp-cost">
                    Cost ($)
                  </label>
                  <input
                    id="exp-cost"
                    type="number"
                    required
                    min="1"
                    value={expenseCost}
                    onChange={(e) => setExpenseCost(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="exp-desc">
                  Description
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. Turnpike toll checkpoint"
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingExpense}
                className="w-full flex items-center justify-center rounded-lg bg-card border border-border hover:bg-accent text-foreground py-2.5 text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isLoggingExpense ? "Saving Expense..." : "Log Expense"}
              </button>
            </form>
          </div>
        </div>
      ) : driver.status === "SUSPENDED" ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-xs text-destructive-foreground">
          <AlertTriangle className="size-10 text-destructive mx-auto mb-3" />
          <h3 className="text-sm font-bold text-red-500 mb-1"> Roster Suspension</h3>
          <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
            You are currently suspended from active routes by safety officers. This may be due to a low safety score ({driver.safetyScore}/100) or documentation audits.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-xs">
          <Compass className="size-10 text-muted-foreground/60 mx-auto mb-3 animate-spin-slow" />
          <h3 className="text-sm font-bold text-foreground mb-1">No Active Dispatches</h3>
          <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {driver.status === "AVAILABLE"
              ? "You are currently marked as AVAILABLE. Please keep this screen open. When a Fleet Manager dispatches a route, it will load here in real time."
              : "You are currently marked as OFF DUTY. Switch back to Available status above if you are ready to accept trip assignments."}
          </p>
        </div>
      )}
    </ScrollReveal>
  );
}
