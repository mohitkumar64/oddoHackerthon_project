import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Vehicle from "@/models/Vehicle";
import { vehicleSchema } from "@/lib/validations";
import { verifyToken } from "@/lib/jwt";

// Helper to check for Admin or Fleet Manager authorization
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
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const region = searchParams.get("region");

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (region) query.region = region;

    const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
    return NextResponse.json(vehicles);
  } catch (error: any) {
    console.error("GET vehicles error:", error);
    return NextResponse.json({ message: "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can register vehicles" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, status, region } = parsed.data;

    // Check unique registration number
    const existingVehicle = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (existingVehicle) {
      return NextResponse.json(
        { message: `Vehicle with registration number ${registrationNumber} already exists.` },
        { status: 409 }
      );
    }

    const newVehicle = await Vehicle.create({
      registrationNumber: registrationNumber.toUpperCase(),
      name,
      type,
      maxLoadCapacity,
      odometer,
      acquisitionCost,
      status,
      region,
    });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error: any) {
    console.error("POST vehicle error:", error);
    return NextResponse.json({ message: "Failed to create vehicle" }, { status: 500 });
  }
}
