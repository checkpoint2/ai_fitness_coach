-- CreateEnum
CREATE TYPE "diary_source_kind" AS ENUM ('structured', 'user_text', 'voice_transcript', 'label', 'recipe', 'food_database', 'ai_estimate', 'photo_estimate');

-- CreateTable
CREATE TABLE "nutrition_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "mutation_hash" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amount_text" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "source_kind" "diary_source_kind" NOT NULL DEFAULT 'structured',
    "metrics_truth_kind" "persistent_truth_kind",
    "calories_kcal" DECIMAL(10,2),
    "protein_grams" DECIMAL(10,2),
    "fat_grams" DECIMAL(10,2),
    "carbohydrate_grams" DECIMAL(10,2),
    "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nutrition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "mutation_hash" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INTEGER,
    "source_kind" "diary_source_kind" NOT NULL DEFAULT 'structured',
    "expenditure_truth_kind" "persistent_truth_kind",
    "expenditure_kcal" DECIMAL(10,2),
    "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_entries_user_id_occurred_at_idx" ON "nutrition_entries"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_entries_user_id_client_mutation_id_key" ON "nutrition_entries"("user_id", "client_mutation_id");

-- CreateIndex
CREATE INDEX "activity_entries_user_id_occurred_at_idx" ON "activity_entries"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "activity_entries_user_id_client_mutation_id_key" ON "activity_entries"("user_id", "client_mutation_id");

-- AddForeignKey
ALTER TABLE "nutrition_entries" ADD CONSTRAINT "nutrition_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
