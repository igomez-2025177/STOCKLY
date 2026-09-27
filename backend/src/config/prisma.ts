import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// en prisma 7 la conexion va por el adapter de pg
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

// una sola instancia pa todo el proyecto
export const prisma = new PrismaClient({ adapter });