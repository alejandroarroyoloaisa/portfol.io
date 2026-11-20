'use client';

import { useEffect } from 'react';
import { PUBLIC_API_URL } from '@/lib/config';

/**
 * Registra una visita al perfil (POST /users/:id/view) desde el navegador, una vez por sesión
 * de pestaña. Se hace en el cliente porque la página pública se sirve cacheada (ISR).
 */
export function ViewBeacon({ userId }: { userId: string }) {
  useEffect(() => {
    const key = `pf:view:${userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* almacenamiento no disponible: se registra igualmente */
    }
    fetch(`${PUBLIC_API_URL}/users/${encodeURIComponent(userId)}/view`, { method: 'POST', keepalive: true, mode: 'cors' }).catch(() => {});
  }, [userId]);
  return null;
}
