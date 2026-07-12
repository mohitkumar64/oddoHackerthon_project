import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MaintenanceLog from "@/models/MaintenanceLog";
import Vehicle from "@/models/Vehicle";
import Expense from "@/models/Expense";
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can close maintenance events" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const { cost } = body;
    const finalCost = cost !== undefined ? Number(cost) : undefined;
    if (finalCost !== undefined && (isNaN(finalCost) || finalCost < 0)) {
      return NextResponse.json({ message: "Invalid cost value" }, { status: 400 });
    }

    const log = await MaintenanceLog.findById(id);
    if (!log) {
      return NextResponse.json({ message: "Maintenance log not found" }, { status: 404 });
    }

    if (log.status !== "OPEN") {
      return NextResponse.json(
        { message: `Cannot close a maintenance record that is currently: ${log.status}` },
        { status: 400 }
      );
    }

    // Update maintenance log details
    log.status = "CLOSED";
    log.endDate = new Date();
    if (finalCost !== undefined) {
      log.cost = finalCost;
    }
    await log.save();

    // Fetch and restore vehicle status
    const vehicle = await Vehicle.findById(log.vehicleId);
    if (vehicle) {
      // MANDATORY BUSINESS RULE: Closing maintenance restores the vehicle to Available (unless retired)
      if (vehicle.status !== "RETIRED") {
        vehicle.status = "AVAILABLE";
        await vehicle.save();
      }
    }

    // Automatically log a MAINTENANCE expense
    await Expense.create({
      vehicleId: log.vehicleId,
      type: "MAINTENANCE",
      cost: log.cost,
      date: new Date(),
      description: `Maintenance Work Order: ${log.description}`,
    });

    return NextResponse.json({
      message: "Maintenance work order closed. Vehicle restored to Available status.",
      log,
    });
  } catch (error: any) {
    console.error("Close maintenance log error:", error);
    return NextResponse.json({ message: "Failed to close maintenance work order" }, { status: 500 });
  }
}
