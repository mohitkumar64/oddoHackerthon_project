import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Driver from "@/models/Driver";
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

export async function GET() {
  try {
    await connectToDatabase();
    const drivers = await Driver.find({}).sort({ name: 1 });
    return NextResponse.json(drivers);
  } catch (error: any) {
    console.error("GET drivers error:", error);
    return NextResponse.json({ message: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user || (user.role !== "ADMIN" && user.role !== "FLEET_MANAGER")) {
      return NextResponse.json(
        { message: "Forbidden: Only Admin or Fleet Manager can register drivers" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = driverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status } = parsed.data;

    // Check unique license number
    const existingDriver = await Driver.findOne({ licenseNumber: licenseNumber.toUpperCase() });
    if (existingDriver) {
      return NextResponse.json(
        { message: `Driver with license number ${licenseNumber} already exists.` },
        { status: 409 }
      );
    }

    const newDriver = await Driver.create({
      name,
      licenseNumber: licenseNumber.toUpperCase(),
      licenseCategory,
      licenseExpiryDate,
      contactNumber,
      safetyScore,
      status,
    });

    return NextResponse.json(newDriver, { status: 201 });
  } catch (error: any) {
    console.error("POST driver error:", error);
    return NextResponse.json({ message: "Failed to create driver" }, { status: 500 });
  }
}
