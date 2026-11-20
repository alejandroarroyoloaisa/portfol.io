'use server';

import { redirect } from 'next/navigation';
import { ApiRequestError } from '@portfolio/api-client';
import { loginSchema } from '@portfolio/schemas';
import { safeNext } from '@/lib/auth-cookies';
import { anonymousApi, writeTokens } from '@/lib/session';

export interface LoginState {
  email: string;
  message?: string;
  errors?: Partial<Record<'email' | 'password', string>>;
}

/**
 * Inicia sesión contra la API y guarda los tokens en cookies HttpOnly (SameSite=Lax,
 * Secure en producción). El navegador nunca recibe los tokens en JavaScript.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const parsed = loginSchema.safeParse({ email, password: String(formData.get('password') ?? '') });
  if (!parsed.success) {
    const errors: LoginState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'email' || key === 'password') && !errors[key]) errors[key] = issue.message;
    }
    return { email, errors };
  }

  try {
    const res = await anonymousApi().auth.login(parsed.data);
    await writeTokens(res);
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 401 || e.status === 400)) {
      return { email, message: 'El correo o la contraseña no son correctos.' };
    }
    if (e instanceof ApiRequestError && e.status === 429) {
      return { email, message: 'Demasiados intentos. Espera un minuto y vuelve a probar.' };
    }
    return { email, message: 'No podemos conectar con Portfol.io ahora mismo. Inténtalo de nuevo en unos segundos.' };
  }

  redirect(safeNext(formData.get('next')));
}
