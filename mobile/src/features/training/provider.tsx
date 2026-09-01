import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateWorkoutSessionRequest,
  ExerciseCatalogItem,
  UpdateWorkoutSessionRequest,
  WorkoutSession,
  WorkoutSessionsResponse,
} from '@ai-fitness-coach/contracts';
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { useAuth, type AuthAccountScope } from '@/features/auth';
import { ApiRequestError } from '@/platform/api';
import type { TrainingApiPort } from './api';

type TrainingContextValue = {
  catalog: ExerciseCatalogItem[];
  catalogError: string | null;
  isCatalogLoading: boolean;
  sessions: WorkoutSession[];
  error: string | null;
  isLoading: boolean;
  isWorking: boolean;
  reload: () => Promise<void>;
  create: (request: CreateWorkoutSessionRequest) => Promise<boolean>;
  update: (sessionId: string, request: UpdateWorkoutSessionRequest) => Promise<boolean>;
  remove: (session: WorkoutSession) => Promise<boolean>;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);
const TrainingApiContext = createContext<TrainingApiPort | null>(null);
const trainingQueryKey = (userId: string, from: string, to: string) =>
  ['training', 'sessions', userId, from, to] as const;
const trainingCatalogQueryKey = (userId: string) => ['training', 'catalog', userId] as const;

export function TrainingProvider({
  api,
  children,
}: PropsWithChildren<{ api: TrainingApiPort }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.user?.id ?? null;
  const range = currentMonthRange();
  const queryKey = trainingQueryKey(userId ?? '', range.from, range.to);
  const query = useQuery({
    enabled: Boolean(userId),
    queryKey,
    queryFn: () => api.list(range),
  });
  const catalogQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: trainingCatalogQueryKey(userId ?? ''),
    queryFn: () => api.listCatalog(),
  });
  const [workingScope, setWorkingScope] = useState<AuthAccountScope | null>(null);
  const [operationError, setOperationError] = useState<{
    message: string;
    scope: AuthAccountScope;
  } | null>(null);

  const value = useMemo<TrainingContextValue>(() => {
    const ownsScope = (scope: AuthAccountScope | null | undefined) => Boolean(
      scope && auth.accountScope &&
      scope.userId === auth.accountScope.userId &&
      scope.generation === auth.accountScope.generation,
    );
    const replaceSession = (session: WorkoutSession): WorkoutSessionsResponse => {
      const current = queryClient.getQueryData<WorkoutSessionsResponse>(queryKey)?.sessions ?? [];
      return {
        sessions: [session, ...current.filter((item) => item.id !== session.id)].sort(
          (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
        ),
      };
    };
    const execute = async (operation: () => Promise<WorkoutSessionsResponse>) => {
      const scope = auth.accountScope;
      if (!scope) return false;
      setWorkingScope(scope);
      setOperationError(null);
      try {
        const result = await operation();
        if (!auth.isAccountScopeCurrent(scope)) return false;
        queryClient.setQueryData(trainingQueryKey(scope.userId, range.from, range.to), result);
        void queryClient.invalidateQueries({ queryKey: ['training'], refetchType: 'inactive' });
        return true;
      } catch (error) {
        if (!auth.isAccountScopeCurrent(scope)) return false;
        setOperationError({ message: trainingErrorMessage(error), scope });
        if (error instanceof ApiRequestError && error.status === 409) {
          await queryClient.invalidateQueries({ queryKey: ['training', 'sessions', scope.userId] });
        }
        return false;
      } finally {
        if (auth.isAccountScopeCurrent(scope)) setWorkingScope(null);
      }
    };

    return {
      catalog: catalogQuery.data?.exercises ?? [],
      catalogError: catalogQuery.error ? trainingErrorMessage(catalogQuery.error) : null,
      isCatalogLoading: Boolean(userId) && catalogQuery.isPending,
      sessions: query.data?.sessions ?? [],
      error: ownsScope(operationError?.scope)
        ? operationError?.message ?? null
        : query.error
          ? trainingErrorMessage(query.error)
          : null,
      isLoading: Boolean(userId) && query.isPending,
      isWorking: ownsScope(workingScope),
      reload: async () => {
        setOperationError(null);
        await Promise.all([query.refetch(), catalogQuery.refetch()]);
      },
      create: (request) => execute(async () => {
        const response = await api.create(request);
        return replaceSession(response.session);
      }),
      update: (sessionId, request) => execute(async () => {
        const response = await api.update(sessionId, request);
        return replaceSession(response.session);
      }),
      remove: (session) => execute(async () => {
        await api.delete(session.id, { expectedRevision: session.revision });
        const current = queryClient.getQueryData<WorkoutSessionsResponse>(queryKey)?.sessions ?? [];
        return { sessions: current.filter((item) => item.id !== session.id) };
      }),
    };
  }, [api, auth, catalogQuery, operationError, query, queryClient, queryKey, range.from, range.to, userId, workingScope]);

  return (
    <TrainingApiContext.Provider value={api}>
      <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
    </TrainingApiContext.Provider>
  );
}

export function useTraining() {
  const value = useContext(TrainingContext);
  if (!value) throw new Error('useTraining must be used inside TrainingProvider');
  return value;
}

export function useTrainingMonth(month: Date) {
  const api = useContext(TrainingApiContext);
  const auth = useAuth();
  if (!api) throw new Error('useTrainingMonth must be used inside TrainingProvider');
  const userId = auth.user?.id ?? null;
  const range = monthRange(month);
  const query = useQuery({
    enabled: Boolean(userId),
    queryKey: trainingQueryKey(userId ?? '', range.from, range.to),
    queryFn: () => api.list(range),
  });
  return {
    sessions: query.data?.sessions ?? [],
    error: query.error ? trainingErrorMessage(query.error) : null,
    isLoading: Boolean(userId) && query.isPending,
    reload: async () => { await query.refetch(); },
  };
}

function currentMonthRange(now = new Date()) {
  return monthRange(now);
}

function monthRange(now: Date) {
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

function trainingErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return 'Тренировка уже изменилась. Обновите историю и повторите исправление.';
    if (error.status === 404) return 'Тренировка уже удалена или недоступна этому аккаунту.';
    return error.message;
  }
  return 'Не удалось сохранить тренировку. Запись не считается сохранённой без ответа backend.';
}
