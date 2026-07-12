import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "transitops-super-secret-key-12345";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "FLEET_MANAGER" | "SAFETY_OFFICER" | "DRIVER";
  name: string;
  driverId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
