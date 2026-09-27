import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { prisma } from "../config/prisma";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  let payload: JwtPayload;

  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { id: true, rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: "Tu sesión ya no es válida, vuelve a iniciar sesión" });
    }

    req.user = { userId: usuario.id, role: usuario.rol };
    next();
  } catch (error) {
    console.error("Error en authMiddleware:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export function soloAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "No tienes permiso para hacer esto" });
  }

  next();
}