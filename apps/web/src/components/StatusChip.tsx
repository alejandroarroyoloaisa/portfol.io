import type { ApplicationStatus } from '@portfolio/schemas';
import { applicationStatusLabel, capitalize, statusColors } from '@/lib/format';

export function StatusChip({ status, size = 'sm' }: { status: ApplicationStatus; size?: 'sm' | 'md' }) {
  const c = statusColors(status);
  return (
    <span
      className={`chip${size === 'sm' ? ' chip-sm' : ''}`}
      style={{ background: c.bg, color: c.fg, borderColor: c.bg === '#FFFFFF' ? 'var(--c-tinta)' : 'transparent', fontWeight: 800 }}
    >
      {capitalize(applicationStatusLabel(status))}
    </span>
  );
}
