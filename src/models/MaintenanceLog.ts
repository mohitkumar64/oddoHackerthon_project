import mongoose, { Schema, Document } from "mongoose";

export interface IMaintenanceLog extends Document {
  vehicleId: mongoose.Types.ObjectId;
  description: string;
  startDate: Date;
  endDate?: Date;
  cost: number;
  status: "OPEN" | "CLOSED";
}

const MaintenanceLogSchema: Schema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    description: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    cost: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      required: true,
      default: "OPEN",
    },
  },
  { timestamps: true }
);

export default mongoose.models.MaintenanceLog ||
  mongoose.model<IMaintenanceLog>("MaintenanceLog", MaintenanceLogSchema);
