import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  role: z.enum(["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "DRIVER"]),
  driverId: z.string().optional(),
});

export const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(3, "Registration number must be at least 3 characters")
    .max(15, "Registration number cannot exceed 15 characters")
    .regex(/^[a-zA-Z0-9-]+$/, "Must be alphanumeric (hyphens allowed)"),
  name: z.string().min(2, "Vehicle name/model is required"),
  type: z.enum(["TRUCK", "VAN", "CAR"]),
  maxLoadCapacity: z.coerce.number().positive("Capacity must be greater than zero"),
  odometer: z.coerce.number().nonnegative("Odometer must be non-negative"),
  acquisitionCost: z.coerce.number().positive("Cost must be greater than zero"),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).default("AVAILABLE"),
  region: z.string().min(2, "Region is required"),
});

export const driverSchema = z.object({
  name: z.string().min(2, "Driver name must be at least 2 characters"),
  licenseNumber: z.string().min(5, "License number must be at least 5 characters"),
  licenseCategory: z.enum(["CLASS_A", "CLASS_B", "CLASS_C"]),
  licenseExpiryDate: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
    message: "Invalid license expiry date",
  }),
  contactNumber: z.string().min(8, "Contact number must be at least 8 characters"),
  safetyScore: z.coerce.number().min(0).max(100).default(100),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).default("AVAILABLE"),
});

export const tripSchema = z.object({
  source: z.string().min(2, "Source location is required"),
  destination: z.string().min(2, "Destination location is required"),
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Vehicle reference"),
  driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Driver reference"),
  cargoWeight: z.coerce.number().positive("Weight must be greater than zero"),
  plannedDistance: z.coerce.number().positive("Distance must be greater than zero"),
  revenue: z.coerce.number().positive("Revenue must be greater than zero"),
});

export const maintenanceSchema = z.object({
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Vehicle reference"),
  description: z.string().min(3, "Description is required"),
  startDate: z.coerce.date(),
  cost: z.coerce.number().nonnegative("Cost must be non-negative"),
});

export const expenseSchema = z.object({
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Vehicle reference"),
  tripId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Trip reference").optional(),
  type: z.enum(["FUEL", "MAINTENANCE", "TOLL", "OTHER"]),
  cost: z.coerce.number().positive("Cost must be greater than zero"),
  fuelLiters: z.coerce.number().positive("Fuel liters must be positive").optional(),
  description: z.string().optional(),
  date: z.coerce.date().default(() => new Date()),
});
