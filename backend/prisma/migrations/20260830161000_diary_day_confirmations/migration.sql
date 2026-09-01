-- CreateTable
CREATE TABLE "diary_day_confirmations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "mutation_hash" TEXT NOT NULL,
    "local_date" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "nutrition_complete" BOOLEAN NOT NULL,
    "activity_complete" BOOLEAN NOT NULL,
    "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diary_day_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diary_day_confirmations_user_id_local_date_idx" ON "diary_day_confirmations"("user_id", "local_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "diary_day_confirmations_user_id_local_date_key" ON "diary_day_confirmations"("user_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "diary_day_confirmations_user_id_client_mutation_id_key" ON "diary_day_confirmations"("user_id", "client_mutation_id");

-- AddForeignKey
ALTER TABLE "diary_day_confirmations" ADD CONSTRAINT "diary_day_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
