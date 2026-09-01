import { useForm } from '@tanstack/react-form';
import type {
  ActivityEntry,
  BodyMeasurementKind,
  BodyMeasurementUnit,
  DiaryEntry,
  MeasurementEntry,
  NutritionEntry,
} from '@ai-fitness-coach/contracts';
import { type ComponentProps, useState } from 'react';
import { Alert as NativeAlert, StyleSheet, View } from 'react-native';

import { ScreenShell, ScreenState, SectionCard } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUiTheme } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import { ProfileButton } from '@/features/pilot-shell';
import { createDiaryMutationId } from '../mutation-id';
import { currentLocalDay, useDiary } from '../provider';

type Editor =
  | { kind: 'NUTRITION'; entry?: NutritionEntry }
  | { kind: 'ACTIVITY'; entry?: ActivityEntry }
  | { kind: 'MEASUREMENT'; entry?: MeasurementEntry };

export function DiaryScreen() {
  const diary = useDiary();
  const theme = useUiTheme();
  const [editor, setEditor] = useState<Editor | null>(null);
  const localDay = currentLocalDay();

  if (diary.isLoading) return <ScreenState status="loading" title="Загружаем дневник" />;

  return (
    <ScreenShell
      actions={<ProfileButton />}
      description="Еда и активность за сегодня — по времени, без обязательных завтраков и ужинов."
      eyebrow="Сегодня"
      keyboardAware
      testID={TEST_IDS.diary.screen}
      title="Дневник">
      {diary.error ? (
        <Alert variant="destructive">
          <AlertTitle>Изменение не сохранено</AlertTitle>
          <AlertDescription>{diary.error}</AlertDescription>
          <Button variant="outline" onPress={() => void diary.reload()}>Обновить дневник</Button>
        </Alert>
      ) : null}

      <SectionCard title="Добавить запись" description="Сейчас доступен надёжный ручной путь без AI.">
        <View style={[styles.actionRow, { gap: theme.spacing.sm }]}>
          <Button
            style={styles.action}
            testID={TEST_IDS.diary.nutritionButton}
            onPress={() => setEditor({ kind: 'NUTRITION' })}>
            Еда
          </Button>
          <Button
            style={styles.action}
            testID={TEST_IDS.diary.activityButton}
            variant="outline"
            onPress={() => setEditor({ kind: 'ACTIVITY' })}>
            Активность
          </Button>
          <Button
            style={styles.action}
            testID={TEST_IDS.diary.measurementButton}
            variant="outline"
            onPress={() => setEditor({ kind: 'MEASUREMENT' })}>
            Вес и замеры
          </Button>
        </View>
      </SectionCard>

      {editor?.kind === 'NUTRITION' ? (
        <NutritionEditor entry={editor.entry} onClose={() => setEditor(null)} />
      ) : null}
      {editor?.kind === 'ACTIVITY' ? (
        <ActivityEditor entry={editor.entry} onClose={() => setEditor(null)} />
      ) : null}
      {editor?.kind === 'MEASUREMENT' ? (
        <MeasurementEditor entry={editor.entry} onClose={() => setEditor(null)} />
      ) : null}

      <SectionCard
        title={diary.dayConfirmation ? 'День отмечен заполненным' : 'Всё внесено за сегодня?'}
        description={diary.dayConfirmation
          ? 'Питание и активность подтверждены как заполненные. Это ещё не оценка результата и не зелёный цвет.'
          : 'Отметьте только когда внесли всё питание и активность, включая отсутствие активности. Это не оценивает день.'}>
        {diary.dayConfirmation ? (
          <Button
            loading={diary.isWorking}
            testID={TEST_IDS.diary.reopenDayButton}
            variant="outline"
            onPress={() => void diary.removeDayConfirmation()}>
            Продолжить заполнение
          </Button>
        ) : (
          <Button
            loading={diary.isWorking}
            testID={TEST_IDS.diary.confirmDayButton}
            onPress={() => void diary.confirmDay({
              clientMutationId: createDiaryMutationId(),
              localDate: localDay.localDate,
              timeZone: localDay.timeZone,
              nutritionComplete: true,
              activityComplete: true,
            })}>
            Питание и активность внесены
          </Button>
        )}
      </SectionCard>

      {diary.entries.length === 0 ? (
        <ScreenState
          description="Добавьте то, что действительно было. Отсутствие записи не считается нулём."
          status="empty"
          title="Сегодня записей пока нет"
        />
      ) : (
        <SectionCard title="Хронология">
          {diary.entries.map((entry) => (
            <DiaryEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => setEditor(
                entry.kind === 'NUTRITION'
                  ? { kind: 'NUTRITION', entry }
                  : entry.kind === 'ACTIVITY'
                    ? { kind: 'ACTIVITY', entry }
                    : { kind: 'MEASUREMENT', entry },
              )}
              onRemove={() => confirmRemoval(entry, diary.remove)}
            />
          ))}
        </SectionCard>
      )}
    </ScreenShell>
  );
}

