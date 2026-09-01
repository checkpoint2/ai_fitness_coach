-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "body_measurement_kind" ADD VALUE 'hips';
ALTER TYPE "body_measurement_kind" ADD VALUE 'chest';
ALTER TYPE "body_measurement_kind" ADD VALUE 'arm';
ALTER TYPE "body_measurement_kind" ADD VALUE 'thigh';
ALTER TYPE "body_measurement_kind" ADD VALUE 'neck';
ALTER TYPE "body_measurement_kind" ADD VALUE 'custom';

-- AlterTable
ALTER TABLE "body_measurements" ADD COLUMN     "client_mutation_id" UUID,
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "label" TEXT,
ADD COLUMN     "mutation_hash" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "body_measurements_user_id_client_mutation_id_key" ON "body_measurements"("user_id", "client_mutation_id");
