import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityEntry,
  ConfirmDiaryDayRequest,
  CreateActivityEntryRequest,
  CreateNutritionEntryRequest,
  CreateMeasurementEntryRequest,
  DiaryEntriesResponse,
  DiaryEntry,
  DiaryDayConfirmation,
  DiaryDayConfirmationsResponse,
  NutritionEntry,
  MeasurementEntry,
  UpdateActivityEntryRequest,
  UpdateNutritionEntryRequest,
  UpdateMeasurementEntryRequest,
} from '@ai-fitness-coach/contracts';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useAuth, type AuthAccountScope } from '@/features/auth';
import { ApiRequestError } from '@/platform/api';
import type { DiaryApiPort } from './api';

type DiaryContextValue = {
  entries: DiaryEntry[];
  dayConfirmation: DiaryDayConfirmation | null;
  error: string | null;
  isLoading: boolean;
  isWorking: boolean;
  reload: () => Promise<void>;
  createNutrition: (request: CreateNutritionEntryRequest) => Promise<boolean>;
  createActivity: (request: CreateActivityEntryRequest) => Promise<boolean>;
  createMeasurement: (request: CreateMeasurementEntryRequest) => Promise<boolean>;
  updateNutrition: (entryId: string, request: UpdateNutritionEntryRequest) => Promise<boolean>;
  updateActivity: (entryId: string, request: UpdateActivityEntryRequest) => Promise<boolean>;
  updateMeasurement: (entryId: string, request: UpdateMeasurementEntryRequest) => Promise<boolean>;
  remove: (entry: DiaryEntry) => Promise<boolean>;
  confirmDay: (request: ConfirmDiaryDayRequest) => Promise<boolean>;
  removeDayConfirmation: () => Promise<boolean>;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);
const DiaryApiContext = createContext<DiaryApiPort | null>(null);
const diaryQueryKey = (userId: string, from: string, to: string) =>
  ['diary', 'timeline', userId, from, to] as const;
const dayConfirmationQueryKey = (userId: string, localDate: string) =>
  ['diary', 'day-confirmation', userId, localDate] as const;

