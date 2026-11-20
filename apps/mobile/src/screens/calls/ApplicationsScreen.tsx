/** 15 · Mis solicitudes: estados con color y texto, progreso en tres fases, notas y retirada (RF-25, RF-28, HU-05). */
import { isInProgress, type Application } from '@portfolio/schemas';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useApplications, useWithdraw } from '../../api/hooks/calls';
import { useConversations } from '../../api/hooks/messaging';
import type { ApplicationsFilter } from '../../api/keys';
import { HandLink, TextLink } from '../../components/Button';
import { Chip, ChipRow } from '../../components/Chip';
import { Tape } from '../../components/Decor';
import { Screen, ScreenHeader } from '../../components/Screen';
import { ConfirmSheet } from '../../components/Sheet';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { StatusChip, StepBars } from '../../components/Status';
import { HandNote, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { applicationStatusColors, colors } from '../../theme';
import { shortDate, timeAgo } from '../../utils/format';
import { usePullRefresh } from '../../utils/hooks';

const FILTERS: ApplicationsFilter[] = ['todas', 'en_curso', 'resueltas'];

/** Fases: enviada → en revisión → resultado. */
const stepOf = (s: Application['status']) => (s === 'enviada' ? 1 : s === 'en_revision' || s === 'preseleccionada' ? 2 : 3);

function ApplicationCard({ a, onWithdraw }: { a: Application; onWithdraw: () => void }) {
  const { nav } = useAppNavigation();
  const convs = useConversations('');
  const writer = a.conversationId ? convs.data?.find((c) => c.id === a.conversationId)?.other.name : undefined;
  const s = a.status;
  const accepted = s === 'aceptada';
  const rejected = s === 'no_seleccionada' || s === 'retirada';
  const draft = s === 'borrador';
  const fg = accepted ? colors.crema : rejected ? colors.tintaSuave : colors.tinta;
  const when = draft ? t.applications.closesOn(shortDate(a.call.closesAt)) : timeAgo(a.submittedAt ?? a.updatedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a.call.title}. ${labels.applicationStatus[s]}. ${when}`}
      onPress={() => nav.navigate('CallDetail', { id: a.call.id })}
      style={({ pressed }) => ({
        padding: 16, borderRadius: 22, opacity: pressed ? 0.92 : 1,
        backgroundColor: accepted ? colors.verde : rejected ? colors.pared : draft ? 'transparent' : colors.blanco,
        borderWidth: draft ? 2 : 0, borderStyle: 'dashed', borderColor: colors.gris,
        transform: accepted ? [{ rotate: '-1deg' }] : undefined,
      })}
    >
      {accepted ? <Tape width={70} height={20} rotate={6} style={{ top: -10, right: 40 }} color="rgba(242,183,5,0.75)" /> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusChip status={s} inverted={accepted} />
        <HandNote size={accepted ? 22 : 19} color={accepted ? colors.mostaza : fg}>{accepted ? t.applications.congrats : when}</HandNote>
      </View>
      <Txt size={20} weight="black" color={fg} style={{ marginTop: 8, letterSpacing: -0.4 }}>{a.call.title}</Txt>
      {!draft ? <Txt size={14} color={fg}>{t.applications.artworks(a.call.organization.name, a.artworks.length)}</Txt> : null}

      {isInProgress(s) ? (
        <>
          <View style={{ marginTop: 12 }}>
            <StepBars total={3} done={stepOf(s)} color={applicationStatusColors[s].bg} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            {t.applications.steps.map((x) => <HandNote key={x} size={17}>{x}</HandNote>)}
          </View>
        </>
      ) : null}

      {a.history.length > 1 ? (
        <HandNote size={17} color={fg} style={{ marginTop: 6 }}>
          {`${t.applications.history}: ${a.history.map((h) => `${labels.applicationStatus[h.status]} ${shortDate(h.at)}`).join(' · ')}`}
        </HandNote>
      ) : null}

      {a.feedback ? (
        <HandNote size={19} color={fg} style={{ marginTop: 6 }}>{t.applications.juryNote(a.feedback)}</HandNote>
      ) : null}

      {a.conversationId ? (
        <TextLink label={writer ? t.applications.wrote(writer) : t.applications.orgWrote} onPress={() => nav.navigate('Chat', { conversationId: a.conversationId! })} color={accepted ? colors.crema : colors.cobalto} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
      ) : null}
      {draft ? (
        <TextLink label={t.applications.continue} onPress={() => nav.navigate('Apply', { callId: a.call.id })} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
      ) : null}
      {isInProgress(s) ? (
        <HandLink label={t.applications.withdraw} size={19} color={colors.coralTexto} onPress={onWithdraw} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
      ) : null}
    </Pressable>
  );
}

export function ApplicationsScreen() {
  const { nav } = useAppNavigation();
  const [filter, setFilter] = useState<ApplicationsFilter>('todas');
  const q = useApplications(filter);
  const withdraw = useWithdraw();
  const [withdrawing, setWithdrawing] = useState<Application | null>(null);
  const { refreshing, onRefresh } = usePullRefresh(q.refetch);
  const counts = q.data?.counts;

  return (
    <Screen>
      <ScreenHeader title={t.applications.title} note={counts ? t.applications.summary(counts.inProgress, counts.acceptedThisYear) : undefined}>
        <ChipRow style={{ marginTop: 12 }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={t.applications.filters[f]} size="sm" radio selected={filter === f} selectedColor={colors.tinta} selectedTextColor={colors.crema} bg="transparent" onPress={() => setFilter(f)} />
          ))}
        </ChipRow>
      </ScreenHeader>
      <FlatList
        data={q.data?.items ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} colors={[colors.cobalto]} />}
        renderItem={({ item }) => <ApplicationCard a={item} onWithdraw={() => setWithdrawing(item)} />}
        ListEmptyComponent={
          q.isPending ? <LoadingState /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
            <EmptyState title={t.applications.emptyTitle} text={t.applications.emptyText} action={t.applications.emptyAction} onAction={() => nav.navigate('Tabs', { screen: 'Calls' })} />
          )
        }
      />
      <ConfirmSheet
        visible={!!withdrawing}
        title={t.applications.withdrawTitle}
        text={t.applications.withdrawText}
        confirmLabel={t.applications.withdraw}
        danger
        onClose={() => setWithdrawing(null)}
        onConfirm={async () => {
          await withdraw.mutateAsync(withdrawing!.id);
          toast.ok(t.applications.withdrawn);
        }}
      />
    </Screen>
  );
}
