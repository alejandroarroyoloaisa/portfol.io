import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { panelFetchOrNull } from '@/lib/session';
import { CallForm } from '../../../components/CallForm';
import styles from '../../../panel.module.css';

export const metadata: Metadata = { title: 'Editar convocatoria' };

export default async function EditCallPage({ params }: PageProps<'/panel/convocatorias/[id]/editar'>) {
  const { id } = await params;
  const call = await panelFetchOrNull((api) => api.calls.get(id), `/panel/convocatorias/${id}/editar`);
  if (!call) notFound();
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={`hand ${styles.kicker}`}>editar convocatoria</p>
          <h1 className={styles.h1}>{call.title}</h1>
        </div>
      </div>
      <CallForm call={call} />
    </>
  );
}
