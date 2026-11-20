import { APPLICATION_STATUS, type ApplicationStatus } from '@portfolio/schemas';
import { applicationStatusLabel, statusColors } from '@/lib/format';
import styles from '../panel.module.css';

/** Barra apilada con el reparto de candidaturas por estado. */
export function CallStatusBar({ byStatus, total }: { byStatus: Partial<Record<ApplicationStatus, number>>; total: number }) {
  const parts = APPLICATION_STATUS.filter((s) => (byStatus[s] ?? 0) > 0);
  if (!total || !parts.length) return null;
  const summary = parts.map((s) => `${byStatus[s]} ${applicationStatusLabel(s)}`).join(', ');
  return (
    <div>
      <div className={styles.stack} role="img" aria-label={`Candidaturas por estado: ${summary}`}>
        {parts.map((s) => (
          <span key={s} style={{ width: `${((byStatus[s] ?? 0) / total) * 100}%`, background: statusColors(s).bg }} />
        ))}
      </div>
      <div className={styles.legend} aria-hidden="true">
        {parts.map((s) => (
          <span key={s}>
            <i style={{ background: statusColors(s).bg }} />
            {byStatus[s]} {applicationStatusLabel(s)}
          </span>
        ))}
      </div>
    </div>
  );
}
