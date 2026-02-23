/*
  Warnings:

  - A unique constraint covering the columns `[roomId,shapeId]` on the table `Shape` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shapeId` to the `Shape` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shape" ADD COLUMN     "shapeId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Shape_roomId_shapeId_key" ON "Shape"("roomId", "shapeId");
