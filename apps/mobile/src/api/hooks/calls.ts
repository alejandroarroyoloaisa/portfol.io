import type { CreateApplicationInput } from '@portfolio/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { qk, type ApplicationsFilter, type CallsFilter } from '../keys';
import { queryClient } from '../queryClient';

/** Convocatorias ordenadas por encaje con la obra propia (RF-22). */
export function useCalls(filter: CallsFilter) {
  return useQuery({
    queryKey: qk.calls(filter),
    queryFn: () => api.calls.list({ match: filter.match || undefined, type: filter.type }),
    select: (calls) =>
      [...calls].sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1) || a.daysLeft - b.daysLeft),
  });
}

export function useCall(id: string) {
  return useQuery({ queryKey: qk.call(id), queryFn: () => api.calls.get(id) });
}

export function useApplications(filter: ApplicationsFilter) {
  return useQuery({ queryKey: qk.applications(filter), queryFn: () => api.me.applications({ filter }), placeholderData: (p) => p });
}

export function useApplication(id: string | undefined) {
  return useQuery({ queryKey: qk.application(id ?? ''), queryFn: () => api.applications.get(id!), enabled: !!id });
}

const afterApplicationChange = (callId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.applicationsAll }),
    queryClient.invalidateQueries({ queryKey: qk.summary }),
    queryClient.invalidateQueries({ queryKey: qk.callsAll }),
    queryClient.invalidateQueries({ queryKey: qk.call(callId) }),
  ]);

/**
 * Enviar o guardar como borrador (RF-24, RF-25). Si ya existe un borrador, se actualiza;
 * si no, se crea (la API reutiliza el borrador existente en ambos casos).
 */
export function useSubmitApplication(callId: string) {
  return useMutation({
    mutationFn: ({ draftId, body }: { draftId?: string; body: CreateApplicationInput }) =>
      draftId ? api.applications.update(draftId, body) : api.calls.apply(callId, body),
    onSuccess: (app) => {
      queryClient.setQueryData(qk.application(app.id), app);
      return afterApplicationChange(callId);
    },
  });
}

export function useWithdraw() {
  return useMutation({
    mutationFn: (id: string) => api.applications.withdraw(id),
    onSuccess: (app) => afterApplicationChange(app.call.id),
  });
}
