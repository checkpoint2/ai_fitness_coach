import { useForm } from '@tanstack/react-form';
import type {
  OnboardingDraftPatch,
  OnboardingFieldKey,
  OnboardingSnapshot,
} from '@ai-fitness-coach/contracts';
import { Redirect, useRouter, type Href } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataRow, ScreenShell, ScreenState, SectionCard } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUiTheme } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import {
  buildManualOnboardingPatch,
  manualOnboardingValuesFromPatch,
  type ManualOnboardingValues,
} from '../manual-draft';
import { useOnboarding } from '../provider';

export function OnboardingScreen() {
  const onboarding = useOnboarding();
  const [manualStarted, setManualStarted] = useState(false);
  const [editingReview, setEditingReview] = useState(false);

  if (onboarding.isLoading || (!onboarding.snapshot && !onboarding.error)) {
    return <ScreenState status="loading" title="Загружаем вашу настройку" />;
  }
  if (!onboarding.snapshot) {
    return (
      <ScreenShell centered eyebrow="Первый запуск" title="Не удалось загрузить настройку">
        <ScreenState
          action={<Button onPress={() => void onboarding.retry()}>Повторить</Button>}
          description={onboarding.error ?? 'Проверьте соединение и повторите.'}
          status="error"
        />
      </ScreenShell>
    );
  }

  const snapshot = onboarding.snapshot;
  if (snapshot.status === 'COMPLETED') return <Redirect href={'/today' as Href} />;
  if (snapshot.status === 'PLAN_CONFIRMED') return <OpenTodayScreen />;
  if (snapshot.status === 'PAUSED') return <PausedScreen />;
  if (snapshot.status === 'NOT_STARTED' && !manualStarted) {
    return <EntryModeScreen onManualStart={() => setManualStarted(true)} />;
  }
  if (snapshot.status === 'NOT_STARTED' || snapshot.status === 'COLLECTING' || editingReview) {
    return (
      <ManualFormScreen
        key={`${snapshot.revision}-${editingReview ? 'editing' : 'collecting'}`}
        snapshot={snapshot}
        onSaved={() => setEditingReview(false)}
      />
    );
  }
  if (snapshot.status === 'REVIEW_REQUIRED') {
    return <ReviewScreen snapshot={snapshot} onEdit={() => setEditingReview(true)} />;
  }
  if (snapshot.status === 'PROFILE_CONFIRMED') return <PreparePlanScreen snapshot={snapshot} />;
  if (snapshot.status === 'PLAN_DRAFT_READY') return <PlanReviewScreen snapshot={snapshot} />;

  return (
    <ScreenShell centered eyebrow="Первый запуск" title="Состояние требует обновления">
      <Button onPress={() => void onboarding.reload()}>Обновить</Button>
    </ScreenShell>
  );
}

function EntryModeScreen({ onManualStart }: { onManualStart: () => void }) {
  return (
    <ScreenShell
      description="Выберите удобный способ. Все важные данные можно проверить до сохранения."
      eyebrow="Первый запуск · шаг 1 из 3"
      testID={TEST_IDS.onboarding.screen}
      title="Давайте познакомимся">
      <SectionCard title="Как хотите начать?">
        <Button disabled variant="outline">Рассказать текстом</Button>
        <Typography variant="caption" muted>Появится после подключения проверенного AI-контура.</Typography>
        <Button disabled variant="outline">Рассказать голосом</Button>
        <Typography variant="caption" muted>Исходное аудио храниться не будет.</Typography>
        <Button onPress={onManualStart} testID={TEST_IDS.onboarding.manualStartButton}>
          Заполнить по шагам
        </Button>
      </SectionCard>
    </ScreenShell>
  );
}

