/*
  Warnings:

  - You are about to drop the column `activo` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the column `rol` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "activo",
DROP COLUMN "rol";

-- DropEnum
DROP TYPE "Rol";
