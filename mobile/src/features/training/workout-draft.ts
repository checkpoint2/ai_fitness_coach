import type { CreateWorkoutSessionRequest, WorkoutEffort } from '@ai-fitness-coach/contracts';

export type WorkoutSetDraft = {
  key: string;
  reps: string;
  loadKg: string;
  durationSeconds: string;
};
export type WorkoutExerciseDraft = {
  key: string;
  name: string;
  equipmentText: string;
  notes: string;
  sets: WorkoutSetDraft[];
};

export function parseWorkoutDraft(input: {
  title: string;
  durationMinutes: string;
  effort: WorkoutEffort | null;
  notes: string;
  exercises: WorkoutExerciseDraft[];
}): { ok: true; value: Omit<CreateWorkoutSessionRequest, 'clientMutationId' | 'occurredAt'> } | { ok: false; message: string } {
  if (!input.title.trim()) return { ok: false, message: 'Укажите название тренировки' };
  if (input.exercises.length === 0) return { ok: false, message: 'Добавьте хотя бы одно упражнение' };
  const duration = optionalNumber(input.durationMinutes, true);
  if (!duration.ok || (duration.value !== null && (duration.value < 1 || duration.value > 1_440))) {
    return { ok: false, message: 'Длительность должна быть от 1 до 1440 минут' };
  }
  const exercises = [];
  for (const [exerciseIndex, exercise] of input.exercises.entries()) {
    if (!exercise.name.trim()) return { ok: false, message: `Укажите название упражнения ${exerciseIndex + 1}` };
    if (exercise.sets.length === 0) return { ok: false, message: `Добавьте хотя бы один подход в упражнение ${exerciseIndex + 1}` };
    const sets = [];
    for (const [setIndex, set] of exercise.sets.entries()) {
      const reps = optionalNumber(set.reps, true);
      const loadKg = optionalNumber(set.loadKg, false);
      const seconds = optionalNumber(set.durationSeconds, true);
      if (!reps.ok || !loadKg.ok || !seconds.ok) return { ok: false, message: `Проверьте числа в подходе ${setIndex + 1}` };
      if (reps.value === 0 || seconds.value === 0) return { ok: false, message: `Повторения и время в подходе ${setIndex + 1} должны быть больше нуля` };
      if (reps.value === null && loadKg.value === null && seconds.value === null) {
        return { ok: false, message: `В подходе ${setIndex + 1} укажите повторения, вес или время` };
      }
      sets.push({ reps: reps.value, loadKg: loadKg.value, durationSeconds: seconds.value, completed: true as const });
    }
    exercises.push({
      name: exercise.name.trim(),
      equipmentText: exercise.equipmentText.trim() || null,
      notes: exercise.notes.trim() || null,
      sets,
    });
  }
  return {
    ok: true,
    value: {
      title: input.title.trim(),
      durationMinutes: duration.value,
      effort: input.effort,
      notes: input.notes.trim() || null,
      exercises,
    },
  };
}

function optionalNumber(value: string, integer: boolean) {
  if (!value.trim()) return { ok: true as const, value: null };
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    return { ok: false as const, value: null };
  }
  return { ok: true as const, value: parsed };
}
