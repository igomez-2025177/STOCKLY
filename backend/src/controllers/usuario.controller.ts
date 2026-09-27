import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hashPassword } from "../utils/password";
import { ALLOWED_EMAIL_DOMAINS, MIN_PASSWORD, isEmailDomainAllowed, limpiarCorreo } from "../utils/correo";

const ROLES = ["ADMIN", "EMPLEADO"] as const;
type Rol = (typeof ROLES)[number];

const SELECT_USUARIO = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
};

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// cuantos admins activos hay sin contar al que estamos tocando
async function otrosAdminsActivos(excluirId: number): Promise<number> {
  return prisma.usuario.count({
    where: { rol: "ADMIN", activo: true, NOT: { id: excluirId } },
  });
}

export async function listarUsuarios(req: AuthRequest, res: Response) {
  try {
    const todos = req.query.todos === "true";

    const usuarios = await prisma.usuario.findMany({
      where: todos ? {} : { activo: true },
      select: { ...SELECT_USUARIO, _count: { select: { movimientos: true } } },
      orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    });

    return res.status(200).json({ usuarios });
  } catch (error) {
    console.error("Error en listarUsuarios:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function obtenerUsuario(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { ...SELECT_USUARIO, _count: { select: { movimientos: true } } },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error("Error en obtenerUsuario:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function crearUsuario(req: AuthRequest, res: Response) {
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

    let rol: Rol = "EMPLEADO";

    if (req.body.rol) {
      const valor = String(req.body.rol).toUpperCase();

      if (!ROLES.includes(valor as Rol)) {
        return res.status(400).json({ error: "El rol debe ser ADMIN o EMPLEADO" });
      }

      rol = valor as Rol;
    }

    const existente = await prisma.usuario.findUnique({ where: { correo: correoLimpio } });

    if (existente) {
      return res.status(409).json({
        error: existente.activo
          ? "Ya existe un usuario con ese correo"
          : "Ya existe un usuario desactivado con ese correo. Reactívalo en lugar de crear otro",
      });
    }

    const usuario = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim(),
        correo: correoLimpio,
        password: await hashPassword(password),
        rol,
      },
      select: SELECT_USUARIO,
    });

    return res.status(201).json({ message: "Usuario creado correctamente", usuario });
  } catch (error) {
    console.error("Error en crearUsuario:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function actualizarUsuario(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { nombre, correo } = req.body;

    if (!nombre || !String(nombre).trim() || !correo) {
      return res.status(400).json({ error: "Faltan campos: nombre, correo" });
    }

    const existente = await prisma.usuario.findUnique({ where: { id } });

    if (!existente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const correoLimpio = limpiarCorreo(correo);

    if (!isEmailDomainAllowed(correoLimpio)) {
      return res.status(400).json({
        error: `Solo se permiten correos de: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
      });
    }

    let rol: Rol = existente.rol;

    if (req.body.rol) {
      const valor = String(req.body.rol).toUpperCase();

      if (!ROLES.includes(valor as Rol)) {
        return res.status(400).json({ error: "El rol debe ser ADMIN o EMPLEADO" });
      }

      rol = valor as Rol;
    }

    if (id === req.user!.userId && rol !== existente.rol) {
      return res.status(400).json({ error: "No puedes cambiar tu propio rol" });
    }

    if (existente.rol === "ADMIN" && rol === "EMPLEADO" && existente.activo) {
      if ((await otrosAdminsActivos(id)) === 0) {
        return res.status(409).json({ error: "Tiene que quedar al menos un administrador activo" });
      }
    }

    const repetido = await prisma.usuario.findFirst({
      where: { correo: correoLimpio, NOT: { id } },
    });

    if (repetido) {
      return res.status(409).json({ error: "Ya existe otro usuario con ese correo" });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { nombre: String(nombre).trim(), correo: correoLimpio, rol },
      select: SELECT_USUARIO,
    });

    return res.status(200).json({ message: "Usuario actualizado correctamente", usuario });
  } catch (error) {
    console.error("Error en actualizarUsuario:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function cambiarEstadoUsuario(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({ error: "El campo activo debe ser true o false" });
    }

    if (id === req.user!.userId) {
      return res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
    }

    const existente = await prisma.usuario.findUnique({ where: { id } });

    if (!existente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (!activo && existente.rol === "ADMIN" && (await otrosAdminsActivos(id)) === 0) {
      return res.status(409).json({ error: "Tiene que quedar al menos un administrador activo" });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo },
      select: SELECT_USUARIO,
    });

    return res.status(200).json({
      message: activo ? "Usuario reactivado" : "Usuario desactivado, ya no puede entrar al sistema",
      usuario,
    });
  } catch (error) {
    console.error("Error en cambiarEstadoUsuario:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function restablecerPassword(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { password } = req.body;

    if (!password || String(password).length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`,
      });
    }

    const existente = await prisma.usuario.findUnique({ where: { id } });

    if (!existente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await prisma.usuario.update({
      where: { id },
      data: { password: await hashPassword(password) },
    });

    return res.status(200).json({ message: `Contraseña de ${existente.nombre} restablecida` });
  } catch (error) {
    console.error("Error en restablecerPassword:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function eliminarUsuario(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    if (id === req.user!.userId) {
      return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
    }

    const existente = await prisma.usuario.findUnique({
      where: { id },
      include: { _count: { select: { movimientos: true } } },
    });

    if (!existente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (existente._count.movimientos > 0) {
      return res.status(409).json({
        error: "No se puede eliminar porque tiene movimientos en el historial. Desactívalo en su lugar",
      });
    }

    if (existente.rol === "ADMIN" && existente.activo && (await otrosAdminsActivos(id)) === 0) {
      return res.status(409).json({ error: "Tiene que quedar al menos un administrador activo" });
    }

    await prisma.usuario.delete({ where: { id } });

    return res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarUsuario:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}