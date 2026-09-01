import { z } from 'zod'

const isoDateTimeSchema = z.iso.datetime({ offset: true })
const uuidSchema = z.uuid()
const expectedRevisionSchema = z.number().int().positive()
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable()

export const workoutEffortSchema = z.enum(['EASY', 'RIGHT', 'HARD', 'PAIN'])
export const workoutSourceKindSchema = z.enum(['STRUCTURED', 'USER_TEXT', 'VOICE_TRANSCRIPT'])
export const exerciseEnvironmentSchema = z.enum([
  'HOME_NO_EQUIPMENT',
  'HOME_EQUIPMENT',
  'GYM_MACHINE',
  'GYM_FREE_WEIGHT',
  'ANYWHERE',
])
export const exerciseDemonstrationKindSchema = z.enum(['LOOP_ANIMATION', 'SHORT_VIDEO'])

export const exerciseCatalogItemSchema = z.object({
  id: uuidSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  contentVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  environments: z.array(exerciseEnvironmentSchema).min(1).max(5),
  equipment: z.array(z.string().trim().min(1).max(100)).max(20),
  instructions: z.string().trim().min(1).max(5_000),
  techniqueCues: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  commonMistakes: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
  demonstration: z.object({
    kind: exerciseDemonstrationKindSchema,
    assetKey: z.string().trim().min(1).max(500),
    altText: z.string().trim().min(1).max(500),
  }).strict(),
  reviewReference: z.string().trim().min(1).max(200),
  reviewedAt: isoDateTimeSchema,
}).strict()
export const exerciseCatalogResponseSchema = z.object({
  exercises: z.array(exerciseCatalogItemSchema).max(200),
}).strict()

export const workoutSetInputSchema = z
  .object({
    reps: z.number().int().min(1).max(1_000).nullable(),
    loadKg: z.number().min(0).max(1_000).nullable(),
    durationSeconds: z.number().int().min(1).max(86_400).nullable(),
    completed: z.literal(true),
  })
  .strict()
  .refine(
    (value) => value.reps !== null || value.loadKg !== null || value.durationSeconds !== null,
    'A completed set needs reps, load, or duration',
  )

export const workoutExerciseInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    equipmentText: nullableText(500),
    notes: nullableText(2_000),
    sets: z.array(workoutSetInputSchema).min(1).max(20),
  })
  .strict()

const workoutSessionFields = {
  title: z.string().trim().min(1).max(160),
  occurredAt: isoDateTimeSchema,
  durationMinutes: z.number().int().min(1).max(1_440).nullable(),
  effort: workoutEffortSchema.nullable(),
  notes: nullableText(3_000),
}
const workoutSessionInputSchema = z
  .object({
    ...workoutSessionFields,
    exercises: z.array(workoutExerciseInputSchema).min(1).max(30),
  })
  .strict()
  .refine(
    (value) => value.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) <= 200,
    'A workout cannot contain more than 200 sets',
  )

export const createWorkoutSessionRequestSchema = workoutSessionInputSchema
  .extend({ clientMutationId: uuidSchema })
  .strict()
export const updateWorkoutSessionRequestSchema = workoutSessionInputSchema
  .extend({ expectedRevision: expectedRevisionSchema })
  .strict()
export const workoutSessionParamsSchema = z.object({ sessionId: uuidSchema }).strict()
export const deleteWorkoutSessionRequestSchema = z.object({ expectedRevision: expectedRevisionSchema }).strict()
export const listWorkoutSessionsQuerySchema = z
  .object({ from: isoDateTimeSchema, to: isoDateTimeSchema })
  .strict()
  .refine((value) => Date.parse(value.from) < Date.parse(value.to), '`from` must be before `to`')
  .refine(
    (value) => Date.parse(value.to) - Date.parse(value.from) <= 31 * 86_400_000,
    'Workout history windows cannot exceed 31 days',
  )

export const workoutSetSchema = workoutSetInputSchema
  .extend({ id: uuidSchema, position: z.number().int().positive() })
  .strict()
export const workoutExerciseSchema = workoutExerciseInputSchema
  .omit({ sets: true })
  .extend({
    id: uuidSchema,
    position: z.number().int().positive(),
    sets: z.array(workoutSetSchema).min(1).max(20),
  })
  .strict()
export const workoutSessionSchema = z
  .object({
    ...workoutSessionFields,
    id: uuidSchema,
    revision: expectedRevisionSchema,
    sourceKind: workoutSourceKindSchema,
    confirmedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    exercises: z.array(workoutExerciseSchema).min(1).max(30),
  })
  .strict()
  .refine(
    (value) => value.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) <= 200,
    'A workout cannot contain more than 200 sets',
  )

export const workoutSessionResponseSchema = z.object({ session: workoutSessionSchema }).strict()
export const workoutSessionsResponseSchema = z.object({ sessions: z.array(workoutSessionSchema).max(200) }).strict()
export const deleteWorkoutSessionResponseSchema = z.object({ deleted: z.literal(true) }).strict()

export type WorkoutEffort = z.infer<typeof workoutEffortSchema>
export type WorkoutSourceKind = z.infer<typeof workoutSourceKindSchema>
export type ExerciseEnvironment = z.infer<typeof exerciseEnvironmentSchema>
export type ExerciseDemonstrationKind = z.infer<typeof exerciseDemonstrationKindSchema>
export type ExerciseCatalogItem = z.infer<typeof exerciseCatalogItemSchema>
export type ExerciseCatalogResponse = z.infer<typeof exerciseCatalogResponseSchema>
export type WorkoutSetInput = z.infer<typeof workoutSetInputSchema>
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseInputSchema>
export type CreateWorkoutSessionRequest = z.infer<typeof createWorkoutSessionRequestSchema>
export type UpdateWorkoutSessionRequest = z.infer<typeof updateWorkoutSessionRequestSchema>
export type DeleteWorkoutSessionRequest = z.infer<typeof deleteWorkoutSessionRequestSchema>
export type ListWorkoutSessionsQuery = z.infer<typeof listWorkoutSessionsQuerySchema>
export type WorkoutSession = z.infer<typeof workoutSessionSchema>
export type WorkoutSessionResponse = z.infer<typeof workoutSessionResponseSchema>
export type WorkoutSessionsResponse = z.infer<typeof workoutSessionsResponseSchema>
