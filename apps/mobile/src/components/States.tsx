/** Estados de carga, vacío y error, y un envoltorio para consultas de TanStack Query. */
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { t } from '../i18n';
import { colors } from '../theme';
import { errorMessage, isStatus } from '../utils/errors';
import { Button } from './Button';
import { Blob } from './Decor';
import { HandNote, Headline, Txt } from './Text';

export function LoadingState({ label = t.common.loading, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={[{ flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 8 }, style]}>
      <ActivityIndicator size="large" color={colors.cobalto} />
      <HandNote size={22} color={colors.cobalto}>{label}</HandNote>
    </View>
  );
}

export function EmptyState({ title, text, action, onAction, color = colors.mostaza, style }: {
  title: string; text?: string; action?: string; onAction?: () => void; color?: string; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }, style]}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Blob color={color} size={120} style={{ top: 0, left: 0 }} />
      </View>
      <Headline size={30} style={{ marginTop: 12, textAlign: 'center' }}>{title}</Headline>
      {text ? <Txt size={15} center style={{ marginTop: 6 }}>{text}</Txt> : null}
      {action && onAction ? <Button label={action} variant="dark" size="md" onPress={onAction} style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry, style }: { error: unknown; onRetry?: () => void; style?: StyleProp<ViewStyle> }) {
  const notFound = isStatus(error, 404) || isStatus(error, 403);
  return (
    <View accessibilityRole="alert" style={[{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }, style]}>
      <HandNote size={30} color={colors.anotacion} rotate={-2}>{notFound ? t.notFound.title : t.common.error}</HandNote>
      <Txt size={15} center style={{ marginTop: 8 }}>{notFound ? t.notFound.text : errorMessage(error)}</Txt>
      {onRetry && !notFound ? <Button label={t.common.retry} variant="outline" size="md" onPress={onRetry} style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

/** Pinta carga / error / contenido según el estado de una consulta. */
export function QueryView<T>({ query, children, loading }: {
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'isPending' | 'refetch'>; children: (data: T) => ReactNode; loading?: ReactNode;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;
  return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
}

/** Aviso de error en línea (formularios). */
export function InlineError({ message, style }: { message?: string | null; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[{ padding: 12, borderRadius: 16, backgroundColor: '#FFE1D8', borderWidth: 2, borderColor: colors.anotacion }, style]}>
      <Txt size={14} weight="bold" color="#8E2A0F">{message}</Txt>
    </View>
  );
}
