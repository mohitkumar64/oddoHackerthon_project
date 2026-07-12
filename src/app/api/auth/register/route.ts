import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { registerSchema } from "@/lib/validations";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password, name, role, driverId } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    // Role assignment security rule: role assignment (other than DRIVER) can only be done by Admin or Fleet Manager
    if (role !== "DRIVER") {
      const userCount = await User.countDocuments();
      // If users already exist, require authentication and manager/admin role
      if (userCount > 0) {
        const authHeader = request.headers.get("cookie") || "";
        const tokenMatch = authHeader.match(/token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
          return NextResponse.json(
            { message: "Authentication required to assign privileged roles" },
            { status: 401 }
          );
        }

        const decoded = verifyToken(token);
        if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "FLEET_MANAGER")) {
          return NextResponse.json(
            { message: "Forbidden: Only Admin or Fleet Manager can assign privileged roles" },
            { status: 403 }
          );
        }
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const newUser = await User.create({
      email,
      passwordHash,
      name,
      role,
      driverId: driverId || undefined,
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
