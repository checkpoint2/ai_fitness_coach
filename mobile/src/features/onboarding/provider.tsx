import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OnboardingDraftPatch,
  OnboardingFieldKey,
  OnboardingSnapshot,
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
import type { OnboardingApiPort } from './api';
import { createOnboardingMutationId } from './mutation-id';

type PendingOperation = {
  label: string;
  run: () => Promise<OnboardingSnapshot>;
  scope: AuthAccountScope;
};

type OnboardingContextValue = {
  snapshot: OnboardingSnapshot | null;
  error: string | null;
  isLoading: boolean;
  isWorking: boolean;
  pendingLabel: string | null;
  reload: () => Promise<void>;
  retry: () => Promise<void>;
  saveStructuredDraft: (patch: OnboardingDraftPatch) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  confirmProfile: (confirmedFieldKeys: OnboardingFieldKey[]) => Promise<void>;
  createPlanDraft: () => Promise<void>;
  confirmPlan: () => Promise<void>;
  complete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);
const onboardingQueryKey = (userId: string) => ['onboarding', 'current', userId] as const;

export function OnboardingProvider({
  api,
  children,
}: PropsWithChildren<{ api: OnboardingApiPort }>) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId = auth.user?.id ?? null;
  const [operationError, setOperationError] = useState<{
    message: string;
    scope: AuthAccountScope;
  } | null>(null);
  const [workingScope, setWorkingScope] = useState<AuthAccountScope | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);

  const snapshotQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: onboardingQueryKey(userId ?? ''),
    queryFn: () => api.getSnapshot(),
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

  const commit = useCallback(
    (scope: AuthAccountScope, snapshot: OnboardingSnapshot) => {
      if (!auth.isAccountScopeCurrent(scope)) return false;
      queryClient.setQueryData(onboardingQueryKey(scope.userId), snapshot);
      setOperationError(null);
      setPendingOperation(null);
      return true;
    },
    [auth, queryClient],
  );

  const execute = useCallback(
    async (operation: PendingOperation) => {
      if (!auth.isAccountScopeCurrent(operation.scope)) return;
      setWorkingScope(operation.scope);
      setOperationError(null);
      setPendingOperation(operation);

      try {
        const snapshot = await operation.run();
        commit(operation.scope, snapshot);
      } catch (caughtError) {
        if (!auth.isAccountScopeCurrent(operation.scope)) return;
        if (caughtError instanceof ApiRequestError && caughtError.status === 409) {
          setPendingOperation(null);
          setOperationError({
            message: 'Черновик изменился в другой сессии. Мы загрузили свежую версию — проверьте её перед повтором.',
            scope: operation.scope,
          });
          await queryClient.invalidateQueries({
            queryKey: onboardingQueryKey(operation.scope.userId),
          });
          return;
        }
        setOperationError({
          message: onboardingErrorMessage(caughtError),
          scope: operation.scope,
        });
      } finally {
        if (auth.isAccountScopeCurrent(operation.scope)) setWorkingScope(null);
      }
    },
    [auth, commit, queryClient],
  );

  const start = useCallback(
    async (
      label: string,
      createRun: (snapshot: OnboardingSnapshot) => () => Promise<OnboardingSnapshot>,
    ) => {
      const scope = auth.accountScope;
      if (!scope) return;
      const snapshot = queryClient.getQueryData<OnboardingSnapshot>(
        onboardingQueryKey(scope.userId),
      );
      if (!snapshot) {
        setOperationError({
          message: 'Не удалось загрузить onboarding. Проверьте соединение и повторите.',
          scope,
        });
        return;
      }
      await execute({ label, run: createRun(snapshot), scope });
    },
    [auth.accountScope, execute, queryClient],
  );

  const mutation = (snapshot: OnboardingSnapshot) => ({
    clientMutationId: createOnboardingMutationId(),
    expectedRevision: snapshot.revision,
  });

  const value = useMemo<OnboardingContextValue>(() => ({
    snapshot: snapshotQuery.data ?? null,
    error: ownsCurrentScope(operationError?.scope)
      ? operationError?.message ?? null
      : snapshotQuery.error
        ? onboardingErrorMessage(snapshotQuery.error)
        : null,
    isLoading: Boolean(userId) && snapshotQuery.isPending,
    isWorking: ownsCurrentScope(workingScope),
    pendingLabel: ownsCurrentScope(pendingOperation?.scope)
      ? pendingOperation?.label ?? null
      : null,
    reload: async () => {
      setOperationError(null);
      await snapshotQuery.refetch();
    },
    retry: async () => {
      if (pendingOperation && ownsCurrentScope(pendingOperation.scope)) {
        await execute(pendingOperation);
      }
      else await snapshotQuery.refetch();
    },
    saveStructuredDraft: (patch) =>
      start('Сохраняем черновик', (snapshot) => {
        const request = {
          ...mutation(snapshot),
          initialEntryMode: snapshot.initialEntryMode ?? ('STRUCTURED' as const),
          patch,
        };
        return () => api.saveDraft(request);
      }),
    pause: () =>
      start('Сохраняем паузу', (snapshot) => {
        const request = mutation(snapshot);
        return () => api.pause(request);
      }),
    resume: () =>
      start('Возобновляем', (snapshot) => {
        const request = mutation(snapshot);
        return () => api.resume(request);
      }),
    confirmProfile: (confirmedFieldKeys) =>
      start('Подтверждаем профиль', (snapshot) => {
        const request = {
          ...mutation(snapshot),
          confirmedFieldKeys,
          sourceNarrativeRetention: 'DELETE' as const,
        };
        return () => api.confirmProfile(request);
      }),
    createPlanDraft: () =>
      start('Готовим стартовую стратегию', (snapshot) => {
        const request = mutation(snapshot);
        return () => api.createPlanDraft(request);
      }),
    confirmPlan: () =>
      start('Подтверждаем план', (snapshot) => {
        if (!snapshot.plan) throw new Error('Plan draft is missing');
        const request = {
          ...mutation(snapshot),
          planId: snapshot.plan.id,
          planVersion: snapshot.plan.version,
        };
        return () => api.confirmPlan(request);
      }),
    complete: () =>
      start('Завершаем настройку', (snapshot) => {
        const request = mutation(snapshot);
        return () => api.complete(request);
      }),
  }), [
    api,
    execute,
    operationError,
    ownsCurrentScope,
    pendingOperation,
    snapshotQuery,
    start,
    userId,
    workingScope,
  ]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return context;
}

function onboardingErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status >= 500) return 'Сервис временно недоступен. Черновик не отмечен сохранённым — попробуйте ещё раз.';
    return error.message;
  }
  return 'Не удалось связаться с сервером. Проверьте соединение и повторите — мы не сообщаем «сохранено» без ответа backend.';
}
