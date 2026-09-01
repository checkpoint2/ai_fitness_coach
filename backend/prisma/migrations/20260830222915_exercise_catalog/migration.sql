-- CreateEnum
CREATE TYPE "exercise_content_status" AS ENUM ('draft', 'reviewed', 'active', 'retired');

-- CreateEnum
CREATE TYPE "exercise_demonstration_kind" AS ENUM ('loop_animation', 'short_video');

-- CreateTable
CREATE TABLE "exercise_definitions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "slug" TEXT NOT NULL,
    "content_version" INTEGER NOT NULL,
    "active_key" TEXT,
    "status" "exercise_content_status" NOT NULL DEFAULT 'draft',
    "name" TEXT NOT NULL,
    "environments" JSONB NOT NULL,
    "equipment" JSONB NOT NULL,
    "instructions" TEXT NOT NULL,
    "technique_cues" JSONB NOT NULL,
    "common_mistakes" JSONB NOT NULL,
    "demonstration_kind" "exercise_demonstration_kind",
    "demonstration_asset_key" TEXT,
    "demonstration_alt_text" TEXT,
    "review_reference" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exercise_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_definitions_active_key_key" ON "exercise_definitions"("active_key");

-- CreateIndex
CREATE INDEX "exercise_definitions_status_name_idx" ON "exercise_definitions"("status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_definitions_slug_content_version_key" ON "exercise_definitions"("slug", "content_version");
