'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';
import styles from './login.module.css';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { email: '' });
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.message && (
        <p className="form-alert" role="alert">{state.message}</p>
      )}
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          defaultValue={state.email}
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
        {state.errors?.email && <p id="email-error" className="field-error">{state.errors.email}</p>}
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          aria-invalid={state.errors?.password ? true : undefined}
          aria-describedby={state.errors?.password ? 'password-error' : undefined}
        />
        {state.errors?.password && <p id="password-error" className="field-error">{state.errors.password}</p>}
      </div>
      <button type="submit" className="btn btn-cobalt btn-lg" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Entrando…' : 'Entrar al panel'}
      </button>
    </form>
  );
}