function NutritionEditor({ entry, onClose }: { entry?: NutritionEntry; onClose: () => void }) {
  const diary = useDiary();
  const [error, setError] = useState<string | null>(null);
  const [clientMutationId] = useState(() => entry ? null : createDiaryMutationId());
  const form = useForm({
    defaultValues: {
      description: entry?.description ?? '',
      amountText: entry?.amountText ?? '',
      caloriesKcal: optionalMetric(entry?.nutrition?.caloriesKcal),
      proteinGrams: optionalMetric(entry?.nutrition?.proteinGrams),
      fatGrams: optionalMetric(entry?.nutrition?.fatGrams),
      carbohydrateGrams: optionalMetric(entry?.nutrition?.carbohydrateGrams),
      approximate: entry?.nutrition?.truthKind === 'ESTIMATE',
    },
    onSubmit: async ({ value }) => {
      const parsed = parseNutrition(value);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      setError(null);
      const common = {
        description: value.description.trim(),
        occurredAt: entry?.occurredAt ?? new Date().toISOString(),
        category: entry?.category ?? null,
        amountText: value.amountText.trim() || null,
        nutrition: parsed.nutrition,
      };
      const saved = entry
        ? await diary.updateNutrition(entry.id, { ...common, expectedRevision: entry.revision })
        : await diary.createNutrition({ ...common, clientMutationId: clientMutationId! });
      if (saved) onClose();
    },
  });

  return (
    <SectionCard
      title={entry ? 'Исправить еду' : 'Добавить еду'}
      description="Опишите запись обычными словами. Известные КБЖУ можно добавить ниже, но это необязательно.">
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form.Field name="description">
        {(field) => <TextField label="Что и сколько вы съели?" multiline testID={TEST_IDS.diary.descriptionInput} value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <form.Field name="amountText">
        {(field) => <TextField label="Порция или вес — если знаете" placeholder="Например: 250 г или одна тарелка" value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <View style={styles.metricGrid}>
        <form.Field name="caloriesKcal">{(field) => <MetricField label="Ккал" value={field.state.value} onChangeText={field.handleChange} />}</form.Field>
        <form.Field name="proteinGrams">{(field) => <MetricField label="Белки, г" value={field.state.value} onChangeText={field.handleChange} />}</form.Field>
        <form.Field name="fatGrams">{(field) => <MetricField label="Жиры, г" value={field.state.value} onChangeText={field.handleChange} />}</form.Field>
        <form.Field name="carbohydrateGrams">{(field) => <MetricField label="Углеводы, г" value={field.state.value} onChangeText={field.handleChange} />}</form.Field>
      </View>
      <form.Field name="approximate">
        {(field) => (
          <Button variant={field.state.value ? 'default' : 'outline'} onPress={() => field.handleChange(!field.state.value)}>
            {field.state.value ? 'Числа приблизительные' : 'Числа известны пользователю'}
          </Button>
        )}
      </form.Field>
      <EditorActions form={form} isWorking={diary.isWorking} onClose={onClose} />
    </SectionCard>
  );
}

function ActivityEditor({ entry, onClose }: { entry?: ActivityEntry; onClose: () => void }) {
  const diary = useDiary();
  const [error, setError] = useState<string | null>(null);
  const [clientMutationId] = useState(() => entry ? null : createDiaryMutationId());
  const form = useForm({
    defaultValues: {
      description: entry?.description ?? '',
      durationMinutes: optionalMetric(entry?.durationMinutes ?? undefined),
      caloriesKcal: optionalMetric(entry?.expenditure?.caloriesKcal),
      approximate: entry?.expenditure?.truthKind !== 'FACT',
    },
    onSubmit: async ({ value }) => {
      const duration = parseOptionalNumber(value.durationMinutes, true);
      const calories = parseOptionalNumber(value.caloriesKcal, false);
      if (!value.description.trim()) return setError('Опишите активность');
      if (!duration.ok || !calories.ok) return setError('Проверьте длительность и расход');
      setError(null);
      const common = {
        description: value.description.trim(),
        occurredAt: entry?.occurredAt ?? new Date().toISOString(),
        durationMinutes: duration.value ?? null,
        expenditure: calories.value === undefined
          ? null
          : { caloriesKcal: calories.value, truthKind: value.approximate ? 'ESTIMATE' as const : 'FACT' as const },
      };
      const saved = entry
        ? await diary.updateActivity(entry.id, { ...common, expectedRevision: entry.revision })
        : await diary.createActivity({ ...common, clientMutationId: clientMutationId! });
      if (saved) onClose();
    },
  });

  return (
    <SectionCard
      title={entry ? 'Исправить активность' : 'Добавить активность'}
      description="Запишите прогулку, физическую работу или спорт. Расход можно оставить неизвестным.">
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form.Field name="description">
        {(field) => <TextField label="Что вы делали?" multiline testID={TEST_IDS.diary.descriptionInput} value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <form.Field name="durationMinutes">
        {(field) => <MetricField label="Длительность, мин" value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <form.Field name="caloriesKcal">
        {(field) => <MetricField label="Расход, ккал — если знаете" value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <form.Field name="approximate">
        {(field) => (
          <Button variant={field.state.value ? 'default' : 'outline'} onPress={() => field.handleChange(!field.state.value)}>
            {field.state.value ? 'Расход приблизительный' : 'Значение получено из известного источника'}
          </Button>
        )}
      </form.Field>
      <EditorActions form={form} isWorking={diary.isWorking} onClose={onClose} />
    </SectionCard>
  );
}

function MeasurementEditor({ entry, onClose }: { entry?: MeasurementEntry; onClose: () => void }) {
  const diary = useDiary();
  const [error, setError] = useState<string | null>(null);
  const [clientMutationId] = useState(() => entry ? null : createDiaryMutationId());
  const form = useForm({
    defaultValues: {
      measurementKind: entry?.measurementKind ?? 'WEIGHT' as BodyMeasurementKind,
      label: entry?.label ?? '',
      value: entry ? String(entry.value) : '',
      unit: entry?.unit ?? 'KG' as BodyMeasurementUnit,
      approximate: entry?.truthKind === 'ESTIMATE',
    },
    onSubmit: async ({ value }) => {
      const parsed = parseOptionalNumber(value.value, false);
      const label = value.label.trim() || null;
      if (!parsed.ok || parsed.value === undefined || parsed.value <= 0) {
        setError('Укажите значение больше нуля');
        return;
      }
      if (value.measurementKind === 'CUSTOM' && !label) {
        setError('Назовите собственный показатель');
        return;
      }
      setError(null);
      const common = {
        measurementKind: value.measurementKind,
        label: value.measurementKind === 'CUSTOM' ? label : null,
        value: parsed.value,
        unit: measurementUnit(value.measurementKind, value.unit),
        occurredAt: entry?.occurredAt ?? new Date().toISOString(),
        truthKind: value.approximate ? 'ESTIMATE' as const : 'FACT' as const,
      };
      const saved = entry
        ? await diary.updateMeasurement(entry.id, { ...common, expectedRevision: entry.revision })
        : await diary.createMeasurement({ ...common, clientMutationId: clientMutationId! });
      if (saved) onClose();
    },
  });

  return (
    <SectionCard
      title={entry ? 'Исправить замер' : 'Добавить замер'}
      description="Замеры добровольны. Один показатель — одна датированная запись.">
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form.Field name="measurementKind">
        {(field) => (
          <ChoiceButtons
            options={MEASUREMENT_KINDS}
            value={field.state.value}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.measurementKind}>
        {(measurementKind) => measurementKind === 'CUSTOM' ? (
          <>
            <form.Field name="label">
              {(field) => <TextField label="Название показателя" placeholder="Например: обхват плеч" value={field.state.value} onChangeText={field.handleChange} />}
            </form.Field>
            <form.Field name="unit">
              {(field) => (
                <ChoiceButtons
                  options={MEASUREMENT_UNITS}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </>
        ) : (
          <Typography variant="caption" muted>
            Единица: {measurementUnitLabel(measurementUnit(measurementKind, 'CM'))}
          </Typography>
        )}
      </form.Subscribe>
      <form.Field name="value">
        {(field) => <MetricField label="Значение" value={field.state.value} onChangeText={field.handleChange} />}
      </form.Field>
      <form.Field name="approximate">
        {(field) => (
          <Button variant={field.state.value ? 'default' : 'outline'} onPress={() => field.handleChange(!field.state.value)}>
            {field.state.value ? 'Значение приблизительное' : 'Значение измерено пользователем'}
          </Button>
        )}
      </form.Field>
      <EditorActions form={form} isWorking={diary.isWorking} onClose={onClose} />
    </SectionCard>
  );
}

function EditorActions({ form, isWorking, onClose }: { form: { handleSubmit: () => Promise<void> }; isWorking: boolean; onClose: () => void }) {
  return (
    <View style={styles.actionRow}>
      <Button variant="outline" onPress={onClose}>Отмена</Button>
      <Button loading={isWorking} testID={TEST_IDS.diary.saveButton} onPress={() => void form.handleSubmit()}>
        Подтвердить и сохранить
      </Button>
    </View>
  );
}

function DiaryEntryCard({ entry, onEdit, onRemove }: { entry: DiaryEntry; onEdit: () => void; onRemove: () => void }) {
  const summary = entry.kind === 'NUTRITION'
    ? nutritionSummary(entry)
    : entry.kind === 'ACTIVITY'
      ? activitySummary(entry)
      : measurementSummary(entry);
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <Typography variant="body" weight="700">{entryTitle(entry)}</Typography>
        <Typography variant="caption" muted>{formatTime(entry.occurredAt)}</Typography>
      </View>
      {entry.kind === 'MEASUREMENT' ? null : <Typography variant="bodySm">{entry.description}</Typography>}
      <Typography variant="caption" muted>{summary}</Typography>
      <View style={styles.actionRow}>
        <Button size="sm" variant="outline" onPress={onEdit}>Исправить</Button>
        <Button size="sm" variant="destructive" onPress={onRemove}>Удалить</Button>
      </View>
    </View>
  );
}

function TextField({ description, label, ...props }: ComponentProps<typeof Input> & { description?: string; label: string }) {
  return <Field><FieldLabel>{label}</FieldLabel>{description ? <FieldDescription>{description}</FieldDescription> : null}<Input {...props} /></Field>;
}

function MetricField(props: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <TextField {...props} keyboardType="decimal-pad" style={styles.metricInput} />;
}

function parseNutrition(value: { description: string; caloriesKcal: string; proteinGrams: string; fatGrams: string; carbohydrateGrams: string; approximate: boolean }):
  | { ok: true; nutrition: NutritionEntry['nutrition'] }
  | { ok: false; message: string } {
  if (!value.description.trim()) return { ok: false, message: 'Опишите, что вы съели' };
  const calories = parseOptionalNumber(value.caloriesKcal, false);
  const protein = parseOptionalNumber(value.proteinGrams, false);
  const fat = parseOptionalNumber(value.fatGrams, false);
  const carbs = parseOptionalNumber(value.carbohydrateGrams, false);
  if (!calories.ok || !protein.ok || !fat.ok || !carbs.ok) return { ok: false, message: 'Проверьте значения КБЖУ' };
  if ([calories.value, protein.value, fat.value, carbs.value].every((item) => item === undefined)) {
    return { ok: true, nutrition: null };
  }
  return {
    ok: true,
    nutrition: {
      ...(calories.value === undefined ? {} : { caloriesKcal: calories.value }),
      ...(protein.value === undefined ? {} : { proteinGrams: protein.value }),
      ...(fat.value === undefined ? {} : { fatGrams: fat.value }),
      ...(carbs.value === undefined ? {} : { carbohydrateGrams: carbs.value }),
      truthKind: value.approximate ? 'ESTIMATE' : 'FACT',
    },
  };
}

function parseOptionalNumber(value: string, integer: boolean): { ok: boolean; value?: number } {
  if (!value.trim()) return { ok: true };
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number))
    ? { ok: true, value: number }
    : { ok: false };
}

function optionalMetric(value: number | undefined) {
  return value === undefined ? '' : String(value);
}

function nutritionSummary(entry: NutritionEntry) {
  if (!entry.nutrition) return 'КБЖУ не указаны · подтверждено пользователем';
  const n = entry.nutrition;
  const values = [
    n.caloriesKcal === undefined ? null : `${n.caloriesKcal} ккал`,
    n.proteinGrams === undefined ? null : `Б ${n.proteinGrams}`,
    n.fatGrams === undefined ? null : `Ж ${n.fatGrams}`,
    n.carbohydrateGrams === undefined ? null : `У ${n.carbohydrateGrams}`,
  ].filter(Boolean).join(' · ');
  return `${values} · ${n.truthKind === 'ESTIMATE' ? 'приблизительно' : 'значения пользователя'}`;
}

function activitySummary(entry: ActivityEntry) {
  const duration = entry.durationMinutes ? `${entry.durationMinutes} мин` : 'время не указано';
  const expenditure = entry.expenditure
    ? `${entry.expenditure.caloriesKcal} ккал · ${entry.expenditure.truthKind === 'ESTIMATE' ? 'приблизительно' : 'значение пользователя'}`
    : 'расход не оценён';
  return `${duration} · ${expenditure}`;
}

function measurementSummary(entry: MeasurementEntry) {
  return `${entry.value} ${measurementUnitLabel(entry.unit)} · ${entry.truthKind === 'ESTIMATE' ? 'приблизительно' : 'измерено пользователем'}`;
}

function entryTitle(entry: DiaryEntry) {
  if (entry.kind === 'NUTRITION') return 'Еда';
  if (entry.kind === 'ACTIVITY') return 'Активность';
  return entry.measurementKind === 'CUSTOM'
    ? entry.label ?? 'Собственный замер'
    : MEASUREMENT_KINDS.find((item) => item.value === entry.measurementKind)?.label ?? 'Замер';
}

function measurementUnit(kind: BodyMeasurementKind, customUnit: BodyMeasurementUnit): BodyMeasurementUnit {
  if (kind === 'WEIGHT') return 'KG';
  if (kind === 'BODY_FAT') return 'PERCENT';
  if (kind === 'CUSTOM') return customUnit;
  return 'CM';
}

function measurementUnitLabel(unit: BodyMeasurementUnit) {
  return unit === 'KG' ? 'кг' : unit === 'CM' ? 'см' : '%';
}

function ChoiceButtons<T extends string>({ options, value, onChange }: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.actionRow}>
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onPress={() => onChange(option.value)}>
          {option.label}
        </Button>
      ))}
    </View>
  );
}

