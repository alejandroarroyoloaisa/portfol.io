import type { Metadata } from 'next';
import { CallForm } from '../../components/CallForm';
import styles from '../../panel.module.css';

export const metadata: Metadata = { title: 'Nueva convocatoria' };

export default function NewCallPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={`hand ${styles.kicker}`}>se guarda como borrador hasta que la abras</p>
          <h1 className={styles.h1}>Nueva convocatoria</h1>
        </div>
      </div>
      <CallForm />
    </>
  );
}
