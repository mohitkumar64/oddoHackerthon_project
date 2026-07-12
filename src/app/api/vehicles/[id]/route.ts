import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import Expense from "@/models/Expense";
import Trip from "@/models/Trip";
import MaintenanceLog from "@/models/MaintenanceLog";
import { vehicleSchema } from "@/lib/validations";
import { verifyToken } from "@/lib/jwt";

function checkAuth(request: Request) {
  const authHeader = request.headers.get("cookie") || "";
  const tokenMatch = authHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return decoded;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    // Retrieve all expenses for this vehicle
    const expenses = await Expense.find({ vehicleId: id });
    const fuelExpense = expenses.filter(e => e.type === "FUEL").reduce((sum, e) => sum + e.cost, 0);
    const maintExpense = expenses.filter(e => e.type === "MAINTENANCE").reduce((sum, e) => sum + e.cost, 0);
    const tollExpense = expenses.filter(e => e.type === "TOLL").reduce((sum, e) => sum + e.cost, 0);
    const otherExpense = expenses.filter(e => e.type === "OTHER").reduce((sum, e) => sum + e.cost, 0);
    const totalExpenses = fuelExpense + maintExpense + tollExpense + otherExpense;

    // Retrieve all completed trips for this vehicle to sum revenue
    const completedTrips = await Trip.find({ vehicleId: id, status: "COMPLETED" });
    const totalRevenue = completedTrips.reduce((sum, t) => sum + t.revenue, 0);

    // Retrieve maintenance logs
    const maintenanceLogs = await MaintenanceLog.find({ vehicleId: id }).sort({ startDate: -1 });

    // Calculate ROI: (Revenue - Expenses) / Acquisition Cost
    const roi = vehicle.acquisitionCost > 0
      ? (totalRevenue - totalExpenses) / vehicle.acquisitionCost
      : 0;

    // Calculate Fuel Efficiency: total completed trip distance / total fuel liters
    const totalDistance = completedTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
    const totalFuelLiters = expenses.filter(e => e.type === "FUEL" && e.fuelLiters).reduce((sum, e) => sum + (e.fuelLiters || 0), 0);
    const fuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;

    return NextResponse.json({
      vehicle,
      metrics: {
        totalRevenue,
        totalExpenses,
        fuelExpense,
        maintExpense,
        tollExpense,
        otherExpense,
        roi,
        fuelEfficiency,
        completedTripsCount: completedTrips.length,
      },
      maintenanceLogs,
    });
  } catch (error: any) {
    console.error("GET vehicle detail error:", error);
    return NextResponse.json({ message: "Failed to fetch vehicle details" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can modify vehicles" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    // Validate request schema
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    // Check unique registration (excluding this vehicle)
    const existingVehicle = await Vehicle.findOne({
      registrationNumber: parsed.data.registrationNumber.toUpperCase(),
      _id: { $ne: id },
    });
    if (existingVehicle) {
      return NextResponse.json(
        { message: `Vehicle with registration number ${parsed.data.registrationNumber} already exists.` },
        { status: 409 }
      );
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      { ...parsed.data, registrationNumber: parsed.data.registrationNumber.toUpperCase() },
      { new: true }
    );

    if (!updatedVehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(updatedVehicle);
  } catch (error: any) {
    console.error("PUT vehicle error:", error);
    return NextResponse.json({ message: "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can delete vehicles" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;

    // Soft delete/retire rather than hard deleting if referencing active trips, or check active trips
    const activeTrips = await Trip.findOne({ vehicleId: id, status: { $in: ["DISPATCHED", "DRAFT"] } });
    if (activeTrips) {
      return NextResponse.json(
        { message: "Cannot delete vehicle with active or scheduled trips. Please cancel or complete them first." },
        { status: 400 }
      );
    }

    // Mark status as RETIRED
    const vehicle = await Vehicle.findByIdAndUpdate(id, { status: "RETIRED" }, { new: true });
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehicle successfully retired.", vehicle });
  } catch (error: any) {
    console.error("DELETE vehicle error:", error);
    return NextResponse.json({ message: "Failed to retire vehicle" }, { status: 500 });
  }
}
