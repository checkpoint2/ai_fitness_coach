import type { OnboardingDraftPatch } from '@ai-fitness-coach/contracts';

type BodyGoal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION' | 'MAINTENANCE';
type TrainingGoal = 'GENERAL_FITNESS' | 'STRENGTH' | 'ENDURANCE' | 'MOBILITY_RECOVERY';
type NutritionTrackingMode = 'FREE_TEXT' | 'PRECISE' | 'HYBRID';
type SafetyAnswer = 'NO' | 'YES' | 'UNSURE' | 'DECLINED';

type OptionalChoice<T extends string> = '' | T;

export type ManualOnboardingValues = {
  adultConfirmed: boolean;
  birthYearAnswer: OptionalChoice<'VALUE' | 'DECLINED'>;
  birthYear: string;
  calculationSexAnswer: OptionalChoice<'MALE' | 'FEMALE' | 'DECLINED'>;
  heightCm: string;
  heightApproximate: boolean;
  currentWeightKg: string;
  weightApproximate: boolean;
  timezone: string;
  bodyGoal: OptionalChoice<BodyGoal>;
  trainingGoal: OptionalChoice<TrainingGoal>;
  trainingExperience: string;
  trainingAtHome: boolean;
  trainingAtGym: boolean;
  trainingOutdoors: boolean;
  equipment: string;
  trainingDaysPerWeek: string;
  workoutDurationMinutes: string;
  ordinaryDayDescription: string;
  allergiesAnswer: OptionalChoice<'NONE' | 'UNSURE' | 'VALUE'>;
  allergiesText: string;
  nutritionTrackingMode: OptionalChoice<NutritionTrackingMode>;
  currentPainOrInjury: OptionalChoice<SafetyAnswer>;
  doctorRestriction: OptionalChoice<SafetyAnswer>;
  ordinaryFitnessSuitabilityDoubt: OptionalChoice<SafetyAnswer>;
  supervisedNutritionOrActivityOnly: OptionalChoice<SafetyAnswer>;
};

export function emptyManualOnboardingValues(timezone: string): ManualOnboardingValues {
  return {
    adultConfirmed: false,
    birthYearAnswer: '',
    birthYear: '',
    calculationSexAnswer: '',
    heightCm: '',
    heightApproximate: false,
    currentWeightKg: '',
    weightApproximate: false,
    timezone,
    bodyGoal: '',
    trainingGoal: '',
    trainingExperience: '',
    trainingAtHome: false,
    trainingAtGym: false,
    trainingOutdoors: false,
    equipment: '',
    trainingDaysPerWeek: '',
    workoutDurationMinutes: '',
    ordinaryDayDescription: '',
    allergiesAnswer: '',
    allergiesText: '',
    nutritionTrackingMode: '',
    currentPainOrInjury: '',
    doctorRestriction: '',
    ordinaryFitnessSuitabilityDoubt: '',
    supervisedNutritionOrActivityOnly: '',
  };
}

