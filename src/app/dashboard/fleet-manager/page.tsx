"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  Truck, 
  Users, 
  Route, 
  Wrench, 
  DollarSign, 
  MapPin, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  Download,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GPSMap } from "@/components/gps-map";
import { LiveFleetMap } from "@/components/live-fleet-map";
import { ScrollReveal } from "@/components/scroll-reveal";
import { INDIAN_ROUTES } from "@/lib/routes-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Vehicle {
  _id: string;
  registrationNumber: string;
  name: string;
  type: "TRUCK" | "VAN" | "CAR";
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
  region: string;
}

interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
}

interface Trip {
  _id: string;
  tripNumber: string;
  source: string;
  destination: string;
  vehicleId: Vehicle;
  driverId: Driver;
  cargoWeight: number;
  plannedDistance: number;
  revenue: number;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  startedAt?: string;
  completedAt?: string;
  fuelConsumed?: number;
  finalOdometer?: number;
}

interface MaintenanceLog {
  _id: string;
  vehicleId: Vehicle;
  description: string;
  startDate: string;
  endDate?: string;
  cost: number;
  status: "OPEN" | "CLOSED";
}

interface Expense {
  _id: string;
  vehicleId: Vehicle;
  type: "FUEL" | "MAINTENANCE" | "TOLL" | "OTHER";
  cost: number;
  fuelLiters?: number;
  date: string;
  description?: string;
}

