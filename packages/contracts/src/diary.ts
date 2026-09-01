import { z } from 'zod'

const isoDateTimeSchema = z.iso.datetime({ offset: true })
const clientMutationIdSchema = z.uuid()
const entryIdSchema = z.uuid()
const expectedRevisionSchema = z.number().int().positive()
const boundedDescriptionSchema = z.string().trim().min(1).max(3_000)
const optionalLabelSchema = z.string().trim().min(1).max(120).nullable()
const localDateSchema = z.iso.date()
const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/)
  .refine(isValidTimeZone, 'Unknown IANA time zone')

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export const diaryMetricTruthKindSchema = z.enum(['FACT', 'ESTIMATE'])
export const diarySourceKindSchema = z.enum([
  'STRUCTURED',
  'USER_TEXT',
  'VOICE_TRANSCRIPT',
  'LABEL',
  'RECIPE',
  'FOOD_DATABASE',
  'AI_ESTIMATE',
  'PHOTO_ESTIMATE',
  'AI_EXTRACTED',
  'IMPORT',
])

export const nutritionMetricsSchema = z
  .object({
    caloriesKcal: z.number().min(0).max(20_000).optional(),
    proteinGrams: z.number().min(0).max(2_000).optional(),
    fatGrams: z.number().min(0).max(2_000).optional(),
    carbohydrateGrams: z.number().min(0).max(3_000).optional(),
    truthKind: diaryMetricTruthKindSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.caloriesKcal !== undefined ||
      value.proteinGrams !== undefined ||
      value.fatGrams !== undefined ||
      value.carbohydrateGrams !== undefined,
    'At least one nutrition metric is required',
  )

export const activityExpenditureSchema = z
  .object({
    caloriesKcal: z.number().min(0).max(20_000),
    truthKind: diaryMetricTruthKindSchema,
  })
  .strict()

const nutritionEntryInputSchema = z
  .object({
    description: boundedDescriptionSchema,
    occurredAt: isoDateTimeSchema,
    category: optionalLabelSchema,
    amountText: z.string().trim().min(1).max(500).nullable(),
    nutrition: nutritionMetricsSchema.nullable(),
  })
  .strict()

const activityEntryInputSchema = z
  .object({
    description: boundedDescriptionSchema,
    occurredAt: isoDateTimeSchema,
    durationMinutes: z.number().int().min(1).max(1_440).nullable(),
    expenditure: activityExpenditureSchema.nullable(),
  })
  .strict()

export const bodyMeasurementKindSchema = z.enum([
  'WEIGHT',
  'WAIST',
  'HIPS',
  'CHEST',
  'ARM',
  'THIGH',
  'NECK',
  'BODY_FAT',
  'CUSTOM',
])
export const bodyMeasurementUnitSchema = z.enum(['KG', 'CM', 'PERCENT'])

const measurementEntryInputSchema = z
  .object({
    measurementKind: bodyMeasurementKindSchema,
    label: optionalLabelSchema,
    value: z.number().positive().max(1_000),
    unit: bodyMeasurementUnitSchema,
    occurredAt: isoDateTimeSchema,
    truthKind: diaryMetricTruthKindSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const expectedUnit = value.measurementKind === 'WEIGHT'
      ? 'KG'
      : value.measurementKind === 'BODY_FAT'
        ? 'PERCENT'
        : value.measurementKind === 'CUSTOM'
          ? null
          : 'CM'
    if (expectedUnit && value.unit !== expectedUnit) {
      context.addIssue({
        code: 'custom',
        path: ['unit'],
        message: `${value.measurementKind} must use ${expectedUnit}`,
      })
    }
    if (value.unit === 'PERCENT' && value.value > 100) {
      context.addIssue({ code: 'custom', path: ['value'], message: 'Percent cannot exceed 100' })
    }
    if (value.measurementKind === 'CUSTOM' && !value.label) {
      context.addIssue({ code: 'custom', path: ['label'], message: 'Custom measurement needs a label' })
    }
    if (value.measurementKind !== 'CUSTOM' && value.label) {
      context.addIssue({ code: 'custom', path: ['label'], message: 'Only custom measurements use a label' })
    }
  })

export const createNutritionEntryRequestSchema = nutritionEntryInputSchema
  .extend({ clientMutationId: clientMutationIdSchema })
  .strict()
export const updateNutritionEntryRequestSchema = nutritionEntryInputSchema
  .extend({ expectedRevision: expectedRevisionSchema })
  .strict()
export const createActivityEntryRequestSchema = activityEntryInputSchema
  .extend({ clientMutationId: clientMutationIdSchema })
  .strict()
export const updateActivityEntryRequestSchema = activityEntryInputSchema
  .extend({ expectedRevision: expectedRevisionSchema })
  .strict()
export const createMeasurementEntryRequestSchema = measurementEntryInputSchema
  .safeExtend({ clientMutationId: clientMutationIdSchema })
  .strict()
export const updateMeasurementEntryRequestSchema = measurementEntryInputSchema
  .safeExtend({ expectedRevision: expectedRevisionSchema })
  .strict()

export const diaryEntryParamsSchema = z.object({ entryId: entryIdSchema }).strict()
export const deleteDiaryEntryRequestSchema = z
  .object({ expectedRevision: expectedRevisionSchema })
  .strict()

export const listDiaryEntriesQuerySchema = z
  .object({ from: isoDateTimeSchema, to: isoDateTimeSchema })
  .strict()
  .refine((value) => new Date(value.from).getTime() < new Date(value.to).getTime(), {
    message: '`from` must be before `to`',
  })
  .refine(
    (value) => new Date(value.to).getTime() - new Date(value.from).getTime() <= 31 * 86_400_000,
    { message: 'Diary windows cannot exceed 31 days' },
  )

const diaryRecordMetadataSchema = z.object({
  id: entryIdSchema,
  revision: expectedRevisionSchema,
  occurredAt: isoDateTimeSchema,
  sourceKind: diarySourceKindSchema,
  confirmedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

const diaryEntryMetadataSchema = diaryRecordMetadataSchema.extend({
  description: boundedDescriptionSchema,
})

export const nutritionEntrySchema = diaryEntryMetadataSchema
  .extend({
    kind: z.literal('NUTRITION'),
    category: optionalLabelSchema,
    amountText: z.string().trim().min(1).max(500).nullable(),
    nutrition: nutritionMetricsSchema.nullable(),
  })
  .strict()
export const activityEntrySchema = diaryEntryMetadataSchema
  .extend({
    kind: z.literal('ACTIVITY'),
    durationMinutes: z.number().int().min(1).max(1_440).nullable(),
    expenditure: activityExpenditureSchema.nullable(),
  })
  .strict()
export const measurementEntrySchema = diaryRecordMetadataSchema
  .extend({
    kind: z.literal('MEASUREMENT'),
    measurementKind: bodyMeasurementKindSchema,
    label: optionalLabelSchema,
    value: z.number().positive().max(1_000),
    unit: bodyMeasurementUnitSchema,
    truthKind: diaryMetricTruthKindSchema,
  })
  .strict()
export const diaryEntrySchema = z.discriminatedUnion('kind', [
  nutritionEntrySchema,
  activityEntrySchema,
  measurementEntrySchema,
])
export const diaryEntryResponseSchema = z.object({ entry: diaryEntrySchema }).strict()
export const diaryEntriesResponseSchema = z
  .object({ entries: z.array(diaryEntrySchema).max(1_000) })
  .strict()
export const deleteDiaryEntryResponseSchema = z.object({ deleted: z.literal(true) }).strict()

export const confirmDiaryDayRequestSchema = z
  .object({
    clientMutationId: clientMutationIdSchema,
    localDate: localDateSchema,
    timeZone: timeZoneSchema,
    nutritionComplete: z.literal(true),
    activityComplete: z.literal(true),
  })
  .strict()
export const listDiaryDayConfirmationsQuerySchema = z
  .object({ fromDate: localDateSchema, toDate: localDateSchema })
  .strict()
  .refine((value) => value.fromDate <= value.toDate, {
    message: '`fromDate` must not be after `toDate`',
  })
  .refine(
    (value) => Date.parse(`${value.toDate}T00:00:00.000Z`) -
      Date.parse(`${value.fromDate}T00:00:00.000Z`) <= 30 * 86_400_000,
    { message: 'Diary day-confirmation windows cannot exceed 31 calendar days' },
  )
export const diaryDayConfirmationParamsSchema = z.object({ localDate: localDateSchema }).strict()
export const diaryDayConfirmationSchema = z
  .object({
    id: entryIdSchema,
    localDate: localDateSchema,
    timeZone: timeZoneSchema,
    revision: expectedRevisionSchema,
    nutritionComplete: z.literal(true),
    activityComplete: z.literal(true),
    confirmedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()
export const diaryDayConfirmationResponseSchema = z
  .object({ confirmation: diaryDayConfirmationSchema })
  .strict()
export const diaryDayConfirmationsResponseSchema = z
  .object({ confirmations: z.array(diaryDayConfirmationSchema).max(31) })
  .strict()

export type DiaryMetricTruthKind = z.infer<typeof diaryMetricTruthKindSchema>
export type DiarySourceKind = z.infer<typeof diarySourceKindSchema>
export type NutritionMetrics = z.infer<typeof nutritionMetricsSchema>
export type ActivityExpenditure = z.infer<typeof activityExpenditureSchema>
export type BodyMeasurementKind = z.infer<typeof bodyMeasurementKindSchema>
export type BodyMeasurementUnit = z.infer<typeof bodyMeasurementUnitSchema>
export type CreateNutritionEntryRequest = z.infer<typeof createNutritionEntryRequestSchema>
export type UpdateNutritionEntryRequest = z.infer<typeof updateNutritionEntryRequestSchema>
export type CreateActivityEntryRequest = z.infer<typeof createActivityEntryRequestSchema>
export type UpdateActivityEntryRequest = z.infer<typeof updateActivityEntryRequestSchema>
export type CreateMeasurementEntryRequest = z.infer<typeof createMeasurementEntryRequestSchema>
export type UpdateMeasurementEntryRequest = z.infer<typeof updateMeasurementEntryRequestSchema>
export type DeleteDiaryEntryRequest = z.infer<typeof deleteDiaryEntryRequestSchema>
export type ListDiaryEntriesQuery = z.infer<typeof listDiaryEntriesQuerySchema>
export type NutritionEntry = z.infer<typeof nutritionEntrySchema>
export type ActivityEntry = z.infer<typeof activityEntrySchema>
export type MeasurementEntry = z.infer<typeof measurementEntrySchema>
export type DiaryEntry = z.infer<typeof diaryEntrySchema>
export type DiaryEntryResponse = z.infer<typeof diaryEntryResponseSchema>
export type DiaryEntriesResponse = z.infer<typeof diaryEntriesResponseSchema>
export type ConfirmDiaryDayRequest = z.infer<typeof confirmDiaryDayRequestSchema>
export type ListDiaryDayConfirmationsQuery = z.infer<typeof listDiaryDayConfirmationsQuerySchema>
export type DiaryDayConfirmation = z.infer<typeof diaryDayConfirmationSchema>
export type DiaryDayConfirmationResponse = z.infer<typeof diaryDayConfirmationResponseSchema>
export type DiaryDayConfirmationsResponse = z.infer<typeof diaryDayConfirmationsResponseSchema>
