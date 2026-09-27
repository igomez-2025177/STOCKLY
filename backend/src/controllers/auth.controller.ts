import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middlewares/auth.middleware";

const ALLOWED_EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "kinal.edu.gt"];
const MIN_PASSWORD = 8;

function isEmailDomainAllowed(correo: string): boolean {
  const domain = correo.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export async function registroAbierto(_req: Request, res: Response) {
  try {
    const total = await prisma.usuario.count();
    return res.status(200).json({ abierto: total === 0 });
  } catch (error) {
    console.error("Error en registroAbierto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: "Faltan campos: nombre, correo, password" });
    }

    const correoLimpio = String(correo).trim().toLowerCase();

    if (!isEmailDomainAllowed(correoLimpio)) {
      return res.status(400).json({
        error: `Solo se permiten correos de: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
      });
    }

    if (String(password).length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`,
      });
    }

    const totalUsuarios = await prisma.usuario.count();

    if (totalUsuarios > 0) {
      return res.status(403).json({
        error: "El registro está cerrado. Pídele al administrador que te cree una cuenta",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim(),
        correo: correoLimpio,
        password: hashedPassword,
        rol: "ADMIN",
      },
    });

    const token = generateToken({ userId: user.id, role: user.rol });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: "Faltan campos: correo, password" });
    }

    const correoLimpio = String(correo).trim().toLowerCase();

    const user = await prisma.usuario.findUnique({ where: { correo: correoLimpio } });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordMatches = await comparePassword(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // se revisa despues de la contraseña pa no andar diciendo que correos existen
    if (!user.activo) {
      return res.status(403).json({ error: "Tu cuenta está desactivada, habla con el administrador" });
    }

    const token = generateToken({ userId: user.id, role: user.rol });

    return res.status(200).json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, correo: true, rol: true, activo: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error en me:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}