import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ruta de prueba pa ver que el server responde
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mensaje: 'Stockly API funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});