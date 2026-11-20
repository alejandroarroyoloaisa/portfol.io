/** Estado de una solicitud, indicador de encaje y barras de progreso. */
import type { ApplicationStatus, MatchInfo } from '@portfolio/schemas';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { labels, t } from '../i18n';
import { applicationStatusColors, colors, stroke } from '../theme';
import { Icon } from './Icon';
import { HandNote, Txt } from './Text';

/** Chip de estado con color y texto (nunca solo color, WCAG 1.4.1). */
export function StatusChip({ status, inverted, style }: { status: ApplicationStatus; inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = applicationStatusColors[status] ?? { bg: colors.blanco, fg: colors.tinta };
  const outline = status === 'borrador';
  const bg = inverted ? colors.crema : c.bg;
  const fg = inverted ? c.bg : c.fg;
  return (
    <View
      style={[
        { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: outline ? 'transparent' : bg, borderWidth: outline ? stroke : 0, borderColor: colors.tinta },
        style,
      ]}
    >
      <Txt size={12} weight="black" color={fg} style={{ letterSpacing: 0.4 }}>{labels.applicationStatus[status].toUpperCase()}</Txt>
    </View>
  );
}

/** Píldora «encaja con tu obra · 92 %» (RF-22, HU-03). */
export function MatchBadge({ match, onDark, style }: { match: MatchInfo; onDark?: boolean; style?: StyleProp<ViewStyle> }) {
  const strong = match.matches;
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, paddingVertical: 4, borderRadius: 999,
          backgroundColor: strong ? colors.tinta : 'transparent', borderWidth: strong ? 0 : stroke, borderColor: onDark ? colors.crema : colors.tinta,
        },
        style,
      ]}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: strong ? colors.mostaza : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {strong ? <Icon name="check" size={13} strokeWidth={3} /> : null}
      </View>
      <Txt size={12} weight="black" color={strong ? colors.crema : onDark ? colors.crema : colors.tinta}>
        {strong ? t.calls.matchBadge(match.score) : t.calls.matchScore(match.score)}
      </Txt>
    </View>
  );
}

/** Caja discontinua «encaja con tu obra: …» del detalle de convocatoria. */
export function MatchBox({ match }: { match: MatchInfo }) {
  const ok = match.matches;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18,
        backgroundColor: colors.blanco, borderWidth: 2, borderStyle: 'dashed', borderColor: ok ? colors.verde : colors.gris,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ok ? colors.verde : colors.arena, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ok ? 'check' : 'search'} size={18} color={ok ? colors.crema : colors.tinta} strokeWidth={2.6} />
      </View>
      <HandNote size={21} style={{ flex: 1 }}>
        {ok ? t.call.matches(match.reason) : t.call.partial(match.score, match.reason)}
      </HandNote>
    </View>
  );
}

/** Barra de progreso fina (perfil completado, obras más vistas). */
export function ProgressBar({ value, color = colors.verde, track = colors.arena, height = 8, style }: {
  value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Pasos en barras (registro «paso 1 de 2», progreso de solicitud). */
export function StepBars({ total, done, color = colors.tinta, track = colors.arena, height = 6 }: {
  total: number; done: number; color?: string; track?: string; height?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: i < done ? color : track }} />
      ))}
    </View>
  );
}