export default function FleetManagerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "vehicles";
  const [, startTransition] = useTransition();

  // Roster lists
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintLogs, setMaintLogs] = useState<MaintenanceLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal target
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<any | null>(null);

  // New Vehicle form state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehReg, setNewVehReg] = useState("");
  const [newVehName, setNewVehName] = useState("");
  const [newVehType, setNewVehType] = useState<"TRUCK" | "VAN" | "CAR">("TRUCK");
  const [newVehCapacity, setNewVehCapacity] = useState("");
  const [newVehOdo, setNewVehOdo] = useState("");
  const [newVehCost, setNewVehCost] = useState("");
  const [newVehRegion, setNewVehRegion] = useState("Midwest");

  // New Driver form state
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDrName, setNewDrName] = useState("");
  const [newDrLicense, setNewDrLicense] = useState("");
  const [newDrCategory, setNewDrCategory] = useState<"CLASS_A" | "CLASS_B" | "CLASS_C">("CLASS_A");
  const [newDrExpiry, setNewDrExpiry] = useState("");
  const [newDrContact, setNewDrContact] = useState("");

  // New Trip form state
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripSrc, setNewTripSrc] = useState("");
  const [newTripDst, setNewTripDst] = useState("");
  const [newTripVehId, setNewTripVehId] = useState("");
  const [newTripDrId, setNewTripDrId] = useState("");
  const [newTripWeight, setNewTripWeight] = useState("");
  const [newTripDist, setNewTripDist] = useState("");
  const [newTripRev, setNewTripRev] = useState("");

  // New Maintenance form state
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [newMaintVehId, setNewMaintVehId] = useState("");
  const [newMaintDesc, setNewMaintDesc] = useState("");
  const [newMaintCost, setNewMaintCost] = useState("");

  // New Manual Expense form state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpVehId, setNewExpVehId] = useState("");
  const [newExpType, setNewExpType] = useState<"TOLL" | "OTHER">("TOLL");
  const [newExpCost, setNewExpCost] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  // Close maintenance log helper state
  const [closingMaintId, setClosingMaintId] = useState<string | null>(null);
  const [closingMaintCost, setClosingMaintCost] = useState("");

  // Complete trip helper state
  const [completingTripId, setCompletingTripId] = useState<string | null>(null);
  const [completingTripOdo, setCompletingTripOdo] = useState("");
  const [completingTripFuel, setCompletingTripFuel] = useState("");

  const fetchData = async () => {
    try {
      const [vRes, dRes, tRes, mRes, eRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/drivers"),
        fetch("/api/trips"),
        fetch("/api/maintenance"),
        fetch("/api/expenses"),
      ]);

      if (vRes.ok) setVehicles(await vRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (tRes.ok) setTrips(await tRes.json());
      if (mRes.ok) setMaintLogs(await mRes.json());
      if (eRes.ok) setExpenses(await eRes.json());
    } catch {
      toast.error("Failed to load operations data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (tabName: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabName);
      router.push(`?${params.toString()}`);
    });
  };

  // Add Vehicle handler
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Registering vehicle...");
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: newVehReg,
          name: newVehName,
          type: newVehType,
          maxLoadCapacity: Number(newVehCapacity),
          odometer: Number(newVehOdo),
          acquisitionCost: Number(newVehCost),
          region: newVehRegion,
        }),
      });

      if (res.ok) {
        toast.success("Vehicle registered successfully!", { id: toastId });
        setShowAddVehicle(false);
        setNewVehReg("");
        setNewVehName("");
        setNewVehCapacity("");
        setNewVehOdo("");
        setNewVehCost("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to add vehicle", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Add Driver handler
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Registering driver...");
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDrName,
          licenseNumber: newDrLicense,
          licenseCategory: newDrCategory,
          licenseExpiryDate: new Date(newDrExpiry),
          contactNumber: newDrContact,
        }),
      });

      if (res.ok) {
        toast.success("Driver profile registered successfully!", { id: toastId });
        setShowAddDriver(false);
        setNewDrName("");
        setNewDrLicense("");
        setNewDrExpiry("");
        setNewDrContact("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to add driver", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Add Trip handler
  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Planning trip draft...");
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: newTripSrc,
          destination: newTripDst,
          vehicleId: newTripVehId,
          driverId: newTripDrId,
          cargoWeight: Number(newTripWeight),
          plannedDistance: Number(newTripDist),
          revenue: Number(newTripRev),
        }),
      });

      if (res.ok) {
        toast.success("Trip draft planned successfully!", { id: toastId });
        setShowAddTrip(false);
        setNewTripSrc("");
        setNewTripDst("");
        setNewTripVehId("");
        setNewTripDrId("");
        setNewTripWeight("");
        setNewTripDist("");
        setNewTripRev("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to plan trip", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Dispatch Trip
  const handleDispatchTrip = async (tripId: string) => {
    const toastId = toast.loading("Dispatching vehicle and driver...");
    try {
      const res = await fetch(`/api/trips/${tripId}/dispatch`, { method: "POST" });
      if (res.ok) {
        toast.success("Trip successfully dispatched! Assets locked on road.", { id: toastId });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to dispatch trip", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Cancel Trip
  const handleCancelTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to cancel this trip?")) return;
    const toastId = toast.loading("Cancelling trip...");
    try {
      const res = await fetch(`/api/trips/${tripId}/cancel`, { method: "POST" });
      if (res.ok) {
        toast.success("Trip cancelled. Associated assets restored to Available.", { id: toastId });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to cancel trip", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Complete Trip (Manager Override Shortcut)
  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTripId) return;

    const toastId = toast.loading("Completing trip and logging fuel...");
    try {
      const res = await fetch(`/api/trips/${completingTripId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalOdometer: Number(completingTripOdo),
          fuelConsumed: Number(completingTripFuel),
        }),
      });

      if (res.ok) {
        toast.success("Trip completed. Assets released.", { id: toastId });
        setCompletingTripId(null);
        setCompletingTripOdo("");
        setCompletingTripFuel("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to complete trip", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Log Maintenance
  const handleAddMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Placing vehicle in shop...");
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newMaintVehId,
          description: newMaintDesc,
          startDate: new Date(),
          cost: Number(newMaintCost || 0),
        }),
      });

      if (res.ok) {
        toast.success("Vehicle status set to IN_SHOP.", { id: toastId });
        setShowAddMaint(false);
        setNewMaintVehId("");
        setNewMaintDesc("");
        setNewMaintCost("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to place vehicle in shop", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Close Maintenance Log
  const handleCloseMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingMaintId) return;

    const toastId = toast.loading("Closing work order...");
    try {
      const res = await fetch(`/api/maintenance/${closingMaintId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost: Number(closingMaintCost),
        }),
      });

      if (res.ok) {
        toast.success("Work order closed. Maintenance expense logged.", { id: toastId });
        setClosingMaintId(null);
        setClosingMaintCost("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to close work order", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Log Expense manually
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Logging expense...");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newExpVehId,
          type: newExpType,
          cost: Number(newExpCost),
          description: newExpDesc,
          date: new Date(),
        }),
      });

      if (res.ok) {
        toast.success("Expense logged successfully!", { id: toastId });
        setShowAddExpense(false);
        setNewExpVehId("");
        setNewExpCost("");
        setNewExpDesc("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to log expense", { id: toastId });
      }
    } catch {
      toast.error("Network error", { id: toastId });
    }
  };

  // Fetch Vehicle Details for detailed view
  const handleViewVehicleDetails = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedVehicleDetails(detail);
      }
    } catch {
      toast.error("Failed to load vehicle telemetry.");
    }
  };

  // Export CSV Helper
  const handleExportExpensesCSV = () => {
    if (expenses.length === 0) {
      toast.warning("No expense logs available to export.");
      return;
    }
    const headers = "Date,Vehicle,Type,Cost,Liters,Description\n";
    const rows = expenses
      .map((e) => {
        return `"${new Date(e.date).toLocaleDateString()}","${e.vehicleId?.registrationNumber || "N/A"}","${e.type}",${e.cost},${e.fuelLiters || ""},"${e.description || ""}"`;
      })
      .join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TransitOps_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  // Dynamic values helper: ROI Chart Data
  const vehiclesRoiData = vehicles
    .filter((v) => v.status !== "RETIRED")
    .map((v) => {
      // Find matching expenses
      const vExpenses = expenses.filter((e) => e.vehicleId?._id === v._id);
      const totalExp = vExpenses.reduce((sum, e) => sum + e.cost, 0);

      // Find matching revenues
      const vRevenues = trips.filter((t) => t.vehicleId?._id === v._id && t.status === "COMPLETED");
      const totalRev = vRevenues.reduce((sum, t) => sum + t.revenue, 0);

      // ROI = (Revenue - Expenses) / Cost
      const roiValue = v.acquisitionCost > 0 ? (totalRev - totalExp) / v.acquisitionCost : 0;

      return {
        regNumber: v.registrationNumber,
        name: v.name.split(" ")[0], // short name
        roi: Number((roiValue * 100).toFixed(1)), // convert to percentage
      };
    })
    .sort((a, b) => b.roi - a.roi);

  // Dynamic values helper: Expenses Pie Chart Data
  const fuelTotal = expenses.filter((e) => e.type === "FUEL").reduce((sum, e) => sum + e.cost, 0);
  const maintTotal = expenses.filter((e) => e.type === "MAINTENANCE").reduce((sum, e) => sum + e.cost, 0);
  const tollTotal = expenses.filter((e) => e.type === "TOLL").reduce((sum, e) => sum + e.cost, 0);
  const otherTotal = expenses.filter((e) => e.type === "OTHER").reduce((sum, e) => sum + e.cost, 0);

  const expensesPieData = [
    { name: "Fuel Logs", value: fuelTotal, color: "#10b981" },
    { name: "Maintenance Logs", value: maintTotal, color: "#3b82f6" },
    { name: "Tolls Expense", value: tollTotal, color: "#f59e0b" },
    { name: "Other Charges", value: otherTotal, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Truck className="size-6 text-muted-foreground animate-bounce" />
          <span className="text-xs text-muted-foreground">Loading operations database...</span>
        </div>
      </div>
    );
  }

  // Active / Available assets counts
  const activeVehicles = vehicles.filter((v) => v.status === "ON_TRIP").length;
  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const inShopVehicles = vehicles.filter((v) => v.status === "IN_SHOP").length;
  const activeTripsCount = trips.filter((t) => t.status === "DISPATCHED").length;
  const pendingTripsCount = trips.filter((t) => t.status === "DRAFT").length;
  const driversOnDuty = drivers.filter((d) => d.status === "AVAILABLE" || d.status === "ON_TRIP").length;

  const fleetUtilization = vehicles.filter(v => v.status !== "RETIRED").length > 0
    ? Math.round((activeVehicles / vehicles.filter(v => v.status !== "RETIRED").length) * 100)
    : 0;

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      {/* 1. Dashboard Row Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fleet Operations Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time tracking, dispatching schedules, and financial analytics</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg">
          <button
            onClick={() => handleTabChange("vehicles")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "vehicles" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => handleTabChange("drivers")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "drivers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Drivers
          </button>
          <button
            onClick={() => handleTabChange("trips")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "trips" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dispatches
          </button>
          <button
            onClick={() => handleTabChange("maintenance")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "maintenance" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Maintenance
          </button>
          <button
            onClick={() => handleTabChange("expenses")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "expenses" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => handleTabChange("live-map")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "live-map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live Map
          </button>
        </div>
      </div>

      {/* 2. Top-level KPIs */}
      <ScrollReveal yOffset={10}>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Fleet Utilization</span>
            <span className="text-xl font-bold font-mono mt-2 text-foreground">{fleetUtilization}%</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Trips</span>
            <span className="text-xl font-bold font-mono mt-2 text-emerald-500">{activeTripsCount}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Available Trucks</span>
            <span className="text-xl font-bold font-mono mt-2 text-blue-500">{availableVehicles}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">In Maintenance</span>
            <span className="text-xl font-bold font-mono mt-2 text-amber-500">{inShopVehicles}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending Orders</span>
            <span className="text-xl font-bold font-mono mt-2 text-foreground">{pendingTripsCount}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Drivers on Duty</span>
            <span className="text-xl font-bold font-mono mt-2 text-foreground">{driversOnDuty}</span>
          </Card>
        </div>
      </ScrollReveal>

      {/* 3. Tab Contents */}

      {/* TAB: VEHICLES */}
      {activeTab === "vehicles" && (
        <ScrollReveal className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Vehicle Fleet</h2>
            <button
              onClick={() => setShowAddVehicle(!showAddVehicle)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {/* Add Vehicle Form Panel */}
          {showAddVehicle && (
            <Card className="border border-border bg-card p-5 animate-in slide-in-from-top-4 duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Register New Fleet Asset</h3>
              <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="veh-reg">Reg Number</label>
                  <input
                    id="veh-reg"
                    type="text"
                    required
                    value={newVehReg}
                    onChange={(e) => setNewVehReg(e.target.value)}
                    placeholder="e.g. REG-7788"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="veh-name">Model Name</label>
                  <input
                    id="veh-name"
                    type="text"
                    required
                    value={newVehName}
                    onChange={(e) => setNewVehName(e.target.value)}
                    placeholder="e.g. Volvo FH16"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                  <select
                    value={newVehType}
                    onChange={(e) => setNewVehType(e.target.value as any)}
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  >
                    <option value="TRUCK">Heavy Truck</option>
                    <option value="VAN">Cargo Van</option>
                    <option value="CAR">Light Car</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="veh-cap">Max Load (kg)</label>
                  <input
                    id="veh-cap"
                    type="number"
                    required
                    value={newVehCapacity}
                    onChange={(e) => setNewVehCapacity(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="veh-odo">Initial Odometer (km)</label>
                  <input
                    id="veh-odo"
                    type="number"
                    required
                    value={newVehOdo}
                    onChange={(e) => setNewVehOdo(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="veh-cost">Acquisition Cost ($)</label>
                  <input
                    id="veh-cost"
                    type="number"
                    required
                    value={newVehCost}
                    onChange={(e) => setNewVehCost(e.target.value)}
                    placeholder="e.g. 120000"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Operating Region</label>
                  <select
                    value={newVehRegion}
                    onChange={(e) => setNewVehRegion(e.target.value)}
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  >
                    <option value="Midwest">Midwest</option>
                    <option value="Northeast">Northeast</option>
                    <option value="South">South</option>
                    <option value="West">West</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Register Asset
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Vehicle Table */}
          <Card className="border border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Reg Code</TableHead>
                    <TableHead className="text-xs">Model Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Capacity</TableHead>
                    <TableHead className="text-xs">Odometer</TableHead>
                    <TableHead className="text-xs">Region</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v._id} className="group transition-soft hover:bg-muted/50">
                      <TableCell className="font-mono text-xs py-4 font-semibold text-foreground group-hover:text-primary transition-colors">{v.registrationNumber}</TableCell>
                      <TableCell className="text-xs font-semibold">{v.name}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-bold tracking-tight">
                          {v.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{v.maxLoadCapacity} kg</TableCell>
                      <TableCell className="text-xs font-mono">{v.odometer.toLocaleString()} km</TableCell>
                      <TableCell className="text-xs">{v.region}</TableCell>
                      <TableCell className="text-xs py-4">
                        <Badge variant={
                          v.status === "AVAILABLE" ? "secondary" : 
                          v.status === "ON_TRIP" ? "default" : 
                          v.status === "IN_SHOP" ? "destructive" : "outline"
                        } className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight",
                          v.status === "AVAILABLE" ? "bg-blue-500/5 text-blue-500 border-blue-500/10" : 
                          v.status === "ON_TRIP" ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" : 
                          v.status === "IN_SHOP" ? "bg-amber-500/5 text-amber-500 border-amber-500/10" : ""
                        )}>
                          {v.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <button
                          onClick={() => handleViewVehicleDetails(v._id)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-soft"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detailed Vehicle Telemetry Modal */}
          {selectedVehicleDetails && (
            <Card className="border border-border bg-card p-6 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setSelectedVehicleDetails(null)}
                className="absolute top-4 right-4 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close Details
              </button>

              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Asset Telemetry</span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {selectedVehicleDetails.vehicle.name} ({selectedVehicleDetails.vehicle.registrationNumber})
                  </h3>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Acquisition Cost</span>
                  <span className="text-sm font-semibold">${selectedVehicleDetails.vehicle.acquisitionCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Telemetry Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono mb-6">
                <div className="bg-muted/30 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Lifetime Earnings</span>
                  <span className="text-sm font-semibold text-emerald-500">${selectedVehicleDetails.metrics.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Lifetime Expenses</span>
                  <span className="text-sm font-semibold text-destructive">${selectedVehicleDetails.metrics.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Fuel Efficiency</span>
                  <span className="text-sm font-semibold text-foreground">{selectedVehicleDetails.metrics.fuelEfficiency.toFixed(2)} km/L</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Estimated ROI</span>
                  <span className="text-sm font-semibold text-foreground">{(selectedVehicleDetails.metrics.roi * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Maintenance List inside Modal */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Maintenance Workorders</h4>
                {selectedVehicleDetails.maintenanceLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No maintenance history recorded for this vehicle.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-border/80 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/30 border-b text-[10px] text-muted-foreground font-bold">
                          <th className="p-2">Description</th>
                          <th className="p-2">Date Placed</th>
                          <th className="p-2">Cost</th>
                          <th className="p-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVehicleDetails.maintenanceLogs.map((log: any) => (
                          <tr key={log._id} className="border-b last:border-0">
                            <td className="p-2 font-medium">{log.description}</td>
                            <td className="p-2 text-muted-foreground">{new Date(log.startDate).toLocaleDateString()}</td>
                            <td className="p-2">${log.cost}</td>
                            <td className="p-2 text-right">
                              <Badge variant={log.status === "OPEN" ? "destructive" : "secondary"}>
                                {log.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}
        </ScrollReveal>
      )}

      {/* TAB: DRIVERS */}
      {activeTab === "drivers" && (
        <ScrollReveal className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Driver Fleet Roster</h2>
            <button
              onClick={() => setShowAddDriver(!showAddDriver)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add Driver</span>
            </button>
          </div>

          {/* Add Driver Form Panel */}
          {showAddDriver && (
            <Card className="border border-border bg-card p-5 animate-in slide-in-from-top-4 duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Register New Operator</h3>
              <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="dr-name">Driver Name</label>
                  <input
                    id="dr-name"
                    type="text"
                    required
                    value={newDrName}
                    onChange={(e) => setNewDrName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="dr-license">License Number</label>
                  <input
                    id="dr-license"
                    type="text"
                    required
                    value={newDrLicense}
                    onChange={(e) => setNewDrLicense(e.target.value)}
                    placeholder="e.g. LIC-12345"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                  <select
                    value={newDrCategory}
                    onChange={(e) => setNewDrCategory(e.target.value as any)}
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  >
                    <option value="CLASS_A">Class A (Heavy Duty)</option>
                    <option value="CLASS_B">Class B (Commercial)</option>
                    <option value="CLASS_C">Class C (Courier)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="dr-expiry">License Expiry</label>
                  <input
                    id="dr-expiry"
                    type="date"
                    required
                    value={newDrExpiry}
                    onChange={(e) => setNewDrExpiry(e.target.value)}
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none text-muted-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="dr-phone">Contact Number</label>
                  <input
                    id="dr-phone"
                    type="text"
                    required
                    value={newDrContact}
                    onChange={(e) => setNewDrContact(e.target.value)}
                    placeholder="e.g. +1-555-0100"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Register Operator
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Drivers List Table */}
          <Card className="border border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">License Code</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">License Expiry</TableHead>
                    <TableHead className="text-xs">Contact Phone</TableHead>
                    <TableHead className="text-xs">Safety Rating</TableHead>
                    <TableHead className="text-xs text-right">Roster Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => {
                    const isExpired = new Date(d.licenseExpiryDate) <= new Date();
                    return (
                      <TableRow key={d._id}>
                        <TableCell className="font-semibold text-xs py-3">{d.name}</TableCell>
                        <TableCell className="font-mono text-xs">{d.licenseNumber}</TableCell>
                        <TableCell className="text-xs">{d.licenseCategory.replace("_", " ")}</TableCell>
                        <TableCell className="text-xs font-mono">
                          <span className={isExpired ? "text-red-500 font-bold" : "text-foreground"}>
                            {new Date(d.licenseExpiryDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{d.contactNumber}</TableCell>
                        <TableCell className="text-xs py-3">
                          <span className={`font-bold font-mono ${d.safetyScore >= 85 ? "text-emerald-500" : d.safetyScore >= 70 ? "text-amber-500" : "text-destructive"}`}>
                            {d.safetyScore}/100
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Badge variant={
                            d.status === "AVAILABLE" ? "secondary" : 
                            d.status === "ON_TRIP" ? "default" : 
                            d.status === "SUSPENDED" ? "destructive" : "outline"
                          } className={
                            d.status === "AVAILABLE" ? "bg-blue-500/10 text-blue-500 border-transparent" : 
                            d.status === "ON_TRIP" ? "bg-emerald-500/10 text-emerald-500 border-transparent" : ""
                          }>
                            {d.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* TAB: TRIPS */}
      {activeTab === "trips" && (
        <ScrollReveal className="space-y-6">

          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Trip Dispatches Registry</h2>
            <button
              onClick={() => setShowAddTrip(!showAddTrip)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Create Trip Order</span>
            </button>
          </div>

          {/* Add Trip Form Panel */}
          {showAddTrip && (
            <Card className="border border-border bg-card p-5 animate-in slide-in-from-top-4 duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Plan New Cargo Trip</h3>
              <form onSubmit={handleAddTrip} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Route Corridor</label>
                  <select
                    required
                    value={INDIAN_ROUTES.find(r => r.source === newTripSrc && r.destination === newTripDst)?.id || ""}
                    onChange={(e) => {
                      const selected = INDIAN_ROUTES.find(r => r.id === e.target.value);
                      if (selected) {
                        setNewTripSrc(selected.source);
                        setNewTripDst(selected.destination);
                        
                        // Map route to approximate distance
                        let dist = 30;
                        if (selected.id === "route-1") dist = 25;
                        else if (selected.id === "route-2") dist = 35;
                        else if (selected.id === "route-3") dist = 40;
                        else if (selected.id === "route-4") dist = 30;
                        else if (selected.id === "route-5") dist = 20;
                        else if (selected.id === "route-6") dist = 30;
                        else if (selected.id === "route-7") dist = 25;
                        else if (selected.id === "route-8") dist = 20;
                        else if (selected.id === "route-9") dist = 30;
                        else if (selected.id === "route-10") dist = 30;
                        
                        setNewTripDist(dist.toString());
                      } else {
                        setNewTripSrc("");
                        setNewTripDst("");
                        setNewTripDist("");
                      }
                    }}
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none text-muted-foreground"
                  >
                    <option value="">-- Choose Corridor --</option>
                    {INDIAN_ROUTES.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.source} ➔ {route.destination}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Source City</label>
                  <input
                    type="text"
                    readOnly
                    required
                    value={newTripSrc}
                    placeholder="Auto-filled from corridor"
                    className="w-full rounded border bg-muted px-2.5 py-1.5 text-xs outline-none text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Destination</label>
                  <input
                    type="text"
                    readOnly
                    required
                    value={newTripDst}
                    placeholder="Auto-filled from corridor"
                    className="w-full rounded border bg-muted px-2.5 py-1.5 text-xs outline-none text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Vehicle</label>
                  <select
                    value={newTripVehId}
                    onChange={(e) => setNewTripVehId(e.target.value)}
                    required
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none text-muted-foreground"
                  >
                    <option value="">-- Choose Available --</option>
                    {/* MANDATORY BUSINESS RULE: Retired or In Shop vehicles must never appear in dispatch */}
                    {vehicles
                      .filter((v) => v.status === "AVAILABLE")
                      .map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.registrationNumber} - {v.name} (Max Cap: {v.maxLoadCapacity} kg)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Driver</label>
                  <select
                    value={newTripDrId}
                    onChange={(e) => setNewTripDrId(e.target.value)}
                    required
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none text-muted-foreground"
                  >
                    <option value="">-- Choose Available --</option>
                    {/* MANDATORY BUSINESS RULE: Drivers with expired licenses or Suspended status cannot be assigned */}
                    {drivers
                      .filter((d) => d.status === "AVAILABLE" && new Date(d.licenseExpiryDate) > new Date())
                      .map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} (Rating: {d.safetyScore}/100)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="trip-w">Cargo Weight (kg)</label>
                  <input
                    id="trip-w"
                    type="number"
                    required
                    value={newTripWeight}
                    onChange={(e) => setNewTripWeight(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="trip-d">Distance (km)</label>
                  <input
                    id="trip-d"
                    type="number"
                    required
                    value={newTripDist}
                    onChange={(e) => setNewTripDist(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="trip-r">Billing Revenue ($)</label>
                  <input
                    id="trip-r"
                    type="number"
                    required
                    value={newTripRev}
                    onChange={(e) => setNewTripRev(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save Trip Draft
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Action dialogs: Complete Trip */}
          {completingTripId && (
            <Card className="border border-emerald-500/20 bg-emerald-500/5 p-4 animate-in slide-in-from-top-2 duration-150 text-xs">
              <h3 className="font-bold text-emerald-600 mb-3 uppercase tracking-wider">Fast Complete Trip Override</h3>
              <form onSubmit={handleCompleteTrip} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground" htmlFor="mng-odo">Final Odometer</label>
                  <input
                    id="mng-odo"
                    type="number"
                    required
                    value={completingTripOdo}
                    onChange={(e) => setCompletingTripOdo(e.target.value)}
                    className="w-full rounded border bg-background p-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground" htmlFor="mng-fuel">Fuel Liters Used</label>
                  <input
                    id="mng-fuel"
                    type="number"
                    required
                    value={completingTripFuel}
                    onChange={(e) => setCompletingTripFuel(e.target.value)}
                    className="w-full rounded border bg-background p-1 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white rounded font-bold px-3 py-1.5 text-xs hover:bg-emerald-700 cursor-pointer"
                >
                  Save Complete
                </button>
                <button
                  onClick={() => setCompletingTripId(null)}
                  className="bg-card border rounded font-semibold px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </form>
            </Card>
          )}

          {/* Trips table */}
          <Card className="border border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Trip ID</TableHead>
                    <TableHead className="text-xs">Route Map</TableHead>
                    <TableHead className="text-xs">Vehicle (Mileage)</TableHead>
                    <TableHead className="text-xs">Driver</TableHead>
                    <TableHead className="text-xs">Load Weight</TableHead>
                    <TableHead className="text-xs">Revenue</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-mono text-xs py-3 font-semibold text-foreground">{t.tripNumber}</TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1">
                          <span>{t.source.split(",")[0]}</span>
                          <span>➔</span>
                          <span>{t.destination.split(",")[0]}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block font-mono">({t.plannedDistance} km)</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold block">{t.vehicleId?.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({t.vehicleId?.registrationNumber}, {t.vehicleId?.odometer} km)</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{t.driverId?.name}</TableCell>
                      <TableCell className="text-xs font-mono">{t.cargoWeight} kg</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-500">${t.revenue}</TableCell>
                      <TableCell className="text-xs py-3">
                        <Badge variant={
                          t.status === "DRAFT" ? "outline" : 
                          t.status === "DISPATCHED" ? "secondary" : 
                          t.status === "COMPLETED" ? "default" : "destructive"
                        } className={
                          t.status === "DISPATCHED" ? "bg-emerald-500/10 text-emerald-500 border-transparent" : 
                          t.status === "COMPLETED" ? "bg-blue-500/10 text-blue-500 border-transparent" : ""
                        }>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 space-x-1.5">
                        {t.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => handleDispatchTrip(t._id)}
                              className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold cursor-pointer"
                            >
                              Dispatch
                            </button>
                            <button
                              onClick={() => handleCancelTrip(t._id)}
                              className="px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === "DISPATCHED" && (
                          <>
                            <button
                              onClick={() => {
                                setCompletingTripId(t._id);
                                setCompletingTripOdo(String(t.vehicleId.odometer + t.plannedDistance));
                                setCompletingTripFuel(String(Math.round(t.plannedDistance / 3))); // estimate 3km/L
                              }}
                              className="px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-bold cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleCancelTrip(t._id)}
                              className="px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === "COMPLETED" && (
                          <span className="text-[10px] font-mono text-muted-foreground italic">
                            Odo: {t.finalOdometer} km / Fuel: {t.fuelConsumed}L
                          </span>
                        )}
                        {t.status === "CANCELLED" && (
                          <span className="text-[10px] text-muted-foreground italic">Cancelled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* TAB: MAINTENANCE */}
      {activeTab === "maintenance" && (
        <ScrollReveal className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Vehicle Maintenance Workshops</h2>
            <button
              onClick={() => setShowAddMaint(!showAddMaint)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Log Maintenance</span>
            </button>
          </div>

          {/* Add Maintenance Form Panel */}
          {showAddMaint && (
            <Card className="border border-border bg-card p-5 animate-in slide-in-from-top-4 duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Send Vehicle to Shop</h3>
              <form onSubmit={handleAddMaint} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Vehicle</label>
                  <select
                    value={newMaintVehId}
                    onChange={(e) => setNewMaintVehId(e.target.value)}
                    required
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none text-muted-foreground"
                  >
                    <option value="">-- Choose Available --</option>
                    {vehicles
                      .filter((v) => v.status === "AVAILABLE")
                      .map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.registrationNumber} - {v.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="maint-desc">Repair Description</label>
                  <input
                    id="maint-desc"
                    type="text"
                    required
                    value={newMaintDesc}
                    onChange={(e) => setNewMaintDesc(e.target.value)}
                    placeholder="e.g. 50k checkup / Brake replacement"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="maint-cost">Estimated Cost ($)</label>
                  <input
                    id="maint-cost"
                    type="number"
                    value={newMaintCost}
                    onChange={(e) => setNewMaintCost(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Log Workshop Entry
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Close Maintenance Form Panel */}
          {closingMaintId && (
            <Card className="border border-border bg-card p-4 animate-in slide-in-from-top-2 duration-150 text-xs">
              <h3 className="font-bold text-foreground mb-3 uppercase tracking-wider">Close maintenance work order</h3>
              <form onSubmit={handleCloseMaint} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground" htmlFor="cl-maint-cost">Final Invoice Cost ($)</label>
                  <input
                    id="cl-maint-cost"
                    type="number"
                    required
                    value={closingMaintCost}
                    onChange={(e) => setClosingMaintCost(e.target.value)}
                    className="w-full rounded border bg-background p-1 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground rounded font-bold px-3 py-1.5 text-xs hover:opacity-90 cursor-pointer"
                >
                  Close & Log Expense
                </button>
                <button
                  onClick={() => setClosingMaintId(null)}
                  className="bg-card border rounded font-semibold px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </form>
            </Card>
          )}

          {/* Maintenance list table */}
          <Card className="border border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Registration</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Shop Start Date</TableHead>
                    <TableHead className="text-xs">Cost</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-semibold text-xs py-3">{log.vehicleId?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{log.vehicleId?.registrationNumber}</TableCell>
                      <TableCell className="text-xs">{log.description}</TableCell>
                      <TableCell className="text-xs font-mono">{new Date(log.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-mono">${log.cost}</TableCell>
                      <TableCell className="text-xs py-3">
                        <Badge variant={log.status === "OPEN" ? "destructive" : "secondary"} className={
                          log.status === "OPEN" ? "bg-amber-500/10 text-amber-500 border-transparent animate-pulse" : ""
                        }>
                          {log.status === "OPEN" ? "In Shop" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {log.status === "OPEN" && (
                          <button
                            onClick={() => {
                              setClosingMaintId(log._id);
                              setClosingMaintCost(String(log.cost));
                            }}
                            className="px-2 py-0.5 rounded border border-primary/20 bg-primary/10 hover:bg-primary/20 text-foreground text-[10px] font-bold cursor-pointer"
                          >
                            Release Vehicle
                          </button>
                        )}
                        {log.status === "CLOSED" && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Released on {log.endDate ? new Date(log.endDate).toLocaleDateString() : ""}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* TAB: ANALYTICS */}
      {activeTab === "expenses" && (
        <ScrollReveal className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Financial Analytics & Expense Sheets</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Log Expense</span>
              </button>
              <button
                onClick={handleExportExpensesCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold cursor-pointer"
              >
                <Download className="size-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Add Manual Expense Form Panel */}
          {showAddExpense && (
            <Card className="border border-border bg-card p-5 animate-in slide-in-from-top-4 duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Log Direct Expense</h3>
              <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Vehicle</label>
                  <select
                    value={newExpVehId}
                    onChange={(e) => setNewExpVehId(e.target.value)}
                    required
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none text-muted-foreground"
                  >
                    <option value="">-- Choose Fleet Asset --</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.registrationNumber} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Expense Type</label>
                  <select
                    value={newExpType}
                    onChange={(e) => setNewExpType(e.target.value as any)}
                    className="w-full rounded border bg-background px-2.5 py-1.5 text-xs outline-none"
                  >
                    <option value="TOLL">Toll Charge</option>
                    <option value="OTHER">Other Operational Expense</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="exp-mng-cost">Expense Amount ($)</label>
                  <input
                    id="exp-mng-cost"
                    type="number"
                    required
                    value={newExpCost}
                    onChange={(e) => setNewExpCost(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase" htmlFor="exp-mng-desc">Description</label>
                  <input
                    id="exp-mng-desc"
                    type="text"
                    required
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    placeholder="e.g. Highway toll payment"
                    className="w-full rounded border bg-background px-2.5 py-1 text-xs outline-none"
                  />
                </div>
                <div className="md:col-span-4 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-primary-foreground py-1.5 px-6 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save Expense Record
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Recharts Graphical Dashboard Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart 1: ROI Leaderboard */}
            <Card className="border border-border bg-card p-6 shadow-sm hover:shadow-md transition-soft">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vehicle Lifetime ROI (%)</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">ROI calculated using (Trip Revenue - Cumulative Expenses) / Vehicle Acquisition Cost</CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-0">
                {vehiclesRoiData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">No ROI data calculated yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehiclesRoiData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                      <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis dataKey="regNumber" type="category" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.1 }} formatter={(value) => [`${value}%`, "ROI"]} contentStyle={{ fontSize: "11px", borderRadius: "12px", backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", backdropFilter: "blur(8px)" }} />
                      <Bar dataKey="roi" radius={[0, 4, 4, 0]} barSize={20}>
                        {vehiclesRoiData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.roi >= 0 ? "var(--color-primary)" : "var(--color-destructive)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Cost Breakdown */}
            <Card className="border border-border bg-card p-6 shadow-sm hover:shadow-md transition-soft">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Operational Spend Segmentation</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">Visual breakdown of fuel logs, maintenance, and toll charges</CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-0 flex items-center justify-center">
                {expensesPieData.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No expense logs recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={55}
                        paddingAngle={8}
                        stroke="none"
                      >
                        {expensesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, "Cost"]} contentStyle={{ fontSize: "11px", borderRadius: "12px", backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", backdropFilter: "blur(8px)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "10px", paddingTop: "20px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expenses Roster Table */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expense Log History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date logged</TableHead>
                    <TableHead className="text-xs">Vehicle Reg</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Cost</TableHead>
                    <TableHead className="text-xs">Fuel details</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="font-mono text-xs py-3">{new Date(e.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">{e.vehicleId?.registrationNumber || "N/A"}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={
                          e.type === "FUEL" ? "border-emerald-500 text-emerald-500 bg-emerald-500/5 text-[9px]" : 
                          e.type === "MAINTENANCE" ? "border-blue-500 text-blue-500 bg-blue-500/5 text-[9px]" : 
                          "text-[9px]"
                        }>
                          {e.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">${e.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">{e.fuelLiters ? `${e.fuelLiters} L` : "--"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.description || "Direct Cost"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {activeTab === "live-map" && (
        <ScrollReveal className="space-y-6">
          <LiveFleetMap />
        </ScrollReveal>
      )}
    </div>
  );
}