function ManualFormScreen({
  snapshot,
  onSaved,
}: {
  snapshot: OnboardingSnapshot;
  onSaved: () => void;
}) {
  const onboarding = useOnboarding();
  const theme = useUiTheme();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
  const form = useForm({
    defaultValues: manualOnboardingValuesFromPatch(snapshot.patch, timezone),
    onSubmit: async ({ value }) => {
      const result = buildManualOnboardingPatch(value);
      if (!result.ok) {
        setValidationErrors(result.errors);
        return;
      }
      setValidationErrors([]);
      await onboarding.saveStructuredDraft(result.patch);
      onSaved();
    },
  });

  return (
    <ScreenShell
      description="Заполняйте только то, что знаете. Год рождения и расчётный параметр можно не указывать."
      eyebrow="Первый запуск · профиль"
      keyboardAware
      testID={TEST_IDS.onboarding.screen}
      title="Настроим основу">
      <OperationNotice />
      {validationErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Нужно уточнить несколько пунктов</AlertTitle>
          <AlertDescription>{validationErrors.join('\n')}</AlertDescription>
        </Alert>
      ) : null}

      <SectionCard title="О вас">
        <form.Field name="adultConfirmed">
          {(field) => (
            <ChoiceField
              label="Вам уже исполнилось 18 лет?"
              value={field.state.value ? 'YES' : ''}
              onChange={(value) => field.handleChange(value === 'YES')}
              options={[{ label: 'Да, мне 18+', testID: TEST_IDS.onboarding.adultConfirmedButton, value: 'YES' }]}
            />
          )}
        </form.Field>
        <form.Field name="birthYearAnswer">
          {(field) => (
            <ChoiceField
              label="Год рождения"
              description="Можно продолжить без него — мы не будем угадывать."
              value={field.state.value}
              onChange={field.handleChange}
              options={[
                { label: 'Указать', value: 'VALUE' },
                { label: 'Не указывать', testID: TEST_IDS.onboarding.birthYearDeclinedButton, value: 'DECLINED' },
              ]}
            />
          )}
        </form.Field>
        <form.Field name="birthYear">
          {(field) => (
            <TextField
              label="Если выбрали «Указать»"
              keyboardType="number-pad"
              placeholder="Например, 1990"
              value={field.state.value}
              onChangeText={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="calculationSexAnswer">
          {(field) => (
            <ChoiceField
              label="Параметр для будущих расчётов"
              description="Это не вывод AI. Точная формула пока не выбрана."
              value={field.state.value}
              onChange={field.handleChange}
              options={[
                { label: 'Мужской', value: 'MALE' },
                { label: 'Женский', value: 'FEMALE' },
                { label: 'Не выбирать', testID: TEST_IDS.onboarding.calculationSexDeclinedButton, value: 'DECLINED' },
              ]}
            />
          )}
        </form.Field>
        <View style={[styles.twoColumns, { gap: theme.spacing.md }]}>
          <form.Field name="heightCm">
            {(field) => (
              <TextField
                label="Рост, см"
                keyboardType="decimal-pad"
                placeholder="180"
                testID={TEST_IDS.onboarding.heightInput}
                value={field.state.value}
                onChangeText={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="currentWeightKg">
            {(field) => (
              <TextField
                label="Текущий вес, кг"
                keyboardType="decimal-pad"
                placeholder="82,5"
                testID={TEST_IDS.onboarding.weightInput}
                value={field.state.value}
                onChangeText={field.handleChange}
              />
            )}
          </form.Field>
        </View>
        <form.Field name="timezone">
          {(field) => (
            <TextField
              label="Часовой пояс"
              description="Определяет границы вашего дня. Проверьте предложенное значение."
              value={field.state.value}
              onChangeText={field.handleChange}
            />
          )}
        </form.Field>
      </SectionCard>

      <SectionCard title="Цель">
        <form.Field name="bodyGoal">
          {(field) => (
            <ChoiceField
              label="Цель по телу"
              value={field.state.value}
              onChange={field.handleChange}
              options={BODY_GOAL_OPTIONS.map((option) => option.value === 'RECOMPOSITION'
                ? { ...option, testID: TEST_IDS.onboarding.recompositionButton }
                : option)}
            />
          )}
        </form.Field>
        <form.Field name="trainingGoal">
          {(field) => (
            <ChoiceField
              label="Тренировочная цель"
              value={field.state.value}
              onChange={field.handleChange}
              options={TRAINING_GOAL_OPTIONS.map((option) => option.value === 'STRENGTH'
                ? { ...option, testID: TEST_IDS.onboarding.strengthButton }
                : option)}
            />
          )}
        </form.Field>
      </SectionCard>

      <SectionCard title="Тренировки">
        <form.Field name="trainingExperience">
          {(field) => (
            <TextField
              label="Ваш опыт"
              placeholder="Например: начинаю с нуля или тренируюсь около года"
              testID={TEST_IDS.onboarding.experienceInput}
              value={field.state.value}
              onChangeText={field.handleChange}
            />
          )}
        </form.Field>
        <Typography variant="bodySm" weight="700">Где планируете тренироваться?</Typography>
        <View style={[styles.choiceRow, { gap: theme.spacing.sm }]}>
          <form.Field name="trainingAtHome">
            {(field) => <ToggleButton label="Дома" selected={field.state.value} onPress={() => field.handleChange(!field.state.value)} testID={TEST_IDS.onboarding.homeButton} />}
          </form.Field>
          <form.Field name="trainingAtGym">
            {(field) => <ToggleButton label="В зале" selected={field.state.value} onPress={() => field.handleChange(!field.state.value)} />}
          </form.Field>
          <form.Field name="trainingOutdoors">
            {(field) => <ToggleButton label="На улице" selected={field.state.value} onPress={() => field.handleChange(!field.state.value)} />}
          </form.Field>
        </View>
        <form.Field name="equipment">
          {(field) => (
            <TextField
              label="Доступный инвентарь"
              description="Через запятую. Если ничего нет, напишите «без инвентаря»."
              placeholder="Гантели, резинки"
              testID={TEST_IDS.onboarding.equipmentInput}
              value={field.state.value}
              onChangeText={field.handleChange}
            />
          )}
        </form.Field>
        <View style={[styles.twoColumns, { gap: theme.spacing.md }]}>
          <form.Field name="trainingDaysPerWeek">
            {(field) => <TextField label="Дней в неделю" keyboardType="number-pad" placeholder="3" testID={TEST_IDS.onboarding.trainingDaysInput} value={field.state.value} onChangeText={field.handleChange} />}
          </form.Field>
          <form.Field name="workoutDurationMinutes">
            {(field) => <TextField label="Минут за тренировку" keyboardType="number-pad" placeholder="60" testID={TEST_IDS.onboarding.workoutDurationInput} value={field.state.value} onChangeText={field.handleChange} />}
          </form.Field>
        </View>
      </SectionCard>

      <SectionCard title="Активность и питание">
        <form.Field name="ordinaryDayDescription">
          {(field) => (
            <TextField
              label="Обычный день и работа"
              description="Например: в основном сижу, но вечером гуляю."
              placeholder="Коротко опишите ваш обычный день"
              testID={TEST_IDS.onboarding.ordinaryDayInput}
              value={field.state.value}
              onChangeText={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="allergiesAnswer">
          {(field) => (
            <ChoiceField
              label="Аллергии и обязательные исключения"
              value={field.state.value}
              onChange={field.handleChange}
              options={[
                { label: 'Нет', testID: TEST_IDS.onboarding.allergiesNoneButton, value: 'NONE' },
                { label: 'Не уверен(а)', value: 'UNSURE' },
                { label: 'Есть', value: 'VALUE' },
              ]}
            />
          )}
        </form.Field>
        <form.Field name="allergiesText">
          {(field) => <TextField label="Если есть — перечислите" value={field.state.value} onChangeText={field.handleChange} />}
        </form.Field>
        <form.Field name="nutritionTrackingMode">
          {(field) => (
            <ChoiceField
              label="Как удобнее учитывать питание?"
              value={field.state.value}
              onChange={field.handleChange}
              options={NUTRITION_OPTIONS.map((option) => option.value === 'HYBRID'
                ? { ...option, testID: TEST_IDS.onboarding.nutritionHybridButton }
                : option)}
            />
          )}
        </form.Field>
      </SectionCard>

      <SectionCard
        description="Это не медицинский допуск. Ответ не определяет диагноз или допустимую нагрузку."
        title="Ограничения">
        <form.Field name="currentPainOrInjury">
          {(field) => <SafetyField label="Сейчас есть боль или травма?" noTestID={TEST_IDS.onboarding.currentPainNoButton} value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="doctorRestriction">
          {(field) => <SafetyField label="Есть ограничение врача?" noTestID={TEST_IDS.onboarding.doctorRestrictionNoButton} value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="ordinaryFitnessSuitabilityDoubt">
          {(field) => <SafetyField label="Сомневаетесь, подходит ли обычная фитнес-программа?" noTestID={TEST_IDS.onboarding.ordinaryFitnessDoubtNoButton} value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="supervisedNutritionOrActivityOnly">
          {(field) => <SafetyField label="Рекомендовано менять питание или нагрузку только с сопровождением?" noTestID={TEST_IDS.onboarding.supervisedOnlyNoButton} value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
      </SectionCard>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            loading={isSubmitting || onboarding.isWorking}
            onPress={() => void form.handleSubmit()}
            testID={TEST_IDS.onboarding.saveDraftButton}>
            Проверить данные
          </Button>
        )}
      </form.Subscribe>
      {snapshot.status !== 'NOT_STARTED' ? (
        <Button variant="ghost" disabled={onboarding.isWorking} onPress={() => void onboarding.pause()}>
          Сохранить паузу
        </Button>
      ) : null}
    </ScreenShell>
  );
}

function ReviewScreen({ snapshot, onEdit }: { snapshot: OnboardingSnapshot; onEdit: () => void }) {
  const onboarding = useOnboarding();
  const keys = draftKeys(snapshot.patch);

  return (
    <ScreenShell
      description="Ничего не станет постоянным фактом, пока вы не подтвердите весь черновик."
      eyebrow="Первый запуск · проверка"
      testID={TEST_IDS.onboarding.reviewScreen}
      title="Всё верно?">
      <OperationNotice />
      {snapshot.readiness.reasonCodes.includes('CALCULATION_INPUT_INCOMPLETE') ? (
        <Alert>
          <AlertTitle>Расчёты будут ограничены</AlertTitle>
          <AlertDescription>Без года рождения или расчётного параметра мы не покажем ложную точность.</AlertDescription>
        </Alert>
      ) : null}
      <SectionCard title="Подтверждаемые сведения">
        {keys.map((key) => (
          <DataRow key={key} label={FIELD_LABELS[key] ?? key} value={formatDraftValue(snapshot.patch[key])} />
        ))}
      </SectionCard>
      <Button variant="outline" onPress={onEdit}>Исправить</Button>
      <Button
        disabled={snapshot.readiness.profile !== 'READY'}
        loading={onboarding.isWorking}
        onPress={() => void onboarding.confirmProfile(keys)}
        testID={TEST_IDS.onboarding.confirmProfileButton}>
        Подтвердить и сохранить профиль
      </Button>
      <Typography variant="caption" muted>
        Свободный исходный рассказ не использовался. Backend сохранит только структурированные значения.
      </Typography>
    </ScreenShell>
  );
}

function PreparePlanScreen({ snapshot }: { snapshot: OnboardingSnapshot }) {
  const onboarding = useOnboarding();
  return (
    <ScreenShell
      description="Профиль сохранён. Теперь backend подготовит ограниченную стартовую стратегию без неподтверждённых калорий и упражнений."
      eyebrow="Первый запуск · шаг 2 из 3"
      title="Подготовим первый план">
      <OperationNotice />
      <SafetyNotice snapshot={snapshot} />
      <Button loading={onboarding.isWorking} onPress={() => void onboarding.createPlanDraft()}>
        Подготовить стратегию
      </Button>
    </ScreenShell>
  );
}

function PlanReviewScreen({ snapshot }: { snapshot: OnboardingSnapshot }) {
  const onboarding = useOnboarding();
  const plan = snapshot.plan;
  if (!plan) return <ScreenState status="error" title="Черновик плана не найден" />;

  return (
    <ScreenShell
      description="Это организационная основа на четыре недели, а не обещание результата или медицинская рекомендация."
      eyebrow="Первый запуск · шаг 3 из 3"
      testID={TEST_IDS.onboarding.planReviewScreen}
      title="Стартовая стратегия">
      <OperationNotice />
      <SafetyNotice snapshot={snapshot} />
      <SectionCard title={`Версия ${plan.version}`}>
        {planSummary(plan.payload).map((row) => <DataRow key={row.label} {...row} />)}
      </SectionCard>
      <SectionCard title="Честные ограничения">
        {plan.limitations.map((limitation) => (
          <Typography key={limitation} variant="bodySm">• {LIMITATION_LABELS[limitation] ?? limitation}</Typography>
        ))}
      </SectionCard>
      <Button
        loading={onboarding.isWorking}
        onPress={() => void onboarding.confirmPlan()}
        testID={TEST_IDS.onboarding.confirmPlanButton}>
        Подтвердить этот план
      </Button>
    </ScreenShell>
  );
}

function OpenTodayScreen() {
  const router = useRouter();
  return (
    <ScreenShell centered eyebrow="План подтверждён" title="Всё готово — идём в сегодняшний день">
      <Typography align="center" variant="bodySm" muted>
        Onboarding завершится только после успешного открытия экрана «Сегодня».
      </Typography>
      <Button onPress={() => router.replace('/today')}>Открыть «Сегодня»</Button>
    </ScreenShell>
  );
}

function PausedScreen() {
  const onboarding = useOnboarding();
  return (
    <ScreenShell centered eyebrow="Первый запуск" title="Продолжим с сохранённого места">
      <OperationNotice />
      <Button loading={onboarding.isWorking} onPress={() => void onboarding.resume()}>
        Продолжить
      </Button>
    </ScreenShell>
  );
}

function OperationNotice() {
  const onboarding = useOnboarding();
  if (!onboarding.error && !onboarding.pendingLabel) return null;
  if (onboarding.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Данные не отмечены сохранёнными</AlertTitle>
        <AlertDescription>{onboarding.error}</AlertDescription>
        <Button variant="outline" onPress={() => void onboarding.retry()}>Повторить тот же запрос</Button>
      </Alert>
    );
  }
  return <Alert><AlertTitle>{onboarding.pendingLabel}</AlertTitle></Alert>;
}

function SafetyNotice({ snapshot }: { snapshot: OnboardingSnapshot }) {
  if (snapshot.safetyBlocks.length === 0) return null;
  return (
    <Alert>
      <AlertTitle>Часть автоматического плана ограничена</AlertTitle>
      <AlertDescription>
        Профиль сохранён, но приложение не определяет допустимую нагрузку или питание по анкете. Обратитесь к подходящему специалисту.
      </AlertDescription>
    </Alert>
  );
}

function TextField({
  description,
  label,
  ...props
}: ComponentProps<typeof Input> & { description?: string; label: string }) {
  return (
    <Field style={styles.fieldGrow}>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input {...props} />
    </Field>
  );
}

function ChoiceField<T extends string>({
  description,
  label,
  onChange,
  options,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; testID?: string; value: T }[];
  value: string;
}) {
  const theme = useUiTheme();
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <View style={[styles.choiceRow, { gap: theme.spacing.sm }]}>
        {options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            testID={option.testID}
            variant={value === option.value ? 'default' : 'outline'}
            onPress={() => onChange(option.value)}>
            {option.label}
          </Button>
        ))}
      </View>
    </Field>
  );
}

function SafetyField({
  label,
  noTestID,
  onChange,
  value,
}: {
  label: string;
  noTestID: string;
  onChange: (value: ManualOnboardingValues['currentPainOrInjury']) => void;
  value: string;
}) {
  return (
    <ChoiceField
      label={label}
      value={value}
      onChange={onChange}
      options={SAFETY_OPTIONS.map((option) => option.value === 'NO'
        ? { ...option, testID: noTestID }
        : option)}
    />
  );
}

function ToggleButton({ label, onPress, selected, testID }: { label: string; onPress: () => void; selected: boolean; testID?: string }) {
  return <Button size="sm" testID={testID} variant={selected ? 'default' : 'outline'} onPress={onPress}>{label}</Button>;
}

function draftKeys(patch: OnboardingDraftPatch) {
  return Object.entries(patch)
    .filter(([, field]) => field?.state === 'DRAFT')
    .map(([key]) => key as OnboardingFieldKey);
}

function formatDraftValue(field: OnboardingDraftPatch[OnboardingFieldKey]) {
  if (!field || field.state !== 'DRAFT') return 'Не указано';
  const value = field.value;
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (Array.isArray(value)) return value.join(', ') || 'Без инвентаря';
  if (value && typeof value === 'object' && 'kind' in value) {
    if (value.kind === 'DECLINED') return 'Не указано по выбору пользователя';
    if (value.kind === 'NONE') return 'Нет';
    if (value.kind === 'UNSURE') return 'Не уверен(а)';
    if ('year' in value) return String(value.year);
    if ('value' in value) return calculationSexLabel(String(value.value));
    if ('text' in value) return String(value.text);
  }
  return ENUM_LABELS[String(value)] ?? String(value);
}

function calculationSexLabel(value: string) {
  return value === 'MALE' ? 'Мужской' : value === 'FEMALE' ? 'Женский' : value;
}

function planSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return [{ label: 'Содержание', value: 'Ограниченный черновик' }];
  const value = payload as {
    goal?: { body?: unknown; training?: unknown };
    trainingContext?: { daysPerWeek?: unknown; durationMinutes?: unknown; locations?: unknown };
    nutritionContext?: { trackingMode?: unknown };
  };
  return [
    { label: 'Цель по телу', value: ENUM_LABELS[String(value.goal?.body)] ?? String(value.goal?.body ?? '—') },
    { label: 'Тренировочная цель', value: ENUM_LABELS[String(value.goal?.training)] ?? String(value.goal?.training ?? '—') },
    { label: 'Тренировок в неделю', value: String(value.trainingContext?.daysPerWeek ?? '—') },
    { label: 'Длительность', value: `${String(value.trainingContext?.durationMinutes ?? '—')} мин` },
    { label: 'Учёт питания', value: ENUM_LABELS[String(value.nutritionContext?.trackingMode)] ?? String(value.nutritionContext?.trackingMode ?? '—') },
  ];
}

const BODY_GOAL_OPTIONS = [
  { label: 'Снизить вес/жир', value: 'FAT_LOSS' },
  { label: 'Набрать мышцы', value: 'MUSCLE_GAIN' },
  { label: 'Рекомпозиция', value: 'RECOMPOSITION' },
  { label: 'Поддерживать форму', value: 'MAINTENANCE' },
] as const;
const TRAINING_GOAL_OPTIONS = [
  { label: 'Общая форма', value: 'GENERAL_FITNESS' },
  { label: 'Сила', value: 'STRENGTH' },
  { label: 'Выносливость', value: 'ENDURANCE' },
  { label: 'Подвижность/восстановление', value: 'MOBILITY_RECOVERY' },
] as const;
const NUTRITION_OPTIONS = [
  { label: 'Свободное описание', value: 'FREE_TEXT' },
  { label: 'Точный учёт', value: 'PRECISE' },
  { label: 'Сочетание', value: 'HYBRID' },
] as const;
const SAFETY_OPTIONS = [
  { label: 'Нет', value: 'NO' },
  { label: 'Да', value: 'YES' },
  { label: 'Не уверен(а)', value: 'UNSURE' },
  { label: 'Не отвечать', value: 'DECLINED' },
] as const;
const FIELD_LABELS: Partial<Record<OnboardingFieldKey, string>> = {
  adultConfirmed: 'Возраст 18+',
  birthYear: 'Год рождения',
  calculationSex: 'Параметр для расчётов',
  heightCm: 'Рост, см',
  currentWeightKg: 'Текущий вес, кг',
  timezone: 'Часовой пояс',
  bodyGoal: 'Цель по телу',
  trainingGoal: 'Тренировочная цель',
  trainingExperience: 'Опыт тренировок',
  trainingLocations: 'Место тренировок',
  equipment: 'Инвентарь',
  trainingDaysPerWeek: 'Тренировочных дней',
  workoutDurationMinutes: 'Длительность тренировки, мин',
  ordinaryDayDescription: 'Обычный день и работа',
  allergiesAndExclusions: 'Аллергии и исключения',
  nutritionTrackingMode: 'Учёт питания',
  currentPainOrInjury: 'Боль или травма',
  doctorRestriction: 'Ограничение врача',
  ordinaryFitnessSuitabilityDoubt: 'Сомнение в обычной программе',
  supervisedNutritionOrActivityOnly: 'Только с сопровождением',
};
const ENUM_LABELS: Record<string, string> = {
  FAT_LOSS: 'Снижение веса/жира',
  MUSCLE_GAIN: 'Набор мышечной массы',
  RECOMPOSITION: 'Рекомпозиция',
  MAINTENANCE: 'Поддержание формы',
  GENERAL_FITNESS: 'Общая форма',
  STRENGTH: 'Сила',
  ENDURANCE: 'Выносливость',
  MOBILITY_RECOVERY: 'Подвижность/восстановление',
  HOME: 'Дома',
  GYM: 'В зале',
  OUTDOORS: 'На улице',
  FREE_TEXT: 'Свободное описание',
  PRECISE: 'Точный учёт',
  HYBRID: 'Сочетание',
  NO: 'Нет',
  YES: 'Да',
  UNSURE: 'Не уверен(а)',
  DECLINED: 'Не отвечать',
};
const LIMITATION_LABELS: Record<string, string> = {
  ENERGY_TARGET_PENDING_EVIDENCE_REVIEW: 'Точный энергетический ориентир появится только после evidence-review.',
  TRAINING_CONTENT_PENDING_EVIDENCE_REVIEW: 'Конкретные упражнения и нагрузка пока не назначаются.',
  CALCULATION_INPUT_INCOMPLETE: 'Расчётные данные неполные — ложная точность не используется.',
  TRAINING_SAFETY_REVIEW_REQUIRED: 'Автоматическая тренировочная часть заблокирована safety-контекстом.',
  NUTRITION_SAFETY_REVIEW_REQUIRED: 'Автоматическая часть питания заблокирована safety-контекстом.',
};

const styles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldGrow: { flex: 1, minWidth: 0 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
});
