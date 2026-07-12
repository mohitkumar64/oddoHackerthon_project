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

export async function GET(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Only Admin can access the user registry" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    // Return all users, excluding password hashes
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("GET users error:", error);
    return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
  }
}
