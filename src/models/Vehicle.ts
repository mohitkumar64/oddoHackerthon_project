import mongoose, { Schema, Document } from "mongoose";

export interface IVehicle extends Document {
  registrationNumber: string;
  name: string;
  type: "TRUCK" | "VAN" | "CAR";
  maxLoadCapacity: number; // in kg
  odometer: number; // in km
  acquisitionCost: number;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
  region: string;
}

const VehicleSchema: Schema = new Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["TRUCK", "VAN", "CAR"],
      required: true,
    },
    maxLoadCapacity: { type: Number, required: true, min: 0 },
    odometer: { type: Number, required: true, min: 0 },
    acquisitionCost: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"],
      required: true,
      default: "AVAILABLE",
    },
    region: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);
