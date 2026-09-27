import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ALLOWED_EMAIL_DOMAINS, MIN_PASSWORD, isEmailDomainAllowed, limpiarCorreo } from "../utils/correo";

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

    const correoLimpio = limpiarCorreo(correo);

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

    const user = await prisma.usuario.findUnique({ where: { correo: limpiarCorreo(correo) } });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordMatches = await comparePassword(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

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

export async function cambiarMiPassword(req: AuthRequest, res: Response) {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({ error: "Faltan campos: passwordActual, passwordNuevo" });
    }

    if (String(passwordNuevo).length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `La contraseña nueva debe tener al menos ${MIN_PASSWORD} caracteres`,
      });
    }

    const user = await prisma.usuario.findUnique({ where: { id: req.user!.userId } });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const coincide = await comparePassword(passwordActual, user.password);

    if (!coincide) {
      return res.status(401).json({ error: "La contraseña actual no es correcta" });
    }

    if (passwordActual === passwordNuevo) {
      return res.status(400).json({ error: "La contraseña nueva tiene que ser distinta a la actual" });
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: { password: await hashPassword(passwordNuevo) },
    });

    return res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en cambiarMiPassword:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}