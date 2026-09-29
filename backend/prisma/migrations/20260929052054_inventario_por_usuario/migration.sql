/*
  Warnings:

  - You are about to drop the column `referencia` on the `movimientos` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `productos` table. All the data in the column will be lost.
  - You are about to drop the column `unidad` on the `productos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[usuarioId,nombre]` on the table `categorias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[usuarioId,nombre]` on the table `productos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[usuarioId,nombre]` on the table `proveedores` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `usuarioId` to the `categorias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `productos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usuarioId` to the `proveedores` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "categorias_nombre_key";

-- DropIndex
DROP INDEX "movimientos_fecha_idx";

-- DropIndex
DROP INDEX "movimientos_usuarioId_idx";

-- DropIndex
DROP INDEX "productos_activo_idx";

-- DropIndex
DROP INDEX "productos_sku_key";

-- DropIndex
DROP INDEX "proveedores_nombre_key";

-- AlterTable
ALTER TABLE "categorias" ADD COLUMN     "usuarioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "movimientos" DROP COLUMN "referencia";

-- AlterTable
ALTER TABLE "productos" DROP COLUMN "sku",
DROP COLUMN "unidad",
ADD COLUMN     "usuarioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "proveedores" ADD COLUMN     "usuarioId" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "UnidadMedida";

-- CreateIndex
CREATE UNIQUE INDEX "categorias_usuarioId_nombre_key" ON "categorias"("usuarioId", "nombre");

-- CreateIndex
CREATE INDEX "movimientos_usuarioId_fecha_idx" ON "movimientos"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "productos_usuarioId_activo_idx" ON "productos"("usuarioId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_usuarioId_nombre_key" ON "productos"("usuarioId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_usuarioId_nombre_key" ON "proveedores"("usuarioId", "nombre");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
