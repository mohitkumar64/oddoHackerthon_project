import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
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
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Only Admin can update user roles" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    const validRoles = ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "DRIVER"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role value" }, { status: 400 });
    }

    // Prevent Admin from updating their own role (which could lock them out)
    if (user.userId === id) {
      return NextResponse.json({ message: "Forbidden: You cannot change your own role" }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-passwordHash");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("PUT user error:", error);
    return NextResponse.json({ message: "Failed to update user role" }, { status: 500 });
  }
}
