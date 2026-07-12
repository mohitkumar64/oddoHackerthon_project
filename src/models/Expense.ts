import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  vehicleId: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  type: "FUEL" | "MAINTENANCE" | "TOLL" | "OTHER";
  cost: number;
  fuelLiters?: number; // Only for FUEL type
  date: Date;
  description?: string;
}

const ExpenseSchema: Schema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    type: {
      type: String,
      enum: ["FUEL", "MAINTENANCE", "TOLL", "OTHER"],
      required: true,
    },
    cost: { type: Number, required: true, min: 0 },
    fuelLiters: {
      type: Number,
      min: 0,
      required: function (this: IExpense) {
        return this.type === "FUEL";
      },
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
