-- CreateEnum
CREATE TYPE "workout_effort" AS ENUM ('easy', 'right', 'hard', 'pain');

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "mutation_hash" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INTEGER,
    "effort" "workout_effort",
    "notes" TEXT,
    "source_kind" "diary_source_kind" NOT NULL DEFAULT 'structured',
    "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "session_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "equipment_text" TEXT,
    "notes" TEXT,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "exercise_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "reps" INTEGER,
    "load_kg" DECIMAL(10,2),
    "duration_seconds" INTEGER,
    "completed" BOOLEAN NOT NULL,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_occurred_at_idx" ON "workout_sessions"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workout_sessions_user_id_client_mutation_id_key" ON "workout_sessions"("user_id", "client_mutation_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_exercises_session_id_position_key" ON "workout_exercises"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "workout_sets_exercise_id_position_key" ON "workout_sets"("exercise_id", "position");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
