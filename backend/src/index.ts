import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { crearBaseDatos } from './config/crearBaseDatos';
import { prisma } from './config/prisma';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ruta de prueba pa ver que el server y la base responden
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, mensaje: 'Stockly API funcionando', baseDatos: 'conectada' });
  } catch {
    res.status(500).json({ ok: false, mensaje: 'Stockly API funcionando', baseDatos: 'sin conexion' });
  }
});

async function iniciar() {
  try {
    // primero la base, despues prisma, despues el server
    await crearBaseDatos();
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