import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Expense from "@/models/Expense";
import { expenseSchema } from "@/lib/validations";
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
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    const query: any = {};
    if (vehicleId) query.vehicleId = vehicleId;

    const expenses = await Expense.find(query)
      .populate("vehicleId")
      .populate("tripId")
      .sort({ date: -1 });

    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error("GET expenses error:", error);
    return NextResponse.json({ message: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate request schema
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { vehicleId, tripId, type, cost, fuelLiters, description, date } = parsed.data;

    // Create expense log
    const newExpense = await Expense.create({
      vehicleId,
      tripId,
      type,
      cost,
      fuelLiters,
      date,
      description,
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error("POST expense error:", error);
    return NextResponse.json({ message: "Failed to create expense log" }, { status: 500 });
  }
}
