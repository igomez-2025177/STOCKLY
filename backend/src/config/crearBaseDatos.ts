import { Client } from 'pg';

export async function crearBaseDatos(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('Falta DATABASE_URL en el archivo .env');
  }

  const urlBD = new URL(url);
  const nombreBD = decodeURIComponent(urlBD.pathname.slice(1));

  if (!/^[a-zA-Z0-9_]+$/.test(nombreBD)) {
    throw new Error(`Nombre de base de datos no valido: "${nombreBD}"`);
  }


  const urlAdmin = new URL(url);
  urlAdmin.pathname = '/postgres';
  urlAdmin.search = '';

  const cliente = new Client({ connectionString: urlAdmin.toString() });
  await cliente.connect();

  try {
    const resultado = await cliente.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [nombreBD]
    );

    if (resultado.rowCount === 0) {
      await cliente.query(`CREATE DATABASE "${nombreBD}"`);
      console.log(`Base de datos "${nombreBD}" creada`);
    } else {
      console.log(`Base de datos "${nombreBD}" ya existe`);
    }
  } finally {
    await cliente.end();
  }
}