export function manualOnboardingValuesFromPatch(
  patch: OnboardingDraftPatch,
  timezone: string,
): ManualOnboardingValues {
  const values = emptyManualOnboardingValues(timezone);
  const draftValue = (key: keyof OnboardingDraftPatch) => {
    const field = patch[key];
    return field?.state === 'DRAFT' ? field.value : undefined;
  };
  const birthYear = draftValue('birthYear');
  const calculationSex = draftValue('calculationSex');
  const locations = draftValue('trainingLocations');
  const allergies = draftValue('allergiesAndExclusions');

  values.adultConfirmed = draftValue('adultConfirmed') === true;
  if (isTaggedValue(birthYear) && birthYear.kind === 'DECLINED') {
    values.birthYearAnswer = 'DECLINED';
  }
  if (isTaggedValue(birthYear) && birthYear.kind === 'VALUE' && 'year' in birthYear) {
    values.birthYearAnswer = 'VALUE';
    values.birthYear = String(birthYear.year);
  }
  if (isTaggedValue(calculationSex) && calculationSex.kind === 'DECLINED') {
    values.calculationSexAnswer = 'DECLINED';
  }
  if (
    isTaggedValue(calculationSex) &&
    calculationSex.kind === 'VALUE' &&
    'value' in calculationSex &&
    (calculationSex.value === 'MALE' || calculationSex.value === 'FEMALE')
  ) {
    values.calculationSexAnswer = calculationSex.value;
  }
  values.heightCm = optionalString(draftValue('heightCm'));
  values.heightApproximate = patch.heightCm?.state === 'DRAFT' && patch.heightCm.isApproximate;
  values.currentWeightKg = optionalString(draftValue('currentWeightKg'));
  values.weightApproximate = patch.currentWeightKg?.state === 'DRAFT' && patch.currentWeightKg.isApproximate;
  values.timezone = optionalString(draftValue('timezone')) || timezone;
  values.bodyGoal = (draftValue('bodyGoal') as ManualOnboardingValues['bodyGoal']) ?? '';
  values.trainingGoal = (draftValue('trainingGoal') as ManualOnboardingValues['trainingGoal']) ?? '';
  values.trainingExperience = optionalString(draftValue('trainingExperience'));
  values.trainingAtHome = Array.isArray(locations) && locations.includes('HOME');
  values.trainingAtGym = Array.isArray(locations) && locations.includes('GYM');
  values.trainingOutdoors = Array.isArray(locations) && locations.includes('OUTDOORS');
  const equipment = draftValue('equipment');
  values.equipment = Array.isArray(equipment) ? equipment.join(', ') : '';
  values.trainingDaysPerWeek = optionalString(draftValue('trainingDaysPerWeek'));
  values.workoutDurationMinutes = optionalString(draftValue('workoutDurationMinutes'));
  values.ordinaryDayDescription = optionalString(draftValue('ordinaryDayDescription'));
  if (isTaggedValue(allergies) && (allergies.kind === 'NONE' || allergies.kind === 'UNSURE')) {
    values.allergiesAnswer = allergies.kind;
  }
  if (isTaggedValue(allergies) && allergies.kind === 'VALUE' && 'text' in allergies) {
    values.allergiesAnswer = 'VALUE';
    values.allergiesText = String(allergies.text);
  }
  values.nutritionTrackingMode =
    (draftValue('nutritionTrackingMode') as ManualOnboardingValues['nutritionTrackingMode']) ?? '';
  values.currentPainOrInjury =
    (draftValue('currentPainOrInjury') as ManualOnboardingValues['currentPainOrInjury']) ?? '';
  values.doctorRestriction =
    (draftValue('doctorRestriction') as ManualOnboardingValues['doctorRestriction']) ?? '';
  values.ordinaryFitnessSuitabilityDoubt =
    (draftValue('ordinaryFitnessSuitabilityDoubt') as ManualOnboardingValues['ordinaryFitnessSuitabilityDoubt']) ?? '';
  values.supervisedNutritionOrActivityOnly =
    (draftValue('supervisedNutritionOrActivityOnly') as ManualOnboardingValues['supervisedNutritionOrActivityOnly']) ?? '';
  return values;
}

