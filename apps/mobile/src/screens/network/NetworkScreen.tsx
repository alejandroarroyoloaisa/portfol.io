/** 16 · Mi red: solicitudes que se aceptan o ignoran, sugerencias y conexiones (RF-13, RF-15). */
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useAnswerRequest, useConnect, useConnections, useNetwork } from '../../api/hooks/users';
import { Avatar } from '../../components/Avatar';
import { Button, HandLink, IconButton } from '../../components/Button';
import { Screen, ScreenHeader, SectionTitle } from '../../components/Screen';
import { ErrorState, LoadingState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors, tiltAt } from '../../theme';
import { usePullRefresh } from '../../utils/hooks';

export function NetworkScreen() {
  const { openUser } = useAppNavigation();
  const q = useNetwork();
  const list = useConnections();
  const answer = useAnswerRequest();
  const connect = useConnect();
  const [done, setDone] = useState<Record<string, 'ok' | 'no'>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const { refreshing, onRefresh } = usePullRefresh(async () => {
    setDone({});
    await Promise.all([q.refetch(), list.refetch()]);
  });
  const n = q.data;

  return (
    <Screen>
      <ScreenHeader title={t.network.title} note={n ? t.network.summary(n.total, n.professionals) : undefined} />
      {!n ? (
        q.isPending ? <LoadingState /> : <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
          <SectionTitle style={{ marginTop: 8 }}>{t.network.requests}</SectionTitle>
          {n.requests.length === 0 ? <Txt size={14}>{t.network.noRequests}</Txt> : null}
          {n.requests.map((r) => {
            const d = done[r.id];
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 12, borderRadius: 22, backgroundColor: colors.blanco }}>
                <Avatar user={r.user} size={52} onPress={() => openUser(r.user.handle)} />
                <Pressable accessibilityRole="link" onPress={() => openUser(r.user.handle)} style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16} weight="black" numberOfLines={1}>{r.user.name}</Txt>
                  <Txt size={13} numberOfLines={1}>{[r.user.headline, r.user.city].filter(Boolean).join(' · ')}</Txt>
                  <HandNote size={18} color={colors.cobalto}>{t.network.mutual(r.mutual)}</HandNote>
                </Pressable>
                {d ? (
                  <HandNote size={20} color={d === 'ok' ? colors.verde : colors.gris} accessibilityLiveRegion="polite">{d === 'ok' ? t.network.accepted : t.network.ignored}</HandNote>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <IconButton icon="close" size={42} accessibilityLabel={`${t.network.ignore} a ${r.user.name}`} onPress={() => answer.mutate({ id: r.id, accept: false }, { onSuccess: () => setDone((x) => ({ ...x, [r.id]: 'no' })), onError: toast.error })} />
                    <IconButton icon="check" size={42} variant="green" accessibilityLabel={`${t.network.accept} a ${r.user.name}`} onPress={() => answer.mutate({ id: r.id, accept: true }, { onSuccess: () => setDone((x) => ({ ...x, [r.id]: 'ok' })), onError: toast.error })} />
                  </View>
                )}
              </View>
            );
          })}

          {n.suggestions.length ? (
            <>
              <SectionTitle>{t.network.suggestions}</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                {n.suggestions.map((s, i) => (
                  <View key={s.id} style={{ width: '48%', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 22, backgroundColor: colors.blanco, alignItems: 'center', transform: [{ rotate: `${tiltAt(i, 0.9)}deg` }] }}>
                    <Avatar user={s} size={64} onPress={() => openUser(s.handle)} />
                    <Txt size={15} weight="black" center numberOfLines={1} style={{ marginTop: 8 }}>{s.name}</Txt>
                    <Txt size={12} center numberOfLines={1}>{[s.headline?.split('·')[0].trim(), s.city].filter(Boolean).join(' · ')}</Txt>
                    <HandNote size={16} color={colors.cobalto} style={{ textAlign: 'center', marginBottom: 8 }} numberOfLines={1}>{s.reason}</HandNote>
                    <Button
                      label={sent[s.id] ? t.network.pending : t.network.connect}
                      variant={sent[s.id] ? 'dark' : 'white'}
                      size="sm"
                      style={{ alignSelf: 'stretch', height: 40 }}
                      disabled={sent[s.id]}
                      onPress={() => connect.mutate({ id: s.id, handle: s.handle }, { onSuccess: () => setSent((x) => ({ ...x, [s.id]: true })), onError: toast.error })}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle right={list.data && list.data.length > 6 ? <HandLink label={showAll ? t.common.seeLess : t.common.seeAll} onPress={() => setShowAll((v) => !v)} /> : undefined}>
            {t.network.connections}
          </SectionTitle>
          {list.data?.length === 0 ? <Txt size={14}>{t.network.noConnections}</Txt> : null}
          {(showAll ? list.data : list.data?.slice(0, 6))?.map((u) => (
            <Pressable key={u.id} accessibilityRole="button" accessibilityLabel={t.a11y.openProfile(u.name)} onPress={() => openUser(u.handle)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar user={u} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={15} weight="black" numberOfLines={1}>{u.name}</Txt>
                <Txt size={13} numberOfLines={1}>{[u.headline, u.city].filter(Boolean).join(' · ')}</Txt>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
