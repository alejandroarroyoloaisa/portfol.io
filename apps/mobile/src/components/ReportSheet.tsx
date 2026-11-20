/** Denunciar una obra, un perfil o un mensaje (RF-35). */
import { REPORT_REASONS, type ReportInput } from '@portfolio/schemas';
import { useReport } from '../api/hooks/discovery';
import { t } from '../i18n';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Txt } from './Text';
import { toast } from './Toast';

export function ReportSheet({ visible, onClose, target, title }: {
  visible: boolean; onClose: () => void; target: Pick<ReportInput, 'targetType' | 'targetId'>; title: string;
}) {
  const report = useReport();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Txt size={15} style={{ marginBottom: 12 }}>{t.report.intro}</Txt>
      {REPORT_REASONS.map((r) => (
        <Button
          key={r}
          label={t.report.reasons[r]}
          variant="white"
          size="md"
          disabled={report.isPending}
          style={{ marginBottom: 8 }}
          onPress={() =>
            report.mutate(
              { ...target, reason: r },
              {
                onSuccess: () => {
                  toast.ok(t.report.sent);
                  onClose();
                },
                onError: toast.error,
              },
            )
          }
        />
      ))}
    </Sheet>
  );
}
