import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ALLOWED_EMAIL_DOMAINS, MIN_PASSWORD, isEmailDomainAllowed, limpiarCorreo } from "../utils/correo";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const MAX_NOMBRE = 80;

function datosUsuario(user: { id: number; nombre: string; correo: string }) {
  return { id: user.id, nombre: user.nombre, correo: user.correo };
}

export async function register(req: Request, res: Response) {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !String(nombre).trim() || !correo || !password) {
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

    const existingUser = await prisma.usuario.findUnique({ where: { correo: correoLimpio } });

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.password
          ? "Ya existe un usuario con ese correo"
          : "Esa cuenta se creó con Google, entra con el botón de Google",
      });
    }

    const user = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim().slice(0, MAX_NOMBRE),
        correo: correoLimpio,
        password: await hashPassword(password),
      },
    });

    const token = generateToken({ userId: user.id });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      token,
      user: datosUsuario(user),
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

    if (!user || !user.password) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordMatches = await comparePassword(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = generateToken({ userId: user.id });

    return res.status(200).json({
      message: "Login exitoso",
      token,
      user: datosUsuario(user),
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Falta el token de Google (credential)" });
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error("Falta GOOGLE_CLIENT_ID en el .env");
      return res.status(500).json({ error: "El login con Google no está configurado" });
    }

    let payload;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "No se pudo verificar tu cuenta de Google, intenta de nuevo" });
    }

    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ error: "Google no devolvió un correo" });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ error: "El correo de tu cuenta de Google no está verificado" });
    }

    const googleId = payload.sub;
    const correo = limpiarCorreo(payload.email);

    let user = await prisma.usuario.findUnique({ where: { googleId } });

    if (!user) {
      const porCorreo = await prisma.usuario.findUnique({ where: { correo } });

      if (porCorreo) {
        user = await prisma.usuario.update({
          where: { id: porCorreo.id },
          data: { googleId },
        });
      }
    }

    if (!user) {
      if (!isEmailDomainAllowed(correo)) {
        return res.status(400).json({
          error: `Solo se permiten correos de: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
        });
      }

      user = await prisma.usuario.create({
        data: {
          nombre: (payload.name?.trim() || correo.split("@")[0]).slice(0, MAX_NOMBRE),
          correo,
          googleId,
        },
      });
    }

    const token = generateToken({ userId: user.id });

    return res.status(200).json({
      message: "Login con Google exitoso",
      token,
      user: datosUsuario(user),
    });
  } catch (error) {
    console.error("Error en googleLogin:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, correo: true, password: true, googleId: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({
      user: {
        ...datosUsuario(user),
        tienePassword: !!user.password,
        conGoogle: !!user.googleId,
      },
    });
  } catch (error) {
    console.error("Error en me:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function actualizarPerfil(req: AuthRequest, res: Response) {
  try {
    const nombre = String(req.body.nombre ?? "").trim();

    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (nombre.length > MAX_NOMBRE) {
      return res.status(400).json({ error: `El nombre puede tener máximo ${MAX_NOMBRE} caracteres` });
    }

    const user = await prisma.usuario.update({
      where: { id: req.user!.userId },
      data: { nombre },
    });

    return res.status(200).json({
      message: "Nombre actualizado correctamente",
      user: datosUsuario(user),
    });
  } catch (error) {
    console.error("Error en actualizarPerfil:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function cambiarMiPassword(req: AuthRequest, res: Response) {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordNuevo) {
      return res.status(400).json({ error: "Falta el campo passwordNuevo" });
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

    if (user.password) {
      if (!passwordActual) {
        return res.status(400).json({ error: "Escribe tu contraseña actual" });
      }

      const coincide = await comparePassword(passwordActual, user.password);

      if (!coincide) {
        return res.status(401).json({ error: "La contraseña actual no es correcta" });
      }

      if (passwordActual === passwordNuevo) {
        return res.status(400).json({ error: "La contraseña nueva tiene que ser distinta a la actual" });
      }
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: { password: await hashPassword(passwordNuevo) },
    });

    return res.status(200).json({
      message: user.password
        ? "Contraseña actualizada correctamente"
        : "Contraseña creada, ahora también puedes entrar con tu correo",
    });
  } catch (error) {
    console.error("Error en cambiarMiPassword:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}