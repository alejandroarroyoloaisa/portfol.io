/** 20 · Mi perfil: perfil completado, accesos a red, solicitudes, mensajes y estadísticas, y el cuaderno (RF-07). */
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useMe, useMyArtworks, useStats, useSummary } from '../../api/hooks/me';
import { Button, HandLink, IconButton } from '../../components/Button';
import { Blob } from '../../components/Decor';
import { NotebookGrid, ProfileHero } from '../../components/ProfileParts';
import { Screen } from '../../components/Screen';
import { EmptyState, LoadingState } from '../../components/States';
import { ProgressBar } from '../../components/Status';
import { HandNote, Headline, Txt } from '../../components/Text';
import { labels, t } from '../../i18n';
import type { TabScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { formatDelta, formatNumber } from '../../utils/format';
import { usePullRefresh, useRefreshOnFocus } from '../../utils/hooks';

function Tile({ value, label, onPress, bg = colors.blanco }: { value: string; label: string; onPress: () => void; bg?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      onPress={onPress}
      style={({ pressed }) => ({ width: '48.5%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: bg, opacity: pressed ? 0.85 : 1 })}
    >
      <Headline size={28} lineHeight={32} em={-0.03}>{value}</Headline>
      <HandNote size={19}>{label}</HandNote>
    </Pressable>
  );
}

export function MyProfileScreen({ navigation }: TabScreenProps<'MyProfile'>) {
  const me = useMe();
  const summary = useSummary();
  const artworks = useMyArtworks();
  const stats = useStats('30d');
  useRefreshOnFocus(summary.refetch);
  const { refreshing, onRefresh } = usePullRefresh(() => Promise.all([me.refetch(), summary.refetch(), artworks.refetch(), stats.refetch()]));
  const m = me.data;
  if (!m) return <Screen><LoadingState /></Screen>;
  const s = summary.data;
  const isArtist = m.role === 'artista';
  const techniques = m.techniques.slice(0, 2).map((x) => labels.technique[x]).join(' y ');
  const line = [m.headline?.split('·')[0].trim() || labels.role[m.role], techniques, m.location?.city ?? m.city].filter(Boolean).join(' · ');

  return (
    <Screen top={false}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
        <ProfileHero
          user={m}
          bg={colors.coral}
          height={270}
          nameColor={colors.tinta}
          avatarColor={colors.cobalto}
          decor={<Blob color={colors.cobalto} size={190} style={{ right: -30, top: 10 }} />}
          right={<IconButton icon="settings" variant="cream" accessibilityLabel={t.me.settings} onPress={() => navigation.navigate('Settings')} />}
        />
        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 }}>
          <Txt size={15} weight="bold">{line}</Txt>

          <View style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tinta }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <HandNote size={21}>{t.me.completion(m.completion)}</HandNote>
              {m.completion < 100 ? <HandLink label={t.me.complete} onPress={() => navigation.navigate('EditProfile')} /> : null}
            </View>
            <ProgressBar value={m.completion} style={{ marginTop: 6 }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button label={t.me.edit} variant="dark" size="md" flex onPress={() => navigation.navigate('EditProfile')} />
            <Button label={t.me.stats} variant="outline" size="md" flex onPress={() => navigation.navigate('Stats')} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 16 }}>
            <Tile value={formatNumber(m.counts.connections)} label={t.me.network(s?.pendingConnections ?? 0)} onPress={() => navigation.navigate('Network')} />
            {isArtist ? <Tile value={String(s?.applicationsInProgress ?? 0)} label={t.me.applications} onPress={() => navigation.navigate('Applications')} /> : null}
            <Tile value={String(s?.unreadMessages ?? 0)} label={t.me.unread} onPress={() => navigation.navigate('Inbox')} />
            <Tile value={stats.data ? formatDelta(stats.data.visitsDelta) : '—'} label={t.me.visits} bg={colors.mostaza} onPress={() => navigation.navigate('Stats')} />
            {!isArtist ? <Tile value={String(m.counts.followers)} label={t.profile.counts.followers} onPress={() => navigation.navigate('Network')} /> : null}
          </View>

          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Saved')} style={{ marginTop: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.blanco }}>
            <Txt size={15} weight="bold">{t.me.saved}</Txt>
            <Txt size={15}>›</Txt>
          </Pressable>

          {isArtist ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
                <Headline size={26} em={-0.03}>{t.me.notebook}</Headline>
                <HandLink label={t.me.add} onPress={() => navigation.navigate('Publish')} />
              </View>
              {artworks.data?.length ? (
                <NotebookGrid
                  artworks={artworks.data}
                  badge={(a) => (a.draft ? t.me.draft : null)}
                  onOpen={(a) => (a.draft ? navigation.navigate('Publish', { artworkId: a.id }) : navigation.navigate('Artwork', { id: a.id }))}
                />
              ) : artworks.isPending ? (
                <LoadingState />
              ) : (
                <EmptyState title={t.me.notebook} text={t.me.emptyNotebook} action={t.me.add} onAction={() => navigation.navigate('Publish')} color={colors.coral} />
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
