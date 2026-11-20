'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Modal.module.css';

/** Modal de ruta interceptada: se abre al montar y, al cerrarse, vuelve atrás en el historial. */
export function Modal({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onClose={() => router.back()}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <button type="button" className={styles.close} aria-label="Cerrar" onClick={() => ref.current?.close()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
