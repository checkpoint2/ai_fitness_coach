import type {
  CreateActivityEntryRequest,
  ConfirmDiaryDayRequest,
  CreateMeasurementEntryRequest,
  CreateNutritionEntryRequest,
  DeleteDiaryEntryRequest,
  DiaryEntriesResponse,
  DiaryDayConfirmationResponse,
  DiaryDayConfirmationsResponse,
  ListDiaryDayConfirmationsQuery,
  DiaryEntryResponse,
  ListDiaryEntriesQuery,
  UpdateActivityEntryRequest,
  UpdateMeasurementEntryRequest,
  UpdateNutritionEntryRequest,
} from '@ai-fitness-coach/contracts'

import type { DiaryClock, DiaryRepository, DiaryRequestHasher } from './ports'

type DiaryServiceOptions = {
  clock: DiaryClock
  hasher: DiaryRequestHasher
  repository: DiaryRepository
}

export class DiaryService {
  constructor(private readonly options: DiaryServiceOptions) {}

  async list(userId: string, query: ListDiaryEntriesQuery): Promise<DiaryEntriesResponse> {
    return { entries: await this.options.repository.list(userId, query) }
  }

  async listDayConfirmations(
    userId: string,
    query: ListDiaryDayConfirmationsQuery,
  ): Promise<DiaryDayConfirmationsResponse> {
    return { confirmations: await this.options.repository.listDayConfirmations(userId, query) }
  }

  async confirmDay(
    userId: string,
    request: ConfirmDiaryDayRequest,
  ): Promise<DiaryDayConfirmationResponse> {
    const confirmation = await this.options.repository.confirmDay({
      userId,
      request,
      requestHash: this.options.hasher.hash(request),
      confirmedAt: this.options.clock.now(),
    })
    return { confirmation }
  }

  async createNutrition(
    userId: string,
    request: CreateNutritionEntryRequest,
  ): Promise<DiaryEntryResponse> {
    const entry = await this.options.repository.createNutrition({
      userId,
      request,
      requestHash: this.options.hasher.hash(request),
      confirmedAt: this.options.clock.now(),
    })
    return { entry }
  }

  async createActivity(
    userId: string,
    request: CreateActivityEntryRequest,
  ): Promise<DiaryEntryResponse> {
    const entry = await this.options.repository.createActivity({
      userId,
      request,
      requestHash: this.options.hasher.hash(request),
      confirmedAt: this.options.clock.now(),
    })
    return { entry }
  }

  async createMeasurement(
    userId: string,
    request: CreateMeasurementEntryRequest,
  ): Promise<DiaryEntryResponse> {
    const entry = await this.options.repository.createMeasurement({
      userId,
      request,
      requestHash: this.options.hasher.hash(request),
      confirmedAt: this.options.clock.now(),
    })
    return { entry }
  }

  async updateNutrition(
    userId: string,
    entryId: string,
    request: UpdateNutritionEntryRequest,
  ): Promise<DiaryEntryResponse> {
    return {
      entry: await this.options.repository.updateNutrition({
        userId,
        entryId,
        request,
        confirmedAt: this.options.clock.now(),
      }),
    }
  }

  async updateActivity(
    userId: string,
    entryId: string,
    request: UpdateActivityEntryRequest,
  ): Promise<DiaryEntryResponse> {
    return {
      entry: await this.options.repository.updateActivity({
        userId,
        entryId,
        request,
        confirmedAt: this.options.clock.now(),
      }),
    }
  }

  async updateMeasurement(
    userId: string,
    entryId: string,
    request: UpdateMeasurementEntryRequest,
  ): Promise<DiaryEntryResponse> {
    return {
      entry: await this.options.repository.updateMeasurement({
        userId,
        entryId,
        request,
        confirmedAt: this.options.clock.now(),
      }),
    }
  }

  async deleteNutrition(
    userId: string,
    entryId: string,
    request: DeleteDiaryEntryRequest,
  ) {
    await this.options.repository.deleteNutrition(userId, entryId, request.expectedRevision)
    return { deleted: true as const }
  }

  async deleteActivity(
    userId: string,
    entryId: string,
    request: DeleteDiaryEntryRequest,
  ) {
    await this.options.repository.deleteActivity(userId, entryId, request.expectedRevision)
    return { deleted: true as const }
  }
  async deleteMeasurement(
    userId: string,
    entryId: string,
    request: DeleteDiaryEntryRequest,
  ) {
    await this.options.repository.deleteMeasurement(userId, entryId, request.expectedRevision)
    return { deleted: true as const }
  }

  async deleteDayConfirmation(
    userId: string,
    localDate: string,
    request: DeleteDiaryEntryRequest,
  ) {
    await this.options.repository.deleteDayConfirmation(
      userId,
      localDate,
      request.expectedRevision,
    )
    return { deleted: true as const }
  }
}
