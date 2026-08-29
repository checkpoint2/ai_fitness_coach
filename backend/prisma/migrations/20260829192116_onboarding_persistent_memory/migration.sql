-- CreateEnum
CREATE TYPE "onboarding_run_status" AS ENUM ('not_started', 'collecting', 'review_required', 'profile_confirmed', 'plan_draft_ready', 'plan_confirmed', 'completed', 'paused');

-- CreateEnum
CREATE TYPE "onboarding_run_entry_mode" AS ENUM ('structured', 'text', 'voice_transcript');

-- CreateEnum
CREATE TYPE "onboarding_run_source_kind" AS ENUM ('none', 'structured', 'user_text', 'voice_transcript');

-- CreateEnum
CREATE TYPE "onboarding_narrative_retention" AS ENUM ('undecided', 'delete', 'save_as_coach_note');

-- CreateEnum
CREATE TYPE "persistent_truth_kind" AS ENUM ('fact', 'estimate', 'inference', 'hypothesis');

-- CreateEnum
CREATE TYPE "persistent_source_kind" AS ENUM ('structured', 'user_text', 'voice_transcript', 'ai_extracted', 'import');

-- CreateEnum
CREATE TYPE "user_fact_state" AS ENUM ('confirmed', 'superseded');

-- CreateEnum
CREATE TYPE "fitness_record_state" AS ENUM ('proposed', 'confirmed', 'superseded');

-- CreateEnum
CREATE TYPE "fitness_body_goal" AS ENUM ('fat_loss', 'muscle_gain', 'recomposition', 'maintenance');

-- CreateEnum
CREATE TYPE "fitness_training_goal" AS ENUM ('general_fitness', 'strength', 'endurance', 'mobility_recovery');

-- CreateEnum
CREATE TYPE "body_measurement_kind" AS ENUM ('weight', 'waist', 'body_fat');

-- CreateEnum
CREATE TYPE "body_measurement_unit" AS ENUM ('kg', 'cm', 'percent');

-- CreateEnum
CREATE TYPE "safety_flag_scope" AS ENUM ('training', 'nutrition');

-- CreateEnum
CREATE TYPE "safety_flag_answer" AS ENUM ('yes', 'unsure', 'declined');

-- CreateEnum
CREATE TYPE "safety_flag_state" AS ENUM ('unresolved', 'resolved');

-- CreateEnum
CREATE TYPE "fitness_plan_state" AS ENUM ('draft', 'confirmed', 'active', 'superseded');

-- CreateTable
CREATE TABLE "onboarding_runs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "status" "onboarding_run_status" NOT NULL DEFAULT 'not_started',
    "resume_status" "onboarding_run_status",
    "initial_entry_mode" "onboarding_run_entry_mode",
    "draft_schema_version" INTEGER NOT NULL DEFAULT 1,
    "draft_payload" JSONB NOT NULL,
    "source_narrative" TEXT,
    "source_kind" "onboarding_run_source_kind" NOT NULL DEFAULT 'none',
    "retention_choice" "onboarding_narrative_retention" NOT NULL DEFAULT 'undecided',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "profile_confirmed_at" TIMESTAMP(3),
    "plan_confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_facts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "fact_key" TEXT NOT NULL,
    "active_key" TEXT,
    "value" JSONB NOT NULL,
    "truth_kind" "persistent_truth_kind" NOT NULL,
    "state" "user_fact_state" NOT NULL DEFAULT 'confirmed',
    "source_kind" "persistent_source_kind" NOT NULL,
    "source_ref" UUID,
    "is_approximate" BOOLEAN NOT NULL DEFAULT false,
    "observed_at" TIMESTAMP(3),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),
    "supersedes_id" UUID,

    CONSTRAINT "user_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitness_goals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "fitness_record_state" NOT NULL,
    "active_key" TEXT,
    "body_goal" "fitness_body_goal" NOT NULL,
    "training_goal" "fitness_training_goal" NOT NULL,
    "primary_priority" TEXT,
    "desired_weight_kg" DECIMAL(6,2),
    "result_statement" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitness_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "kind" "body_measurement_kind" NOT NULL,
    "value" DECIMAL(8,3) NOT NULL,
    "unit" "body_measurement_unit" NOT NULL,
    "truth_kind" "persistent_truth_kind" NOT NULL,
    "source_kind" "persistent_source_kind" NOT NULL,
    "is_approximate" BOOLEAN NOT NULL DEFAULT false,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_flags" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "scope" "safety_flag_scope" NOT NULL,
    "answer" "safety_flag_answer" NOT NULL,
    "state" "safety_flag_state" NOT NULL,
    "active_key" TEXT,
    "source_kind" "persistent_source_kind" NOT NULL,
    "observed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitness_plans" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "fitness_plan_state" NOT NULL,
    "active_key" TEXT,
    "payload_schema_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "evidence_version" TEXT,
    "limitations" JSONB NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitness_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_notes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_mutation_receipts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "command_type" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "result_revision" INTEGER,
    "result_resource_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_mutation_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_runs_user_id_key" ON "onboarding_runs"("user_id");

-- CreateIndex
CREATE INDEX "onboarding_runs_status_updated_at_idx" ON "onboarding_runs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "user_facts_user_id_fact_key_recorded_at_idx" ON "user_facts"("user_id", "fact_key", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_facts_user_id_active_key_key" ON "user_facts"("user_id", "active_key");

-- CreateIndex
CREATE UNIQUE INDEX "fitness_goals_user_id_version_key" ON "fitness_goals"("user_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "fitness_goals_user_id_active_key_key" ON "fitness_goals"("user_id", "active_key");

-- CreateIndex
CREATE INDEX "body_measurements_user_id_kind_observed_at_idx" ON "body_measurements"("user_id", "kind", "observed_at");

-- CreateIndex
CREATE INDEX "safety_flags_user_id_state_idx" ON "safety_flags"("user_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "safety_flags_user_id_active_key_key" ON "safety_flags"("user_id", "active_key");

-- CreateIndex
CREATE UNIQUE INDEX "fitness_plans_user_id_version_key" ON "fitness_plans"("user_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "fitness_plans_user_id_active_key_key" ON "fitness_plans"("user_id", "active_key");

-- CreateIndex
CREATE INDEX "coach_notes_user_id_created_at_idx" ON "coach_notes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "onboarding_mutation_receipts_created_at_idx" ON "onboarding_mutation_receipts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_mutation_receipts_user_id_client_mutation_id_key" ON "onboarding_mutation_receipts"("user_id", "client_mutation_id");

-- AddForeignKey
ALTER TABLE "onboarding_runs" ADD CONSTRAINT "onboarding_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "user_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitness_goals" ADD CONSTRAINT "fitness_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_flags" ADD CONSTRAINT "safety_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitness_plans" ADD CONSTRAINT "fitness_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_mutation_receipts" ADD CONSTRAINT "onboarding_mutation_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