const MEASUREMENT_KINDS: readonly { label: string; value: BodyMeasurementKind }[] = [
  { label: 'Вес', value: 'WEIGHT' },
  { label: 'Талия', value: 'WAIST' },
  { label: 'Бёдра', value: 'HIPS' },
  { label: 'Грудь', value: 'CHEST' },
  { label: 'Рука', value: 'ARM' },
  { label: 'Бедро', value: 'THIGH' },
  { label: 'Шея', value: 'NECK' },
  { label: 'Процент жира', value: 'BODY_FAT' },
  { label: 'Свой показатель', value: 'CUSTOM' },
];

const MEASUREMENT_UNITS: readonly { label: string; value: BodyMeasurementUnit }[] = [
  { label: 'кг', value: 'KG' },
  { label: 'см', value: 'CM' },
  { label: '%', value: 'PERCENT' },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function confirmRemoval(entry: DiaryEntry, remove: (entry: DiaryEntry) => Promise<boolean>) {
  NativeAlert.alert('Удалить запись?', 'Она сразу исчезнет из дневника и будущих расчётов.', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: () => void remove(entry) },
  ]);
}

const styles = StyleSheet.create({
  action: { flexGrow: 1 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  entry: { gap: 8, paddingVertical: 8 },
  entryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricInput: { minWidth: 120 },
});
