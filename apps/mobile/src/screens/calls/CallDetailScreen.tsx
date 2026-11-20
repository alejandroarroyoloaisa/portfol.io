/** 13 · Detalle de convocatoria: encaje, datos clave, requisitos, calendario y bases (RF-23). */
import type { CallDetail } from '@portfolio/schemas';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '../../api/hooks/calls';
import { useMe } from '../../api/hooks/me';
import { useStartConversation } from '../../api/hooks/messaging';
import { Button, IconButton, TextLink } from '../../components/Button';
import { Blob } from '../../components/Decor';
import { Screen, SectionTitle } from '../../components/Screen';
import { ScreenQuery } from '../../components/ScreenQuery';
import { MatchBox, StatusChip } from '../../components/Status';
import { HandNote, Headline, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { useSavedCalls } from '../../store/savedCalls';
import { callTypeColors, colors } from '../../theme';
import { longDate, timelineDate } from '../../utils/format';
import { usePullRefresh } from '../../utils/hooks';

const DOTS = [colors.coral, colors.mostaza, colors.verde, colors.cobalto];

function Fact({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ width: '48.5%', padding: 12, borderRadius: 18, backgroundColor: colors.blanco }}>
      <HandNote size={19}>{label}</HandNote>
      <Txt size={big ? 22 : 18} weight="black" style={{ letterSpacing: -0.4 }}>{value}</Txt>
    </View>
  );
}

function Detail({ call }: { call: CallDetail }) {
  const { nav, openUser } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const q = useCall(call.id);
  const { refreshing, onRefresh } = usePullRefresh(q.refetch);
  const savedIds = useSavedCalls((s) => s.ids);
  const toggleSaved = useSavedCalls((s) => s.toggle);
  const start = useStartConversation();
  const saved = savedIds.includes(call.id);
  const look = callTypeColors[call.type] ?? callTypeColors.premio;
  const headerBg = look.bg === colors.blanco ? colors.coral : look.bg;
  const fg = look.bg === colors.blanco ? colors.tinta : look.fg;
  const closed = call.daysLeft < 0 || call.status !== 'abierta';
  const isArtist = me?.role === 'artista';
  const app = call.myApplication;

  const footer = (() => {
    if (!isArtist) {
      return (
        <Button
          label={t.call.writeOrg}
          variant="dark"
          loading={start.isPending}
          onPress={() => start.mutate({ userId: call.organization.id, callId: call.id }, { onSuccess: (c) => nav.navigate('Chat', { conversationId: c.id }), onError: toast.error })}
        />
      );
    }
    if (app && app.status !== 'borrador') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <StatusChip status={app.status} style={{ alignSelf: 'center' }} />
          <Button label={t.call.viewApplication} variant="dark" flex onPress={() => nav.navigate('Applications')} />
        </View>
      );
    }
    if (closed) return <Button label={t.call.closedCta} variant="dark" disabled />;
    return <Button label={app ? t.call.continueDraft : t.call.prepare} variant="dark" onPress={() => nav.navigate('Apply', { callId: call.id })} />;
  })();

  return (
    <Screen top={false} footer={footer}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 26, backgroundColor: headerBg, overflow: 'hidden' }}>
          <Blob color={headerBg === colors.mostaza ? colors.coral : colors.mostaza} size={180} style={{ right: -30, bottom: -40 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton icon="back" variant="cream" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />
            <IconButton
              icon={saved ? 'bookmarkFilled' : 'bookmark'}
              variant="cream"
              accessibilityLabel={saved ? t.call.unsave : t.call.save}
              accessibilityState={{ selected: saved }}
              onPress={() => toggleSaved(call.id)}
            />
          </View>
          <HandNote size={23} color={fg} style={{ marginTop: 22 }}>
            {closed ? t.calls.closed : t.call.kicker(labels.callType[call.type], longDate(call.closesAt))}
          </HandNote>
          <Headline size={40} em={-0.04} lineHeight={39} color={fg}>{call.title}</Headline>
          <Pressable accessibilityRole="link" onPress={() => openUser(call.organization.handle)} style={{ marginTop: 8, alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
            <Txt size={15} weight="bold" color={fg} style={{ textDecorationLine: 'underline' }}>
              {[call.organization.name, call.city, call.edition].filter(Boolean).join(' · ')}
            </Txt>
          </Pressable>
        </View>

        <View style={{ padding: 18 }}>
          {call.match ? <MatchBox match={call.match} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 16 }}>
            <Fact label={t.call.prize} value={call.prize ?? '—'} big />
            <Fact label={t.call.deadline} value={t.call.days(call.daysLeft)} big />
            <Fact label={t.call.format} value={t.call.maxFormat(call.maxFormatCm)} />
            <Fact label={call.places ? t.call.places : t.call.scope} value={call.places ? String(call.places) : labels.scope[call.scope]} />
          </View>

          {call.summary ? <Txt size={15} lineHeight={22} style={{ marginTop: 18 }}>{call.summary}</Txt> : null}

          {call.requirements.length ? (
            <>
              <SectionTitle size={21}>{t.call.whatToSend}</SectionTitle>
              {call.requirements.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                  <Txt size={15} weight="black">•</Txt>
                  <Txt size={15} lineHeight={23} style={{ flex: 1 }}>{r}</Txt>
                </View>
              ))}
            </>
          ) : null}

          {call.timeline.length ? (
            <>
              <SectionTitle size={21}>{t.call.timeline}</SectionTitle>
              <View style={{ marginLeft: 8, paddingLeft: 18, borderLeftWidth: 3, borderColor: colors.tinta }}>
                {call.timeline.map((s, i) => (
                  <View key={i} style={{ paddingBottom: i === call.timeline.length - 1 ? 0 : 12 }}>
                    <View style={{ position: 'absolute', left: -28.5, top: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: DOTS[i % DOTS.length], borderWidth: 2, borderColor: colors.tinta }} />
                    <HandNote size={20}>{timelineDate(s.date)}</HandNote>
                    <Txt size={15} weight="bold">{s.text}</Txt>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {call.basesUrl ? (
            <TextLink label={t.call.bases} onPress={() => void Linking.openURL(call.basesUrl!)} style={{ marginTop: 18, alignSelf: 'flex-start' }} />
          ) : null}
          {call.applicationsCount ? <HandNote size={19} color={colors.tintaSuave} style={{ marginTop: 8 }}>{t.call.applications(call.applicationsCount)}</HandNote> : null}
          {!isArtist ? <Txt size={13} color={colors.tintaSuave} style={{ marginTop: 8 }}>{t.call.onlyArtists}</Txt> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

export function CallDetailScreen({ route }: RootScreenProps<'CallDetail'>) {
  const q = useCall(route.params.id);
  return <ScreenQuery query={q}>{(c) => <Detail call={c} />}</ScreenQuery>;
}
