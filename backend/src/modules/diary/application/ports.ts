import type {
  ActivityEntry,
  ConfirmDiaryDayRequest,
  CreateActivityEntryRequest,
  CreateMeasurementEntryRequest,
  CreateNutritionEntryRequest,
  DiaryEntry,
  DiaryDayConfirmation,
  ListDiaryDayConfirmationsQuery,
  ListDiaryEntriesQuery,
  MeasurementEntry,
  NutritionEntry,
  UpdateActivityEntryRequest,
  UpdateMeasurementEntryRequest,
  UpdateNutritionEntryRequest,
} from '@ai-fitness-coach/contracts'

export type DiaryClock = { now(): Date }
export type DiaryRequestHasher = { hash(value: unknown): string }

export type CreateNutritionRecordInput = {
  userId: string
  request: CreateNutritionEntryRequest
  requestHash: string
  confirmedAt: Date
}
export type CreateActivityRecordInput = {
  userId: string
  request: CreateActivityEntryRequest
  requestHash: string
  confirmedAt: Date
}
export type UpdateNutritionRecordInput = {
  userId: string
  entryId: string
  request: UpdateNutritionEntryRequest
  confirmedAt: Date
}
export type UpdateActivityRecordInput = {
  userId: string
  entryId: string
  request: UpdateActivityEntryRequest
  confirmedAt: Date
}
export type CreateMeasurementRecordInput = {
  userId: string
  request: CreateMeasurementEntryRequest
  requestHash: string
  confirmedAt: Date
}
export type UpdateMeasurementRecordInput = {
  userId: string
  entryId: string
  request: UpdateMeasurementEntryRequest
  confirmedAt: Date
}
export type ConfirmDiaryDayRecordInput = {
  userId: string
  request: ConfirmDiaryDayRequest
  requestHash: string
  confirmedAt: Date
}

export type DiaryRepository = {
  list(userId: string, query: ListDiaryEntriesQuery): Promise<DiaryEntry[]>
  listDayConfirmations(
    userId: string,
    query: ListDiaryDayConfirmationsQuery,
  ): Promise<DiaryDayConfirmation[]>
  createNutrition(input: CreateNutritionRecordInput): Promise<NutritionEntry>
  createActivity(input: CreateActivityRecordInput): Promise<ActivityEntry>
  createMeasurement(input: CreateMeasurementRecordInput): Promise<MeasurementEntry>
  confirmDay(input: ConfirmDiaryDayRecordInput): Promise<DiaryDayConfirmation>
  updateNutrition(input: UpdateNutritionRecordInput): Promise<NutritionEntry>
  updateActivity(input: UpdateActivityRecordInput): Promise<ActivityEntry>
  updateMeasurement(input: UpdateMeasurementRecordInput): Promise<MeasurementEntry>
  deleteNutrition(userId: string, entryId: string, expectedRevision: number): Promise<void>
  deleteActivity(userId: string, entryId: string, expectedRevision: number): Promise<void>
  deleteMeasurement(userId: string, entryId: string, expectedRevision: number): Promise<void>
  deleteDayConfirmation(userId: string, localDate: string, expectedRevision: number): Promise<void>
}
