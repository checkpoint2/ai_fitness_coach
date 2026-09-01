import type { CalendarSelection } from '@/components/ui/calendar-utils';
import type { DiaryEntry } from '@ai-fitness-coach/contracts';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataRow, ScreenShell, ScreenState, SectionCard } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { useUiTheme } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import { useDiaryMonth } from '@/features/diary';
import { ProfileButton } from '@/features/pilot-shell';
import { useTrainingMonth } from '@/features/training';
import {
  calendarDayStatus,
  diaryEntryLocalDate,
  localDateKey,
  summarizeProgressDay,
} from '../day-summary';

export function ProgressScreen() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const diary = useDiaryMonth(visibleMonth);
  const training = useTrainingMonth(visibleMonth);
  const theme = useUiTheme();
  const selectedKey = localDateKey(selectedDate);
  const confirmedDays = useMemo(
    () => new Set(diary.confirmations.map((confirmation) => confirmation.localDate)),
    [diary.confirmations],
  );
  const selectedEntries = diary.entries.filter(
    (entry) => diaryEntryLocalDate(entry) === selectedKey,
  );
  const confirmation = diary.confirmations.find(
    (item) => item.localDate === selectedKey,
  ) ?? null;
  const summary = summarizeProgressDay(selectedEntries, confirmation);
  const selectedWorkouts = training.sessions.filter(
    (session) => localDateKey(new Date(session.occurredAt)) === selectedKey,
  );
  const isLoading = diary.isLoading || training.isLoading;
  const loadError = diary.error ?? training.error;
  const reload = async () => {
    await Promise.all([diary.reload(), training.reload()]);
  };

  const selectToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const selectDay = (selection: CalendarSelection) => {
    if (selection instanceof Date) setSelectedDate(selection);
  };

  const changeMonth = (month: Date) => {
    setVisibleMonth(month);
    const isCurrentMonth =
      month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
    setSelectedDate(isCurrentMonth ? today : new Date(month.getFullYear(), month.getMonth(), 1));
  };

  return (
    <ScreenShell
      actions={<ProfileButton />}
      description="История подтверждённых данных без догадок о результате дня."
      eyebrow="AI Fitness Coach"
      testID={TEST_IDS.progress.screen}
      title="Прогресс">
      <SectionCard
        action={<Button size="sm" variant="outline" onPress={selectToday}>Сегодня</Button>}
        description="Заполненный день отмечен нейтрально. Зелёный, жёлтый и красный появятся только после утверждения расчёта цели и расхода."
        testID={TEST_IDS.progress.energyCalendar}
        title="Календарь дней">
        {isLoading ? (
          <ScreenState status="loading" title="Загружаем календарь" />
        ) : loadError ? (
          <ScreenState
            action={<Button variant="outline" onPress={() => void reload()}>Повторить</Button>}
            description={loadError}
            status="error"
            title="Не удалось загрузить историю"
          />
        ) : (
          <View style={[styles.calendarWrap, { gap: theme.spacing.md }]}>
            <Calendar
              disabled={(date) => calendarDayStatus(date, today, false) === 'FUTURE'}
              highlighted={(date) => confirmedDays.has(localDateKey(date))}
              month={visibleMonth}
              onMonthChange={changeMonth}
              onSelect={selectDay}
              selected={selectedDate}
              showOutsideDays={false}
            />
            <View style={[styles.legend, { gap: theme.spacing.sm }]}>
              <LegendMark filled label="Данные за день подтверждены" />
              <LegendMark label="День не подтверждён" />
            </View>
          </View>
        )}
      </SectionCard>

      {!isLoading && !loadError ? (
        <SectionCard
          description={confirmation
            ? 'Питание и активность отмечены пользователем как внесённые полностью.'
            : 'Отсутствие записей или подтверждения не считается нулевым потреблением и расходом.'}
          testID={TEST_IDS.progress.daySummary}
          title={formatSelectedDate(selectedDate)}>
          {selectedEntries.length === 0 && selectedWorkouts.length === 0 ? (
            <ScreenState
              description={confirmation
                ? 'День подтверждён без отдельных записей. Энергетический результат пока не рассчитывается.'
                : 'За эту дату нет подтверждённых записей.'}
              status="empty"
              title={confirmation ? 'Записей нет' : 'Данных пока нет'}
            />
          ) : (
            <>
              <DataRow
                label={`Питание · ${summary.nutritionCount}`}
                value={summary.nutritionCount === 0
                  ? 'нет записей'
                  : formatCalories(summary.recordedIntakeCaloriesKcal, summary.nutritionWithoutCalories)}
              />
              <DataRow
                label={`Активность · ${summary.activityCount}`}
                value={summary.activityCount === 0
                  ? 'нет записей'
                  : formatActivity(summary.activityDurationMinutes, summary.activityWithoutDuration)}
              />
              {summary.activityCount > 0 ? (
                <DataRow
                  label="Записанный расход активности"
                  value={formatCalories(summary.recordedActivityCaloriesKcal, summary.activityWithoutCalories)}
                />
              ) : null}
              <DataRow label="Замеры" value={String(summary.measurementCount)} />
              <DataRow label="Тренировки" value={String(selectedWorkouts.length)} />
              <DataRow
                label="Полнота дня"
                value={summary.confirmedComplete ? 'Подтверждена' : 'Не подтверждена'}
              />
              <Separator />
              <EntryList entries={selectedEntries} />
              {selectedWorkouts.map((workout) => (
                <View key={workout.id} style={styles.entry}>
                  <Typography variant="bodySm" weight="700">Тренировка</Typography>
                  <Typography variant="bodySm" muted>
                    {workout.title} · {workout.exercises.length} упр. · {workout.durationMinutes ? `${workout.durationMinutes} мин` : 'без длительности'}
                  </Typography>
                </View>
              ))}
              {summary.estimatedMetricCount > 0 ? (
                <Typography variant="caption" muted>
                  Приблизительных показателей: {summary.estimatedMetricCount}. Они отделены от фактов и не превращаются в точные значения.
                </Typography>
              ) : null}
            </>
          )}
        </SectionCard>
      ) : null}
    </ScreenShell>
  );
}

