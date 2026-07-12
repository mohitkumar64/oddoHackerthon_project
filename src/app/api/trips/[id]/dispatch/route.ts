import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import Driver from "@/models/Driver";
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
        { message: "Forbidden: Only Admin or Fleet Manager can dispatch trips" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;

    const trip = await Trip.findById(id);
    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    if (trip.status !== "DRAFT") {
      return NextResponse.json(
        { message: `Cannot dispatch a trip that is currently in status: ${trip.status}` },
        { status: 400 }
      );
    }

    // Fetch and check vehicle status
    const vehicle = await Vehicle.findById(trip.vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    // MANDATORY BUSINESS RULE: Retired or In Shop vehicles must never appear in dispatch
    if (vehicle.status === "IN_SHOP") {
      return NextResponse.json({ message: "Assigned vehicle is currently In Shop for maintenance." }, { status: 400 });
    }
    if (vehicle.status === "RETIRED") {
      return NextResponse.json({ message: "Assigned vehicle has been Retired." }, { status: 400 });
    }
    if (vehicle.status === "ON_TRIP") {
      return NextResponse.json({ message: "Assigned vehicle is already On Trip." }, { status: 400 });
    }

    // Fetch and check driver status
    const driver = await Driver.findById(trip.driverId);
    if (!driver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    // MANDATORY BUSINESS RULE: Drivers with expired licenses or Suspended status cannot be assigned to trips
    if (driver.status === "SUSPENDED") {
      return NextResponse.json({ message: "Assigned driver is Suspended." }, { status: 400 });
    }
    
    const today = new Date();
    if (new Date(driver.licenseExpiryDate) <= today) {
      return NextResponse.json(
        { message: `Assigned driver's license expired on ${new Date(driver.licenseExpiryDate).toLocaleDateString()}` },
        { status: 400 }
      );
    }

    // MANDATORY BUSINESS RULE: A driver already marked On Trip cannot be assigned to another trip
    if (driver.status === "ON_TRIP") {
      return NextResponse.json({ message: "Assigned driver is already On Trip." }, { status: 400 });
    }

    // Double check cargo weight is still valid
    if (trip.cargoWeight > vehicle.maxLoadCapacity) {
      return NextResponse.json(
        { message: "Cargo weight exceeds vehicle max load capacity." },
        { status: 400 }
      );
    }

    // Atomic update of statuses
    trip.status = "DISPATCHED";
    trip.startedAt = new Date();
    await trip.save();

    vehicle.status = "ON_TRIP";
    await vehicle.save();

    driver.status = "ON_TRIP";
    await driver.save();

    return NextResponse.json({
      message: "Trip dispatched successfully. Vehicle and Driver locked on trip.",
      trip,
    });
  } catch (error: any) {
    console.error("Trip dispatch error:", error);
    return NextResponse.json({ message: "Failed to dispatch trip" }, { status: 500 });
  }
}
