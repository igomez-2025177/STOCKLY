import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("No se encontró JWT_SECRET en el .env");
}

const secret: string = JWT_SECRET;

export interface JwtPayload {
  userId: number;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: "15h" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  return decoded as unknown as JwtPayload;
}