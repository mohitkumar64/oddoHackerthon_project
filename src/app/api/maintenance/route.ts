import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MaintenanceLog from "@/models/MaintenanceLog";
import Vehicle from "@/models/Vehicle";
import { maintenanceSchema } from "@/lib/validations";
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

export async function GET() {
  try {
    await connectToDatabase();
    const logs = await MaintenanceLog.find({})
      .populate("vehicleId")
      .sort({ startDate: -1 });
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("GET maintenance logs error:", error);
    return NextResponse.json({ message: "Failed to fetch maintenance logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can log maintenance events" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = maintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { vehicleId, description, startDate, cost } = parsed.data;

    // Verify vehicle exists and is available for maintenance (cannot be on trip)
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.status === "ON_TRIP") {
      return NextResponse.json(
        { message: "Cannot place a vehicle in maintenance while it is currently On Trip." },
        { status: 400 }
      );
    }

    // Create maintenance record
    const newLog = await MaintenanceLog.create({
      vehicleId,
      description,
      startDate,
      cost,
      status: "OPEN",
    });

    // MANDATORY BUSINESS RULE: Creating an active maintenance record automatically changes vehicle status to In Shop
    vehicle.status = "IN_SHOP";
    await vehicle.save();

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("POST maintenance log error:", error);
    return NextResponse.json({ message: "Failed to log maintenance" }, { status: 500 });
  }
}
