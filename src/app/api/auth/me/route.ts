import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Retrieve cookie
    const authHeader = request.headers.get("cookie") || "";
    const tokenMatch = authHeader.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ authenticated: false, message: "No token found" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false, message: "Invalid or expired token" }, { status: 401 });
    }

    // Double check that user still exists in DB
    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ authenticated: false, message: "User not found" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        driverId: user.driverId,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ authenticated: false, message: "Internal server error" }, { status: 500 });
  }
}