function EntryList({ entries }: { entries: DiaryEntry[] }) {
  return (
    <View style={styles.entries}>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Typography variant="bodySm" weight="700">
            {entry.kind === 'NUTRITION'
              ? 'Еда'
              : entry.kind === 'ACTIVITY'
                ? 'Активность'
                : measurementLabel(entry.measurementKind, entry.label)}
          </Typography>
          <Typography variant="bodySm" muted>
            {entry.kind === 'MEASUREMENT'
              ? `${formatNumber(entry.value)} ${measurementUnit(entry.unit)}`
              : entry.description}
          </Typography>
        </View>
      ))}
    </View>
  );
}

function LegendMark({ filled = false, label }: { filled?: boolean; label: string }) {
  const theme = useUiTheme();
  return (
    <View style={[styles.legendItem, { gap: theme.spacing.xs }]}>
      <View
        style={[
          styles.legendMark,
          {
            backgroundColor: filled ? theme.colors.muted : theme.colors.transparent,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.full,
          },
        ]}
      />
      <Typography variant="caption" muted>{label}</Typography>
    </View>
  );
}

function formatSelectedDate(date: Date) {
  const value = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCalories(value: number, incomplete: boolean) {
  if (value === 0) return incomplete ? 'не указано' : '0 ккал';
  return `${formatNumber(value)} ккал${incomplete ? '+' : ''}`;
}

function formatActivity(minutes: number, incomplete: boolean) {
  if (minutes === 0) return incomplete ? 'время не указано' : '0 мин';
  return `${formatNumber(minutes)} мин${incomplete ? '+' : ''}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
}

function measurementUnit(unit: 'KG' | 'CM' | 'PERCENT') {
  return unit === 'KG' ? 'кг' : unit === 'CM' ? 'см' : '%';
}

function measurementLabel(kind: string, customLabel: string | null) {
  const labels: Record<string, string> = {
    WEIGHT: 'Вес',
    WAIST: 'Талия',
    HIPS: 'Бёдра',
    CHEST: 'Грудь',
    ARM: 'Рука',
    THIGH: 'Бедро',
    NECK: 'Шея',
    BODY_FAT: 'Процент жира',
  };
  return kind === 'CUSTOM' ? customLabel ?? 'Замер' : labels[kind] ?? 'Замер';
}

const styles = StyleSheet.create({
  calendarWrap: {
    alignItems: 'center',
  },
  entries: {
    gap: 12,
  },
  entry: {
    gap: 2,
  },
  legend: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  legendMark: {
    borderWidth: 1,
    height: 14,
    width: 14,
  },
});
