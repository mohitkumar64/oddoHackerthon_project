import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Driver from "@/models/Driver";
import Trip from "@/models/Trip";
import { driverSchema } from "@/lib/validations";
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER" && user.role !== "SAFETY_OFFICER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin, Fleet Manager, or Safety Officer can modify drivers" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    // Validate request schema
    const parsed = driverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    // Check unique license number (excluding this driver)
    const existingDriver = await Driver.findOne({
      licenseNumber: parsed.data.licenseNumber.toUpperCase(),
      _id: { $ne: id },
    });
    if (existingDriver) {
      return NextResponse.json(
        { message: `Driver with license number ${parsed.data.licenseNumber} already exists.` },
        { status: 409 }
      );
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { ...parsed.data, licenseNumber: parsed.data.licenseNumber.toUpperCase() },
      { new: true }
    );

    if (!updatedDriver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(updatedDriver);
  } catch (error: any) {
    console.error("PUT driver error:", error);
    return NextResponse.json({ message: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can delete drivers" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;

    // Check if driver has active trips
    const activeTrips = await Trip.findOne({ driverId: id, status: { $in: ["DISPATCHED", "DRAFT"] } });
    if (activeTrips) {
      return NextResponse.json(
        { message: "Cannot delete driver assigned to active or scheduled trips." },
        { status: 400 }
      );
    }

    const deletedDriver = await Driver.findByIdAndDelete(id);
    if (!deletedDriver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Driver successfully removed." });
  } catch (error: any) {
    console.error("DELETE driver error:", error);
    return NextResponse.json({ message: "Failed to delete driver" }, { status: 500 });
  }
}
