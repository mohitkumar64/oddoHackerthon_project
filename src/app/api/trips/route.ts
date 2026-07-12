import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import Driver from "@/models/Driver";
import { tripSchema } from "@/lib/validations";
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

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const driverId = searchParams.get("driverId");

    const query: any = {};
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;

    const trips = await Trip.find(query)
      .populate("vehicleId")
      .populate("driverId")
      .sort({ createdAt: -1 });

    return NextResponse.json(trips);
  } catch (error: any) {
    console.error("GET trips error:", error);
    return NextResponse.json({ message: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can plan trips" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = tripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = parsed.data;

    // Fetch the vehicle to verify cargo weight capacity
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Assigned vehicle not found" }, { status: 404 });
    }

    // MANDATORY BUSINESS RULE: Cargo Weight must not exceed the vehicle's maximum load capacity
    if (cargoWeight > vehicle.maxLoadCapacity) {
      return NextResponse.json(
        {
          message: `Cargo weight (${cargoWeight} kg) exceeds vehicle's maximum capacity (${vehicle.maxLoadCapacity} kg).`,
        },
        { status: 400 }
      );
    }

    // Verify driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return NextResponse.json({ message: "Assigned driver not found" }, { status: 404 });
    }

    // Generate unique Trip Number (TRIP-YYYYMMDD-Random)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tripNumber = `TRIP-${dateStr}-${randomSuffix}`;

    const newTrip = await Trip.create({
      tripNumber,
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeight,
      plannedDistance,
      revenue,
      status: "DRAFT",
    });

    return NextResponse.json(newTrip, { status: 201 });
  } catch (error: any) {
    console.error("POST trip error:", error);
    return NextResponse.json({ message: "Failed to create trip draft" }, { status: 500 });
  }
}
