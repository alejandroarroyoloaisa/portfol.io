/** Pantalla de detalle mientras carga o si falla: siempre con botón de volver. */
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Screen, ScreenHeader } from './Screen';
import { ErrorState, LoadingState } from './States';

export function ScreenQuery<T>({ query, children, bg }: {
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'isPending' | 'refetch'>; children: (data: T) => ReactNode; bg?: string;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  return (
    <Screen bg={bg}>
      <ScreenHeader />
      {query.isPending ? <LoadingState /> : <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
    </Screen>
  );
}
