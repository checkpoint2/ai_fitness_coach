import type { DiaryEntry } from '@ai-fitness-coach/contracts';

export type RecordedIntakeSummary = {
  recordedCaloriesKcal: number;
  hasNutritionWithoutCalories: boolean;
  nutritionEntryCount: number;
};

export function summarizeRecordedIntake(entries: DiaryEntry[]): RecordedIntakeSummary {
  return entries.reduce<RecordedIntakeSummary>((summary, entry) => {
    if (entry.kind !== 'NUTRITION') return summary;

    summary.nutritionEntryCount += 1;
    if (entry.nutrition?.caloriesKcal === undefined || entry.nutrition.caloriesKcal === null) {
      summary.hasNutritionWithoutCalories = true;
    } else {
      summary.recordedCaloriesKcal += entry.nutrition.caloriesKcal;
    }
    return summary;
  }, {
    recordedCaloriesKcal: 0,
    hasNutritionWithoutCalories: false,
    nutritionEntryCount: 0,
  });
}
