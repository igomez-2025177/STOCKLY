import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { crearBaseDatos } from './config/crearBaseDatos';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
    
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mensaje: 'Stockly API funcionando' });
});

async function iniciar() {
  try {
    await crearBaseDatos();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();