import type { WorkoutEffort, WorkoutSession } from '@ai-fitness-coach/contracts';
import { type ComponentProps, useState } from 'react';
import { Alert as NativeAlert, StyleSheet, View } from 'react-native';

import { ScreenShell, ScreenState, SectionCard } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useUiTheme } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import { useOnboarding } from '@/features/onboarding';
import { ProfileButton } from '@/features/pilot-shell';
import { ExerciseCatalogCard } from '../components/ExerciseCatalogCard';
import { createTrainingMutationId } from '../mutation-id';
import { useTraining } from '../provider';
import {
  parseWorkoutDraft,
  type WorkoutExerciseDraft as ExerciseDraft,
  type WorkoutSetDraft as SetDraft,
} from '../workout-draft';


export function TrainingScreen() {
  const training = useTraining();
  const onboarding = useOnboarding();
  const [editor, setEditor] = useState<WorkoutSession | 'new' | null>(null);
  const plan = planSummary(onboarding.snapshot?.plan?.payload);
  const limitations = onboarding.snapshot?.plan?.limitations ?? [];

  if (training.isLoading) return <ScreenState status="loading" title="Загружаем тренировки" />;

  return (
    <ScreenShell
      actions={<ProfileButton />}
      description="Подтверждённая стратегия и фактически выполненные тренировки — без выдуманной программы."
      eyebrow="Первый пилот"
      keyboardAware
      testID={TEST_IDS.training.screen}
      title="План">
      {training.error ? (
        <Alert variant="destructive">
          <AlertTitle>Изменение не сохранено</AlertTitle>
          <AlertDescription>{training.error}</AlertDescription>
          <Button variant="outline" onPress={() => void training.reload()}>Обновить историю</Button>
        </Alert>
      ) : null}

      <SectionCard
        title="Стартовая стратегия"
        description="Это подтверждённые рамки из onboarding, а не готовый список упражнений.">
        {plan ? (
          <>
            <Typography variant="bodySm">Тренировок в неделю: {plan.daysPerWeek}</Typography>
            <Typography variant="bodySm">Ориентир длительности: {plan.durationMinutes} мин</Typography>
            <Typography variant="bodySm">Места: {plan.locations.join(', ')}</Typography>
            {limitations.includes('TRAINING_CONTENT_PENDING_EVIDENCE_REVIEW') ? (
              <Alert>
                <AlertTitle>Конкретная программа ещё не назначена</AlertTitle>
                <AlertDescription>
                  Упражнения и нагрузка появятся после проверенной библиотеки и правил безопасности.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : (
          <ScreenState
            description="Сначала завершите и подтвердите стартовую стратегию."
            status="empty"
            title="Стратегия пока не подтверждена"
          />
        )}
      </SectionCard>

      <SectionCard
        title="Проверенная библиотека"
        description="В план смогут попасть только версионированные упражнения с проверенной инструкцией и демонстрацией.">
        {training.isCatalogLoading ? (
          <Typography variant="bodySm" muted>Загружаем библиотеку…</Typography>
        ) : training.catalogError ? (
          <Alert variant="destructive">
            <AlertTitle>Библиотека недоступна</AlertTitle>
            <AlertDescription>{training.catalogError}</AlertDescription>
          </Alert>
        ) : training.catalog.length === 0 ? (
          <Typography variant="bodySm" muted>
            Пока нет упражнений, прошедших проверку. Приложение не будет подменять их случайными советами.
          </Typography>
        ) : training.catalog.map((exercise) => (
          <ExerciseCatalogCard exercise={exercise} key={exercise.id} />
        ))}
      </SectionCard>

      <SectionCard
        title="Фактическая тренировка"
        description="Запишите только то, что действительно выполнили. Это история, а не автоматическое назначение.">
        <Button testID={TEST_IDS.training.addButton} onPress={() => setEditor('new')}>
          Записать тренировку
        </Button>
      </SectionCard>

      {editor ? (
        <WorkoutEditor
          key={editor === 'new' ? 'new' : `${editor.id}:${editor.revision}`}
          session={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {training.sessions.length === 0 ? (
        <ScreenState
          description="Здесь появятся подтверждённые тренировки текущего месяца."
          status="empty"
          title="История пока пустая"
        />
      ) : (
        <SectionCard title="История тренировок">
          {training.sessions.map((session, index) => (
            <View key={session.id} style={styles.historyItem}>
              {index > 0 ? <Separator /> : null}
              <View style={styles.historyHeader}>
                <View style={styles.copy}>
                  <Typography variant="body" weight="700">{session.title}</Typography>
                  <Typography variant="caption" muted>
                    {formatDate(session.occurredAt)} · {session.durationMinutes ? `${session.durationMinutes} мин` : 'длительность не указана'}
                  </Typography>
                </View>
                <Typography variant="caption" weight="700">{effortLabel(session.effort)}</Typography>
              </View>
              {session.exercises.map((exercise) => (
                <Typography key={exercise.id} variant="bodySm" muted>
                  {exercise.name}: {exercise.sets.map(formatSet).join(' · ')}
                </Typography>
              ))}
              <View style={styles.actions}>
                <Button variant="outline" onPress={() => setEditor(session)}>Исправить</Button>
                <Button variant="ghost" onPress={() => confirmRemoval(session, training.remove)}>Удалить</Button>
              </View>
            </View>
          ))}
        </SectionCard>
      )}
    </ScreenShell>
  );
}

function WorkoutEditor({ session, onClose }: { session?: WorkoutSession; onClose: () => void }) {
  const training = useTraining();
  const theme = useUiTheme();
  const [clientMutationId] = useState(() => session ? null : createTrainingMutationId());
  const [title, setTitle] = useState(session?.title ?? '');
  const [durationMinutes, setDurationMinutes] = useState(session?.durationMinutes?.toString() ?? '');
  const [effort, setEffort] = useState<WorkoutEffort | null>(session?.effort ?? null);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    session?.exercises.map((exercise) => ({
      key: exercise.id,
      name: exercise.name,
      equipmentText: exercise.equipmentText ?? '',
      notes: exercise.notes ?? '',
      sets: exercise.sets.map((set) => ({
        key: set.id,
        reps: set.reps?.toString() ?? '',
        loadKg: set.loadKg?.toString() ?? '',
        durationSeconds: set.durationSeconds?.toString() ?? '',
      })),
    })) ?? [emptyExercise()],
  );
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const parsed = parseWorkoutDraft({ title, durationMinutes, effort, notes, exercises });
    if (!parsed.ok) return setError(parsed.message);
    setError(null);
    const common = {
      ...parsed.value,
      occurredAt: session?.occurredAt ?? new Date().toISOString(),
    };
    const saved = session
      ? await training.update(session.id, { ...common, expectedRevision: session.revision })
      : await training.create({ ...common, clientMutationId: clientMutationId! });
    if (saved) onClose();
  };

  return (
    <SectionCard
      title={session ? 'Исправить тренировку' : 'Новая тренировка'}
      description="Каждый подход сохраняется как выполненный факт. Не указывайте то, чего не делали.">
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <TextField label="Название тренировки" value={title} onChangeText={setTitle} />
      <TextField
        keyboardType="number-pad"
        label="Длительность, мин — необязательно"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
      />
      <Field>
        <FieldLabel>Как ощущалась нагрузка?</FieldLabel>
        <View style={[styles.actions, { gap: theme.spacing.sm }]}>
          {(['EASY', 'RIGHT', 'HARD', 'PAIN'] as const).map((value) => (
            <Button
              key={value}
              variant={effort === value ? 'default' : 'outline'}
              onPress={() => setEffort(effort === value ? null : value)}>
              {effortLabel(value)}
            </Button>
          ))}
        </View>
        {effort === 'PAIN' ? (
          <FieldDescription>
            Боль фиксируется как факт. Приложение не определяет допустимую нагрузку и не советует продолжать через боль.
          </FieldDescription>
        ) : null}
      </Field>
      <TextField label="Заметка — необязательно" multiline value={notes} onChangeText={setNotes} />

      {exercises.map((exercise, exerciseIndex) => (
        <ExerciseEditor
          key={exercise.key}
          exercise={exercise}
          index={exerciseIndex}
          canRemove={exercises.length > 1}
          onChange={(next) => setExercises((current) => current.map((item) => item.key === next.key ? next : item))}
          onRemove={() => setExercises((current) => current.filter((item) => item.key !== exercise.key))}
        />
      ))}
      <Button variant="outline" onPress={() => setExercises((current) => [...current, emptyExercise()])}>
        Добавить упражнение
      </Button>
      <View style={styles.actions}>
        <Button loading={training.isWorking} testID={TEST_IDS.training.saveButton} onPress={() => void save()}>
          Сохранить выполненную тренировку
        </Button>
        <Button variant="ghost" onPress={onClose}>Отмена</Button>
      </View>
    </SectionCard>
  );
}

function ExerciseEditor({ exercise, index, canRemove, onChange, onRemove }: {
  exercise: ExerciseDraft;
  index: number;
  canRemove: boolean;
  onChange: (exercise: ExerciseDraft) => void;
  onRemove: () => void;
}) {
  const theme = useUiTheme();

  return (
    <View style={[styles.exercise, { borderTopColor: theme.colors.border }]}>
      <View style={styles.historyHeader}>
        <Typography variant="body" weight="700">Упражнение {index + 1}</Typography>
        {canRemove ? <Button size="sm" variant="ghost" onPress={onRemove}>Убрать</Button> : null}
      </View>
      <TextField label="Название упражнения" value={exercise.name} onChangeText={(name) => onChange({ ...exercise, name })} />
      <TextField label="Инвентарь или тренажёр — необязательно" value={exercise.equipmentText} onChangeText={(equipmentText) => onChange({ ...exercise, equipmentText })} />
      <TextField label="Заметка по технике — необязательно" value={exercise.notes} onChangeText={(notes) => onChange({ ...exercise, notes })} />
      {exercise.sets.map((set, setIndex) => (
        <View key={set.key} style={styles.setRow}>
          <Typography style={styles.setNumber} variant="caption" weight="700">{setIndex + 1}</Typography>
          <Input keyboardType="number-pad" placeholder="Повт." style={styles.setInput} value={set.reps} onChangeText={(reps) => onChange({ ...exercise, sets: replaceSet(exercise.sets, { ...set, reps }) })} />
          <Input keyboardType="decimal-pad" placeholder="Кг" style={styles.setInput} value={set.loadKg} onChangeText={(loadKg) => onChange({ ...exercise, sets: replaceSet(exercise.sets, { ...set, loadKg }) })} />
          <Input keyboardType="number-pad" placeholder="Сек." style={styles.setInput} value={set.durationSeconds} onChangeText={(durationSeconds) => onChange({ ...exercise, sets: replaceSet(exercise.sets, { ...set, durationSeconds }) })} />
          {exercise.sets.length > 1 ? (
            <Button size="icon-sm" variant="ghost" onPress={() => onChange({ ...exercise, sets: exercise.sets.filter((item) => item.key !== set.key) })}>×</Button>
          ) : null}
        </View>
      ))}
      <Button variant="outline" onPress={() => onChange({ ...exercise, sets: [...exercise.sets, emptySet()] })}>
        Добавить подход
      </Button>
    </View>
  );
}

function TextField({ label, multiline, ...props }: ComponentProps<typeof Input> & { label: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input {...props} multiline={multiline} style={multiline ? styles.multiline : props.style} />
    </Field>
  );
}

function emptyExercise(): ExerciseDraft {
  return { key: draftKey(), name: '', equipmentText: '', notes: '', sets: [emptySet()] };
}

function emptySet(): SetDraft {
  return { key: draftKey(), reps: '', loadKg: '', durationSeconds: '' };
}

function draftKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function replaceSet(sets: SetDraft[], next: SetDraft) {
  return sets.map((set) => set.key === next.key ? next : set);
}

function effortLabel(effort: WorkoutEffort | null) {
  return effort === 'EASY' ? 'Легко' : effort === 'RIGHT' ? 'Нормально' : effort === 'HARD' ? 'Тяжело' : effort === 'PAIN' ? 'Боль' : 'Без оценки';
}

function formatSet(set: WorkoutSession['exercises'][number]['sets'][number]) {
  const parts = [];
  if (set.reps !== null) parts.push(`${set.reps} повт.`);
  if (set.loadKg !== null) parts.push(`${set.loadKg} кг`);
  if (set.durationSeconds !== null) parts.push(`${set.durationSeconds} сек.`);
  return parts.join(' × ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value));
}

function planSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const context = (payload as { trainingContext?: unknown }).trainingContext;
  if (!context || typeof context !== 'object') return null;
  const value = context as { daysPerWeek?: unknown; durationMinutes?: unknown; locations?: unknown };
  if (typeof value.daysPerWeek !== 'number' || typeof value.durationMinutes !== 'number' || !Array.isArray(value.locations)) return null;
  const labels: Record<string, string> = { HOME: 'дом', GYM: 'зал', OUTDOORS: 'улица' };
  return {
    daysPerWeek: value.daysPerWeek,
    durationMinutes: value.durationMinutes,
    locations: value.locations.map((item) => labels[String(item)] ?? String(item)),
  };
}

function confirmRemoval(session: WorkoutSession, remove: (session: WorkoutSession) => Promise<boolean>) {
  NativeAlert.alert(
    'Удалить тренировку?',
    'Она исчезнет из истории и дальнейшего контекста.',
    [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => void remove(session) },
    ],
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  copy: { flex: 1, minWidth: 0 },
  exercise: { borderTopWidth: StyleSheet.hairlineWidth, gap: 12, paddingTop: 16 },
  historyHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  historyItem: { gap: 10 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  setInput: { flex: 1, minWidth: 64 },
  setNumber: { width: 20 },
  setRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
});
