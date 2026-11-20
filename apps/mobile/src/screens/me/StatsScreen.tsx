/** 22 · Estadísticas: cifras clave, visitas por periodo (7/30/90 días), audiencia y obras más vistas (RF-32, HU-09). */
import type { StatsPeriod } from '@portfolio/schemas';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useStats } from '../../api/hooks/me';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Screen, ScreenHeader } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors, onColor, stroke } from '../../theme';
import { formatDelta, formatNumber } from '../../utils/format';
import { usePullRefresh } from '../../utils/hooks';

const PERIODS: StatsPeriod[] = ['7d', '30d', '90d'];
const AUDIENCE_COLORS: Record<string, string> = { artista: colors.cobalto, galeria: colors.coral, coleccionista: colors.mostaza, institucion: colors.verde, admin: colors.gris };

function Card({ value, label, bg }: { value: string; label: string; bg: string }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={{ width: '48.5%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: bg }}>
      <Headline size={30} lineHeight={34} color={onColor(bg)}>{value}</Headline>
      <HandNote size={19} color={onColor(bg)}>{label}</HandNote>
    </View>
  );
}

export function StatsScreen() {
  const { nav } = useAppNavigation();
  const [period, setPeriod] = useState<StatsPeriod>('30d');
  const q = useStats(period);
  const { refreshing, onRefresh } = usePullRefresh(q.refetch);
  const s = q.data;
  const maxBar = Math.max(1, ...(s?.series.map((b) => b.value) ?? [1]));
  const best = s?.series.reduce((a, b) => (b.value > a.value ? b : a), s.series[0]);
  const maxViews = Math.max(1, ...(s?.topArtworks.map((a) => a.views) ?? [1]));

  return (
    <Screen>
      <ScreenHeader title={t.stats.title} titleSize={40}>
        <View accessibilityRole="tablist" accessibilityLabel={t.stats.period} style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {PERIODS.map((p) => {
            const on = p === period;
            return (
              <Pressable
                key={p}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setPeriod(p)}
                style={{ height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: on ? colors.tinta : colors.blanco, justifyContent: 'center' }}
              >
                <Txt size={13} weight="black" color={on ? colors.crema : colors.tinta}>{t.stats.periods[p]}</Txt>
              </Pressable>
            );
          })}
        </View>
      </ScreenHeader>
      {!s ? (
        q.isPending ? <LoadingState /> : <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, opacity: q.isPlaceholderData ? 0.6 : 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
            <Card value={formatNumber(s.visits)} label={t.stats.visits(formatDelta(s.visitsDelta))} bg={colors.cobalto} />
            <Card value={formatNumber(s.views)} label={t.stats.views} bg={colors.blanco} />
            <Card value={formatNumber(s.saves)} label={t.stats.saves} bg={colors.blanco} />
            <Card value={formatNumber(s.contacts)} label={t.stats.contacts} bg={colors.coral} />
          </View>

          <View style={{ marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: colors.blanco }}>
            <Txt size={17} weight="black">{t.stats.chartTitle}</Txt>
            {best ? <HandNote size={18} color={colors.cobalto}>{t.stats.best(best.label)}</HandNote> : null}
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={t.stats.chartA11y(s.series.map((b) => `${b.label}: ${b.value}`).join(', '))}
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, marginTop: 10, borderBottomWidth: 2, borderColor: colors.tinta }}
            >
              {s.series.map((b) => (
                <View key={b.label} style={{ flex: 1, height: `${Math.max(4, (b.value / maxBar) * 100)}%`, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: b === best ? colors.coral : colors.cobalto }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {s.series.map((b) => <Txt key={b.label} size={11} weight="bold" center style={{ flex: 1 }}>{b.label}</Txt>)}
            </View>
          </View>

          <View style={{ marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: colors.blanco }}>
            <Txt size={17} weight="black" style={{ marginBottom: 10 }}>{t.stats.audience}</Txt>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={s.audience.map((a) => `${t.stats.roles[a.role]} ${a.pct}\u00A0%`).join(', ')}
              style={{ flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden' }}
            >
              {s.audience.map((a) => <View key={a.role} style={{ width: `${a.pct}%`, backgroundColor: AUDIENCE_COLORS[a.role] }} />)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginTop: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {s.audience.map((a) => (
                <View key={a.role} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: AUDIENCE_COLORS[a.role] }} />
                  <Txt size={13} weight="bold">{`${t.stats.roles[a.role]} ${a.pct}\u00A0%`}</Txt>
                </View>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: colors.blanco }}>
            <Txt size={17} weight="black" style={{ marginBottom: 10 }}>{t.stats.top}</Txt>
            {s.topArtworks.length === 0 ? <Txt size={14}>{t.stats.noTop}</Txt> : null}
            {s.topArtworks.map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${a.title}: ${formatNumber(a.views)}`}
                onPress={() => nav.navigate('Artwork', { id: a.id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, minHeight: 44 }}
              >
                <ArtworkImage image={a.image} title={a.title} variant="thumb" style={{ width: 44, height: 44 }} />
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="black" numberOfLines={1}>{a.title}</Txt>
                  <View style={{ height: 8, marginTop: 4, borderRadius: 4, backgroundColor: colors.cobalto, width: `${(a.views / maxViews) * 100}%` }} />
                </View>
                <Txt size={14} weight="black">{formatNumber(a.views)}</Txt>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
