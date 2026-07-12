import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "ADMIN" | "FLEET_MANAGER" | "SAFETY_OFFICER" | "DRIVER";
  driverId?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "FLEET_MANAGER", "SAFETY_OFFICER", "DRIVER"],
      required: true,
      default: "DRIVER",
    },
    driverId: { type: Schema.Types.ObjectId, ref: "Driver" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
