import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import Driver from "@/models/Driver";
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
    // Drivers can complete their own trips, as well as Managers/Admins
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const { finalOdometer, fuelConsumed, fuelCost } = body;

    // Validate inputs
    if (finalOdometer === undefined || fuelConsumed === undefined) {
      return NextResponse.json({ message: "finalOdometer and fuelConsumed are required" }, { status: 400 });
    }

    const odoNum = Number(finalOdometer);
    const fuelLiters = Number(fuelConsumed);
    if (isNaN(odoNum) || odoNum < 0 || isNaN(fuelLiters) || fuelLiters < 0) {
      return NextResponse.json({ message: "Invalid odometer or fuel values" }, { status: 400 });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    if (trip.status !== "DISPATCHED") {
      return NextResponse.json(
        { message: `Cannot complete a trip that is currently in status: ${trip.status}` },
        { status: 400 }
      );
    }

    // Verify driver completes their own trip (unless they are admin/manager)
    if (user.role === "DRIVER" && user.driverId?.toString() !== trip.driverId.toString()) {
      return NextResponse.json(
        { message: "Forbidden: Drivers can only complete their own assigned trips" },
        { status: 403 }
      );
    }

    // Fetch vehicle
    const vehicle = await Vehicle.findById(trip.vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    // MANDATORY BUSINESS RULE: Odometer check (final odometer must be greater than or equal to current vehicle odometer)
    if (odoNum < vehicle.odometer) {
      return NextResponse.json(
        { message: `Invalid Odometer: final odometer (${odoNum} km) cannot be less than vehicle's current odometer (${vehicle.odometer} km)` },
        { status: 400 }
      );
    }

    // Complete trip
    trip.status = "COMPLETED";
    trip.completedAt = new Date();
    trip.fuelConsumed = fuelLiters;
    trip.finalOdometer = odoNum;
    await trip.save();

    // Release vehicle & update odometer
    vehicle.status = "AVAILABLE";
    vehicle.odometer = odoNum;
    await vehicle.save();

    // Release driver
    await Driver.findByIdAndUpdate(trip.driverId, { status: "AVAILABLE" });

    // Automatically create a FUEL expense record for the vehicle
    const calculatedCost = fuelCost !== undefined ? Number(fuelCost) : fuelLiters * 2.50; // default to $2.50 per liter if not specified
    
    await Expense.create({
      vehicleId: trip.vehicleId,
      tripId: trip._id,
      type: "FUEL",
      cost: calculatedCost,
      fuelLiters: fuelLiters,
      date: new Date(),
      description: `Fuel consumption logged on Trip ${trip.tripNumber}`,
    });

    return NextResponse.json({
      message: "Trip completed successfully. Vehicle and Driver released to Available status.",
      trip,
      fuelExpenseCost: calculatedCost,
    });
  } catch (error: any) {
    console.error("Trip completion error:", error);
    return NextResponse.json({ message: "Failed to complete trip" }, { status: 500 });
  }
}
