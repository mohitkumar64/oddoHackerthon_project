import mongoose, { Schema, Document } from "mongoose";

export interface ITrip extends Document {
  tripNumber: string;
  source: string;
  destination: string;
  vehicleId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  cargoWeight: number; // in kg
  plannedDistance: number; // in km
  revenue: number; // billing amount
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  startedAt?: Date;
  completedAt?: Date;
  fuelConsumed?: number; // in liters
  finalOdometer?: number; // in km
}

const TripSchema: Schema = new Schema(
  {
    tripNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    cargoWeight: { type: Number, required: true, min: 0 },
    plannedDistance: { type: Number, required: true, min: 0 },
    revenue: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"],
      required: true,
      default: "DRAFT",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    fuelConsumed: { type: Number, min: 0 },
    finalOdometer: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);
