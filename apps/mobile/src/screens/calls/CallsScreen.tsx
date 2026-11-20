/** 12 · Convocatorias: tarjetas recortadas por tipo, ordenadas por encaje con la obra propia (RF-22, HU-03). */
import { CALL_TYPES, type CallSummary } from '@portfolio/schemas';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useCalls } from '../../api/hooks/calls';
import { useSummary } from '../../api/hooks/me';
import { Button } from '../../components/Button';
import { Chip, ChipRow } from '../../components/Chip';
import { Leaf, Tape, tapeColors } from '../../components/Decor';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { MatchBadge, StatusChip } from '../../components/Status';
import { HandNote, Headline, Txt } from '../../components/Text';
import { labels, t } from '../../i18n';
import type { TabScreenProps } from '../../navigation/types';
import { useSavedCalls } from '../../store/savedCalls';
import { callTypeColors, colors, shadows } from '../../theme';
import { shortDate } from '../../utils/format';
import { usePullRefresh, useRefreshOnFocus } from '../../utils/hooks';

type Filter = 'todas' | 'encajan' | 'guardadas' | (typeof CALL_TYPES)[number];

export function CallCard({ call, index, onPress }: { call: CallSummary; index: number; onPress: () => void }) {
  const look = callTypeColors[call.type] ?? callTypeColors.exposicion;
  const even = index % 2 === 0;
  const fg = look.fg;
  const meta = [call.organization.name, call.city, call.prize ?? (call.places ? t.profile.places(call.places) : null)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${call.title}. ${t.calls.kicker(labels.callType[call.type], shortDate(call.closesAt))}. ${meta}${call.match ? `. ${call.match.matches ? t.calls.matchBadge(call.match.score) : t.calls.matchScore(call.match.score)}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 18, backgroundColor: look.bg, opacity: pressed ? 0.92 : 1,
        borderTopLeftRadius: even ? 4 : 40, borderTopRightRadius: even ? 40 : 4, borderBottomRightRadius: even ? 4 : 40, borderBottomLeftRadius: even ? 40 : 4,
        transform: [{ rotate: `${[-1.5, 1.2, -0.8, 1][index % 4]}deg` }],
        boxShadow: look.bg === colors.blanco ? shadows.card : undefined,
      })}
    >
      {index === 0 ? <Tape width={70} height={22} rotate={8} color={tapeColors.crema} style={{ top: -10, right: 40 }} /> : null}
      <HandNote size={22} lineHeight={22} color={look.accent}>
        {call.daysLeft < 0 ? t.calls.closed : t.calls.kicker(labels.callType[call.type], shortDate(call.closesAt))}
      </HandNote>
      <Headline size={30} lineHeight={31} color={fg} style={{ marginTop: 6, marginBottom: 4 }}>{call.title}</Headline>
      <Txt size={14} weight="bold" color={fg}>{meta}</Txt>
      {call.match || call.myApplication ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
          {call.match ? <MatchBadge match={call.match} onDark={fg === colors.crema} /> : null}
          {call.myApplication ? <StatusChip status={call.myApplication.status} inverted={fg === colors.crema} /> : null}
        </View>
      ) : null}
      {call.match?.matches && !call.myApplication ? (
        <View pointerEvents="none" style={{ marginTop: 12 }}>
          <Button label={t.calls.viewAndApply} variant={fg === colors.crema ? 'cream' : 'dark'} size="sm" style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function CallsScreen({ navigation }: TabScreenProps<'Calls'>) {
  const [filter, setFilter] = useState<Filter>('todas');
  const saved = useSavedCalls((s) => s.ids);
  const calls = useCalls({
    match: filter === 'encajan' || undefined,
    type: (CALL_TYPES as readonly string[]).includes(filter) ? filter : undefined,
  });
  const summary = useSummary();
  useRefreshOnFocus(summary.refetch);
  const { refreshing, onRefresh } = usePullRefresh(() => Promise.all([calls.refetch(), summary.refetch()]));
  const list = filter === 'guardadas' ? calls.data?.filter((c) => saved.includes(c.id)) : calls.data;
  const s = summary.data;

  const filters: Filter[] = ['todas', 'encajan', 'guardadas', ...CALL_TYPES];

  return (
    <Screen decor={<Leaf color={colors.cobalto} width={120} height={150} style={{ top: 10, right: -20 }} />}>
      <FlatList
        data={list ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} colors={[colors.cobalto]} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 6 }}>
            <Headline size={56} lineHeight={52} accessibilityLabel={t.calls.title}>{`${t.calls.titleA}\n${t.calls.titleB}`}</Headline>
            {s ? <HandNote size={24} style={{ marginTop: 8 }}>{t.calls.subtitle(s.openCalls, s.matchingCalls)}</HandNote> : null}
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate('Applications')}
              style={({ pressed }) => ({
                alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999,
                borderWidth: 2, borderColor: colors.tinta, backgroundColor: colors.crema, opacity: pressed ? 0.8 : 1,
              })}
            >
              <Txt size={13} weight="black">{t.calls.myApplications(s?.applicationsInProgress ?? 0)}</Txt>
            </Pressable>
            <ChipRow scroll style={{ marginTop: 14 }}>
              {filters.map((f) => (
                <Chip
                  key={f}
                  label={t.calls.filters[f] ?? labels.callType[f as (typeof CALL_TYPES)[number]]}
                  size="sm"
                  radio
                  selected={filter === f}
                  selectedColor={colors.tinta}
                  selectedTextColor={colors.crema}
                  bg="transparent"
                  onPress={() => setFilter(f)}
                />
              ))}
            </ChipRow>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 20, paddingTop: index === 0 ? 18 : 26 }}>
            <CallCard call={item} index={index} onPress={() => navigation.navigate('CallDetail', { id: item.id })} />
          </View>
        )}
        ListEmptyComponent={
          calls.isPending ? <LoadingState /> : calls.error ? <ErrorState error={calls.error} onRetry={() => void calls.refetch()} /> : <EmptyState title={t.calls.emptyTitle} text={t.calls.emptyText} />
        }
      />
    </Screen>
  );
}