export function DiaryProvider({
  api,
  children,
}: PropsWithChildren<{ api: DiaryApiPort }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.user?.id ?? null;
  const range = currentLocalDayRange();
  const localDay = currentLocalDay();
  const queryKey = diaryQueryKey(userId ?? '', range.from, range.to);
  const confirmationQueryKey = dayConfirmationQueryKey(userId ?? '', localDay.localDate);
  const [operationError, setOperationError] = useState<{
    message: string;
    scope: AuthAccountScope;
  } | null>(null);
  const [workingScope, setWorkingScope] = useState<AuthAccountScope | null>(null);
  const query = useQuery({
    enabled: Boolean(userId),
    queryKey,
    queryFn: () => api.list(range),
  });
  const confirmationQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: confirmationQueryKey,
    queryFn: () => api.listDayConfirmations({
      fromDate: localDay.localDate,
      toDate: localDay.localDate,
    }),
  });

  const ownsCurrentScope = useCallback(
    (scope: AuthAccountScope | null | undefined) =>
      Boolean(
        scope &&
          auth.accountScope &&
          scope.generation === auth.accountScope.generation &&
          scope.userId === auth.accountScope.userId,
      ),
    [auth.accountScope],
  );

  const execute = useCallback(
    async (operation: () => Promise<DiaryEntriesResponse>): Promise<boolean> => {
      const scope = auth.accountScope;
      if (!scope) return false;
      setWorkingScope(scope);
      setOperationError(null);
      try {
        const result = await operation();
        if (!auth.isAccountScopeCurrent(scope)) return false;
        queryClient.setQueryData(
          diaryQueryKey(scope.userId, range.from, range.to),
          result,
        );
        void queryClient.invalidateQueries({
          queryKey: ['diary'],
          refetchType: 'inactive',
        });
        return true;
      } catch (error) {
        if (!auth.isAccountScopeCurrent(scope)) return false;
        setOperationError({ message: diaryErrorMessage(error), scope });
        if (error instanceof ApiRequestError && error.status === 409) {
          await queryClient.invalidateQueries({
            queryKey: diaryQueryKey(scope.userId, range.from, range.to),
          });
        }
        return false;
      } finally {
        if (auth.isAccountScopeCurrent(scope)) setWorkingScope(null);
      }
    },
    [auth, queryClient, range.from, range.to],
  );

  const updateTimeline = useCallback(
    (entry: DiaryEntry, existingId?: string): DiaryEntriesResponse => {
      const current = queryClient.getQueryData<DiaryEntriesResponse>(queryKey)?.entries ?? [];
      return {
        entries: [entry, ...current.filter((item) => item.id !== (existingId ?? entry.id))].sort(
          (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
        ),
      };
    },
    [queryClient, queryKey],
  );

  const value = useMemo<DiaryContextValue>(() => ({
    entries: query.data?.entries ?? [],
    dayConfirmation: confirmationQuery.data?.confirmations[0] ?? null,
    error: ownsCurrentScope(operationError?.scope)
      ? operationError?.message ?? null
      : query.error ?? confirmationQuery.error
        ? diaryErrorMessage(query.error ?? confirmationQuery.error)
        : null,
    isLoading: Boolean(userId) && (query.isPending || confirmationQuery.isPending),
    isWorking: ownsCurrentScope(workingScope),
    reload: async () => {
      setOperationError(null);
      await Promise.all([query.refetch(), confirmationQuery.refetch()]);
    },
    createNutrition: (request) => execute(async () => {
      const response = await api.createNutrition(request);
      return updateTimeline(response.entry);
    }),
    createActivity: (request) => execute(async () => {
      const response = await api.createActivity(request);
      return updateTimeline(response.entry);
    }),
    createMeasurement: (request) => execute(async () => {
      const response = await api.createMeasurement(request);
      return updateTimeline(response.entry);
    }),
    updateNutrition: (entryId, request) => execute(async () => {
      const response = await api.updateNutrition(entryId, request);
      return updateTimeline(response.entry, entryId);
    }),
    updateActivity: (entryId, request) => execute(async () => {
      const response = await api.updateActivity(entryId, request);
      return updateTimeline(response.entry, entryId);
    }),
    updateMeasurement: (entryId, request) => execute(async () => {
      const response = await api.updateMeasurement(entryId, request);
      return updateTimeline(response.entry, entryId);
    }),
    remove: (entry) => execute(async () => {
      if (entry.kind === 'NUTRITION') {
        await api.deleteNutrition(entry.id, { expectedRevision: entry.revision });
      } else if (entry.kind === 'ACTIVITY') {
        await api.deleteActivity(entry.id, { expectedRevision: entry.revision });
      } else {
        await api.deleteMeasurement(entry.id, { expectedRevision: entry.revision });
      }
      const current = queryClient.getQueryData<DiaryEntriesResponse>(queryKey)?.entries ?? [];
      return { entries: current.filter((item) => item.id !== entry.id) };
    }),
    confirmDay: async (request) => {
      const scope = auth.accountScope;
      if (!scope) return false;
      setWorkingScope(scope);
      setOperationError(null);
      try {
        const response = await api.confirmDay(request);
        if (!auth.isAccountScopeCurrent(scope)) return false;
        queryClient.setQueryData<DiaryDayConfirmationsResponse>(
          dayConfirmationQueryKey(scope.userId, request.localDate),
          { confirmations: [response.confirmation] },
        );
        void queryClient.invalidateQueries({
          queryKey: ['diary'],
          refetchType: 'inactive',
        });
        return true;
      } catch (error) {
        if (!auth.isAccountScopeCurrent(scope)) return false;
        setOperationError({ message: diaryErrorMessage(error), scope });
        return false;
      } finally {
        if (auth.isAccountScopeCurrent(scope)) setWorkingScope(null);
      }
    },
    removeDayConfirmation: async () => {
      const scope = auth.accountScope;
      const confirmation = confirmationQuery.data?.confirmations[0];
      if (!scope || !confirmation) return false;
      setWorkingScope(scope);
      setOperationError(null);
      try {
        await api.deleteDayConfirmation(confirmation.localDate, {
          expectedRevision: confirmation.revision,
        });
        if (!auth.isAccountScopeCurrent(scope)) return false;
        queryClient.setQueryData<DiaryDayConfirmationsResponse>(
          dayConfirmationQueryKey(scope.userId, confirmation.localDate),
          { confirmations: [] },
        );
        void queryClient.invalidateQueries({
          queryKey: ['diary'],
          refetchType: 'inactive',
        });
        return true;
      } catch (error) {
        if (!auth.isAccountScopeCurrent(scope)) return false;
        setOperationError({ message: diaryErrorMessage(error), scope });
        return false;
      } finally {
        if (auth.isAccountScopeCurrent(scope)) setWorkingScope(null);
      }
    },
  }), [
    api,
    auth,
    confirmationQuery,
    execute,
    operationError,
    ownsCurrentScope,
    query,
    queryClient,
    queryKey,
    updateTimeline,
    userId,
    workingScope,
  ]);

  return (
    <DiaryApiContext.Provider value={api}>
      <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
    </DiaryApiContext.Provider>
  );
}

export function useDiary() {
  const value = useContext(DiaryContext);
  if (!value) throw new Error('useDiary must be used inside DiaryProvider');
  return value;
}

export function useDiaryMonth(month: Date) {
  const api = useContext(DiaryApiContext);
  const auth = useAuth();
  if (!api) throw new Error('useDiaryMonth must be used inside DiaryProvider');
  const userId = auth.user?.id ?? null;
  const range = diaryMonthRange(month);
  const entriesQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: diaryQueryKey(userId ?? '', range.from, range.to),
    queryFn: () => api.list({ from: range.from, to: range.to }),
  });
  const confirmationsQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ['diary', 'day-confirmations', userId ?? '', range.fromDate, range.toDate] as const,
    queryFn: () => api.listDayConfirmations({
      fromDate: range.fromDate,
      toDate: range.toDate,
    }),
  });

  return {
    confirmations: confirmationsQuery.data?.confirmations ?? [],
    entries: entriesQuery.data?.entries ?? [],
    error: entriesQuery.error ?? confirmationsQuery.error
      ? diaryErrorMessage(entriesQuery.error ?? confirmationsQuery.error)
      : null,
    isLoading: Boolean(userId) && (entriesQuery.isPending || confirmationsQuery.isPending),
    reload: async () => {
      await Promise.all([entriesQuery.refetch(), confirmationsQuery.refetch()]);
    },
  };
}

export function currentLocalDayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function currentLocalDay(now = new Date()) {
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    localDate,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

export function diaryMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    fromDate: localDate(start),
    toDate: localDate(lastDay),
  };
}

function localDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function diaryErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return 'Запись уже изменилась. Мы загрузили свежие данные — проверьте их и повторите.';
    if (error.status === 404) return 'Запись уже удалена или недоступна этому аккаунту.';
    return error.message;
  }
  return 'Не удалось сохранить дневник. Мы не отмечаем запись сохранённой без ответа backend.';
}

export type { ActivityEntry, MeasurementEntry, NutritionEntry };
