import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { crearBaseDatos } from './config/crearBaseDatos';
import { aplicarMigraciones } from './config/aplicarMigraciones';
import { prisma } from './config/prisma';
import authRoutes from './routes/auth.routes';
import usuarioRoutes from './routes/usuario.routes';
import categoriaRoutes from './routes/categoria.routes';
import proveedorRoutes from './routes/proveedor.routes';
import productoRoutes from './routes/producto.routes';
import movimientoRoutes from './routes/movimiento.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, mensaje: 'Stockly API funcionando', baseDatos: 'conectada' });
  } catch {
    res.status(500).json({ ok: false, mensaje: 'Stockly API funcionando', baseDatos: 'sin conexion' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/dashboard', dashboardRoutes);

async function iniciar() {
  try {
    await crearBaseDatos();
    aplicarMigraciones();
    await prisma.$connect();
    console.log('Prisma conectado');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();