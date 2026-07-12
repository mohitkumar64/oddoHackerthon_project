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
        { message: "Forbidden: Only Admin or Fleet Manager can cancel trips" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;

    const trip = await Trip.findById(id);
    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
      return NextResponse.json(
        { message: `Cannot cancel a trip that is already ${trip.status}` },
        { status: 400 }
      );
    }

    const originalStatus = trip.status;
    
    // Update trip status to CANCELLED
    trip.status = "CANCELLED";
    await trip.save();

    // If trip was dispatched, restore vehicle and driver to AVAILABLE
    if (originalStatus === "DISPATCHED") {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "AVAILABLE" });
      await Driver.findByIdAndUpdate(trip.driverId, { status: "AVAILABLE" });
    }

    return NextResponse.json({
      message: "Trip cancelled successfully. Assets restored to Available if previously dispatched.",
      trip,
    });
  } catch (error: any) {
    console.error("Trip cancellation error:", error);
    return NextResponse.json({ message: "Failed to cancel trip" }, { status: 500 });
  }
}
