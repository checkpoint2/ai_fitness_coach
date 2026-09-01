import type { DiaryDayConfirmation, DiaryEntry } from '@ai-fitness-coach/contracts';

export type ProgressCalendarDayStatus =
  | 'FUTURE'
  | 'UNCONFIRMED'
  | 'CONFIRMED_NEUTRAL';

export function summarizeProgressDay(
  entries: DiaryEntry[],
  confirmation: DiaryDayConfirmation | null,
) {
  let activityCount = 0;
  let activityDurationMinutes = 0;
  let activityWithoutCalories = false;
  let activityWithoutDuration = false;
  let estimatedMetricCount = 0;
  let measurementCount = 0;
  let nutritionCount = 0;
  let nutritionWithoutCalories = false;
  let recordedActivityCaloriesKcal = 0;
  let recordedIntakeCaloriesKcal = 0;

  for (const entry of entries) {
    if (entry.kind === 'NUTRITION') {
      nutritionCount += 1;
      if (entry.nutrition?.caloriesKcal === undefined) {
        nutritionWithoutCalories = true;
      } else {
        recordedIntakeCaloriesKcal += entry.nutrition.caloriesKcal;
      }
      if (entry.nutrition?.truthKind === 'ESTIMATE') estimatedMetricCount += 1;
      continue;
    }

    if (entry.kind === 'ACTIVITY') {
      activityCount += 1;
      if (entry.durationMinutes === null) activityWithoutDuration = true;
      else activityDurationMinutes += entry.durationMinutes;
      if (entry.expenditure) {
        recordedActivityCaloriesKcal += entry.expenditure.caloriesKcal;
        if (entry.expenditure.truthKind === 'ESTIMATE') estimatedMetricCount += 1;
      } else activityWithoutCalories = true;
      continue;
    }

    measurementCount += 1;
    if (entry.truthKind === 'ESTIMATE') estimatedMetricCount += 1;
  }

  return {
    activityCount,
    activityDurationMinutes,
    activityWithoutCalories,
    activityWithoutDuration,
    confirmedComplete: confirmation !== null,
    estimatedMetricCount,
    measurementCount,
    nutritionCount,
    nutritionWithoutCalories,
    recordedActivityCaloriesKcal,
    recordedIntakeCaloriesKcal,
  };
}

export function calendarDayStatus(
  date: Date,
  today: Date,
  confirmed: boolean,
): ProgressCalendarDayStatus {
  if (startOfLocalDay(date).getTime() > startOfLocalDay(today).getTime()) return 'FUTURE';
  return confirmed ? 'CONFIRMED_NEUTRAL' : 'UNCONFIRMED';
}

export function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function diaryEntryLocalDate(entry: DiaryEntry) {
  return localDateKey(new Date(entry.occurredAt));
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
