import type { LoginInput, OnboardingInput, RegisterInput } from '@portfolio/schemas';
import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import { qk } from '../keys';
import { clearAllCaches, queryClient } from '../queryClient';

export function useLogin() {
  return useMutation({
    mutationFn: (b: LoginInput) => api.auth.login(b),
    onSuccess: (r) => queryClient.setQueryData(qk.me, r.user),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (b: RegisterInput) => api.auth.register(b),
    onSuccess: (r) => queryClient.setQueryData(qk.me, r.user),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => api.auth.forgotPassword(email) });
}

export function useResetPassword() {
  return useMutation({ mutationFn: (b: { token: string; password: string }) => api.auth.resetPassword(b.token, b.password) });
}

export function useOnboarding() {
  return useMutation({
    mutationFn: (b: OnboardingInput) => api.me.onboarding(b),
    onSuccess: (me) => queryClient.setQueryData(qk.me, me),
  });
}

/** Cierra la sesión en el servidor (revoca el refresh) y borra todo lo local. */
export async function signOut() {
  try {
    await api.auth.logout();
  } catch {
    /* sin red: se borra igualmente lo local */
  }
  await clearAllCaches();
}
