import mongoose, { Schema, Document } from "mongoose";

export interface IDriver extends Document {
  name: string;
  licenseNumber: string;
  licenseCategory: "CLASS_A" | "CLASS_B" | "CLASS_C";
  licenseExpiryDate: Date;
  contactNumber: string;
  safetyScore: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
}

const DriverSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    licenseCategory: {
      type: String,
      enum: ["CLASS_A", "CLASS_B", "CLASS_C"],
      required: true,
    },
    licenseExpiryDate: { type: Date, required: true },
    contactNumber: { type: String, required: true, trim: true },
    safetyScore: { type: Number, required: true, min: 0, max: 100, default: 100 },
    status: {
      type: String,
      enum: ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"],
      required: true,
      default: "AVAILABLE",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Driver || mongoose.model<IDriver>("Driver", DriverSchema);
