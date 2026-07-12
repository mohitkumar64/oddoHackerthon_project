import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Vehicle from "@/models/Vehicle";
import Driver from "@/models/Driver";
import Trip from "@/models/Trip";
import MaintenanceLog from "@/models/MaintenanceLog";
import Expense from "@/models/Expense";

export async function POST() {
  try {
    await connectToDatabase();

    // Wipe collections
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Driver.deleteMany({});
    await Trip.deleteMany({});
    await MaintenanceLog.deleteMany({});
    await Expense.deleteMany({});

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const commonPasswordHash = await bcrypt.hash("password123", salt);

    // 1. Create Drivers
    const driverJohn = await Driver.create({
      name: "John Doe",
      licenseNumber: "LIC-11223",
      licenseCategory: "CLASS_A",
      licenseExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expiries in 30 days (warning)
      contactNumber: "+1-555-0199",
      safetyScore: 88,
      status: "AVAILABLE",
    });

    const driverAlex = await Driver.create({
      name: "Alex Smith",
      licenseNumber: "LIC-99881",
      licenseCategory: "CLASS_A",
      licenseExpiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // Expiries in 6 months
      contactNumber: "+1-555-0155",
      safetyScore: 96,
      status: "AVAILABLE",
    });

    const driverSarah = await Driver.create({
      name: "Sarah Jenkins",
      licenseNumber: "LIC-44332",
      licenseCategory: "CLASS_B",
      licenseExpiryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Expired 15 days ago
      contactNumber: "+1-555-0133",
      safetyScore: 65,
      status: "SUSPENDED",
    });

    const driverMike = await Driver.create({
      name: "Mike Miller",
      licenseNumber: "LIC-55667",
      licenseCategory: "CLASS_C",
      licenseExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expiries in 1 year
      contactNumber: "+1-555-0144",
      safetyScore: 78,
      status: "AVAILABLE",
    });

    // 2. Create Users
    await User.create([
      {
        email: "admin@transitops.com",
        passwordHash: commonPasswordHash,
        name: "Admin User",
        role: "ADMIN",
      },
      {
        email: "manager@transitops.com",
        passwordHash: commonPasswordHash,
        name: "Fleet Manager User",
        role: "FLEET_MANAGER",
      },
      {
        email: "safety@transitops.com",
        passwordHash: commonPasswordHash,
        name: "Safety Officer User",
        role: "SAFETY_OFFICER",
      },
      {
        email: "driver@transitops.com",
        passwordHash: commonPasswordHash,
        name: "John Doe (Driver)",
        role: "DRIVER",
        driverId: driverJohn._id,
      },
      {
        email: "driver2@transitops.com",
        passwordHash: commonPasswordHash,
        name: "Alex Smith (Driver)",
        role: "DRIVER",
        driverId: driverAlex._id,
      },
    ]);

    // 3. Create Vehicles
    const vehicleVolvo = await Vehicle.create({
      registrationNumber: "REG-1111",
      name: "Volvo FH16 (Heavy Cargo)",
      type: "TRUCK",
      maxLoadCapacity: 18000, // 18 tons
      odometer: 120500,
      acquisitionCost: 165000,
      status: "AVAILABLE",
      region: "Midwest",
    });

    const vehicleFord = await Vehicle.create({
      registrationNumber: "REG-2222",
      name: "Ford Transit E-Transit",
      type: "VAN",
      maxLoadCapacity: 1600, // 1.6 tons
      odometer: 32000,
      acquisitionCost: 45000,
      status: "AVAILABLE",
      region: "Northeast",
    });

    const vehicleVan05 = await Vehicle.create({
      registrationNumber: "VAN-05",
      name: "Mercedes Sprinter Van-05",
      type: "VAN",
      maxLoadCapacity: 2500,
      odometer: 8400,
      acquisitionCost: 52000,
      status: "AVAILABLE",
      region: "Midwest",
    });

    const vehiclePrius = await Vehicle.create({
      registrationNumber: "REG-4444",
      name: "Toyota Prius (Courier)",
      type: "CAR",
      maxLoadCapacity: 450,
      odometer: 94100,
      acquisitionCost: 28000,
      status: "IN_SHOP", // Vehicle in shop
      region: "South",
    });

    const vehicleOldDump = await Vehicle.create({
      registrationNumber: "REG-5555",
      name: "Peterbilt Dump Truck",
      type: "TRUCK",
      maxLoadCapacity: 22000,
      odometer: 540000,
      acquisitionCost: 110000,
      status: "RETIRED", // Retired vehicle
      region: "West",
    });

    // 4. Create Trips
    // Trip 1: Completed Trip (generates revenue and expenses)
    const trip1 = await Trip.create({
      tripNumber: "TRIP-2026-001",
      source: "Indianapolis, IN",
      destination: "Chicago, IL",
      vehicleId: vehicleVolvo._id,
      driverId: driverAlex._id,
      cargoWeight: 12000,
      plannedDistance: 290,
      revenue: 2800,
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fuelConsumed: 95,
      finalOdometer: 120500, // starting was 120210
    });

    // Create expenses for Completed Trip 1
    await Expense.create([
      {
        vehicleId: vehicleVolvo._id,
        tripId: trip1._id,
        type: "FUEL",
        cost: 320,
        fuelLiters: 95,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        description: "Fuel refill in Chicago",
      },
      {
        vehicleId: vehicleVolvo._id,
        tripId: trip1._id,
        type: "TOLL",
        cost: 45,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        description: "I-90 Expressway Tolls",
      },
    ]);

    // Trip 2: Dispatched Trip (active trip, locks vehicle/driver)
    const trip2 = await Trip.create({
      tripNumber: "TRIP-2026-002",
      source: "New York, NY",
      destination: "Boston, MA",
      vehicleId: vehicleFord._id,
      driverId: driverJohn._id,
      cargoWeight: 1100,
      plannedDistance: 340,
      revenue: 1400,
      status: "DISPATCHED",
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    });

    // Update Ford and John status to On Trip
    await Vehicle.findByIdAndUpdate(vehicleFord._id, { status: "ON_TRIP" });
    await Driver.findByIdAndUpdate(driverJohn._id, { status: "ON_TRIP" });

    // Trip 3: Draft Trip (unassigned/pending dispatch)
    await Trip.create({
      tripNumber: "TRIP-2026-003",
      source: "Detroit, MI",
      destination: "Cleveland, OH",
      vehicleId: vehicleVan05._id,
      driverId: driverMike._id,
      cargoWeight: 1800,
      plannedDistance: 270,
      revenue: 950,
      status: "DRAFT",
    });

    // 5. Create Maintenance Logs
    // Active Maintenance (Prius)
    const maint1 = await MaintenanceLog.create({
      vehicleId: vehiclePrius._id,
      description: "HV Battery swap and brake pad inspection",
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "OPEN",
    });

    // Past Maintenance (Volvo)
    const maint2 = await MaintenanceLog.create({
      vehicleId: vehicleVolvo._id,
      description: "Routine 120k Oil Change and Filter replacement",
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      cost: 450,
      status: "CLOSED",
    });

    // Log expense for Closed Maintenance 2
    await Expense.create({
      vehicleId: vehicleVolvo._id,
      type: "MAINTENANCE",
      cost: 450,
      date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      description: "Invoice #M-58810: Volvo routine service",
    });

    return NextResponse.json({
      message: "Database successfully reset and seeded with default operational records.",
    });
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return NextResponse.json(
      { message: "Seeding failed", error: error.message },
      { status: 500 }
    );
  }
}