export function buildManualOnboardingPatch(values: ManualOnboardingValues):
  | { ok: true; patch: OnboardingDraftPatch }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const heightCm = numberInRange(values.heightCm, 50, 300);
  const currentWeightKg = numberInRange(values.currentWeightKg, 20, 500);
  const trainingDaysPerWeek = integerInRange(values.trainingDaysPerWeek, 1, 7);
  const workoutDurationMinutes = integerInRange(values.workoutDurationMinutes, 5, 300);
  const locations = [
    values.trainingAtHome ? 'HOME' : null,
    values.trainingAtGym ? 'GYM' : null,
    values.trainingOutdoors ? 'OUTDOORS' : null,
  ].filter((value): value is 'HOME' | 'GYM' | 'OUTDOORS' => value !== null);
  const requiresEquipment = values.trainingAtHome || values.trainingAtGym;
  const equipment = commaList(values.equipment);

  if (!values.adultConfirmed) errors.push('Подтвердите, что вам уже исполнилось 18 лет');
  if (!values.birthYearAnswer) errors.push('Ответьте на вопрос о годе рождения');
  if (values.birthYearAnswer === 'VALUE' && !integerInRange(values.birthYear, 1900, 2100)) {
    errors.push('Укажите корректный год рождения');
  }
  if (!values.calculationSexAnswer) errors.push('Ответьте на вопрос о параметре для расчётов');
  if (heightCm === null) errors.push('Укажите рост от 50 до 300 см');
  if (currentWeightKg === null) errors.push('Укажите вес от 20 до 500 кг');
  if (!values.timezone.trim()) errors.push('Подтвердите часовой пояс');
  if (!values.bodyGoal) errors.push('Выберите цель по телу');
  if (!values.trainingGoal) errors.push('Выберите тренировочную цель');
  if (!values.trainingExperience.trim()) errors.push('Коротко опишите опыт тренировок');
  if (locations.length === 0) errors.push('Выберите хотя бы одно место тренировок');
  if (requiresEquipment && equipment.length === 0) {
    errors.push('Укажите доступный инвентарь или напишите «без инвентаря»');
  }
  if (trainingDaysPerWeek === null) errors.push('Укажите от 1 до 7 тренировочных дней');
  if (workoutDurationMinutes === null) errors.push('Укажите длительность тренировки от 5 до 300 минут');
  if (!values.ordinaryDayDescription.trim()) errors.push('Коротко опишите обычный день и работу');
  if (!values.allergiesAnswer) errors.push('Ответьте на вопрос об аллергиях и исключениях');
  if (values.allergiesAnswer === 'VALUE' && !values.allergiesText.trim()) {
    errors.push('Перечислите аллергии или обязательные исключения');
  }
  if (!values.nutritionTrackingMode) errors.push('Выберите удобный режим учёта питания');
  if (
    !values.currentPainOrInjury ||
    !values.doctorRestriction ||
    !values.ordinaryFitnessSuitabilityDoubt ||
    !values.supervisedNutritionOrActivityOnly
  ) {
    errors.push('Ответьте на все четыре вопроса об ограничениях');
  }

  if (errors.length > 0) return { ok: false, errors };

  const structured = <T>(value: T, isApproximate = false) => ({
    state: 'DRAFT' as const,
    value,
    sourceKind: 'STRUCTURED' as const,
    isApproximate,
  });
  const birthYear = values.birthYearAnswer === 'DECLINED'
    ? { kind: 'DECLINED' as const }
    : { kind: 'VALUE' as const, year: Number(values.birthYear) };
  const calculationSex = values.calculationSexAnswer === 'DECLINED'
    ? { kind: 'DECLINED' as const }
    : { kind: 'VALUE' as const, value: values.calculationSexAnswer as 'MALE' | 'FEMALE' };
  const allergies = values.allergiesAnswer === 'VALUE'
    ? { kind: 'VALUE' as const, text: values.allergiesText.trim() }
    : { kind: values.allergiesAnswer as 'NONE' | 'UNSURE' };

  return {
    ok: true,
    patch: {
      adultConfirmed: structured(true),
      birthYear: structured(birthYear),
      calculationSex: structured(calculationSex),
      heightCm: structured(heightCm!, values.heightApproximate),
      currentWeightKg: structured(currentWeightKg!, values.weightApproximate),
      timezone: structured(values.timezone.trim()),
      bodyGoal: structured(values.bodyGoal as BodyGoal),
      trainingGoal: structured(values.trainingGoal as TrainingGoal),
      trainingExperience: structured(values.trainingExperience.trim()),
      trainingLocations: structured(locations),
      ...(requiresEquipment ? { equipment: structured(equipment) } : {}),
      trainingDaysPerWeek: structured(trainingDaysPerWeek!),
      workoutDurationMinutes: structured(workoutDurationMinutes!),
      ordinaryDayDescription: structured(values.ordinaryDayDescription.trim()),
      allergiesAndExclusions: structured(allergies),
      nutritionTrackingMode: structured(values.nutritionTrackingMode as NutritionTrackingMode),
      currentPainOrInjury: structured(values.currentPainOrInjury as SafetyAnswer),
      doctorRestriction: structured(values.doctorRestriction as SafetyAnswer),
      ordinaryFitnessSuitabilityDoubt: structured(values.ordinaryFitnessSuitabilityDoubt as SafetyAnswer),
      supervisedNutritionOrActivityOnly: structured(values.supervisedNutritionOrActivityOnly as SafetyAnswer),
    },
  };
}

function numberInRange(value: string, min: number, max: number) {
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function integerInRange(value: string, min: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function commaList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function optionalString(value: unknown) {
  return value === undefined || value === null ? '' : String(value);
}

function isTaggedValue(value: unknown): value is { kind: string; [key: string]: unknown } {
  return Boolean(value && typeof value === 'object' && 'kind' in value);
}
