/** 05 · Inicio: muro de la red en polaroids con valoraciones, comentarios y convocatorias (RF-17, RF-18). */
import type { Artwork, FeedItem, UserSummary } from '@portfolio/schemas';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFeed } from '../../api/hooks/discovery';
import { useSummary } from '../../api/hooks/me';
import { useConnect } from '../../api/hooks/users';
import { ArtworkActions } from '../../components/ArtworkActions';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Avatar } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { CutoutCard } from '../../components/Cutout';
import { Blob, Leaf } from '../../components/Decor';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { TabScreenProps } from '../../navigation/types';
import { colors, tiltAt } from '../../theme';
import { dotDate, timeAgo } from '../../utils/format';
import { usePullRefresh, useRefreshOnFocus } from '../../utils/hooks';

const roleWord = (u: UserSummary) => u.headline?.split('·')[0].trim().toLowerCase() || null;

function ArtworkPost({ artwork, index }: { artwork: Artwork; index: number }) {
  const { nav, openUser } = useAppNavigation();
  const img = artwork.images[0];
  const ratio = img ? Math.min(1.5, Math.max(0.8, img.width / img.height)) : 1;
  const open = () => nav.navigate('Artwork', { id: artwork.id });
  return (
    <CutoutCard rotate={tiltAt(index * 2)} tape={{ at: index % 2 ? 0.15 : 0.4, rotate: index % 2 ? -5 : 4 }} style={{ marginTop: 18 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.openProfile(artwork.artist.name)}
        onPress={() => openUser(artwork.artist.handle)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, minHeight: 44 }}
      >
        <Avatar user={artwork.artist} size={40} />
        <View style={{ flex: 1 }}>
          <Txt size={14} weight="black">{artwork.artist.name}</Txt>
          <Txt size={12} numberOfLines={1}>{t.feed.byline(roleWord(artwork.artist), artwork.artist.city, timeAgo(artwork.publishedAt ?? artwork.createdAt))}</Txt>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t.a11y.artwork(artwork.title, artwork.artist.name)} onPress={open}>
        <ArtworkImage image={img} title={artwork.title} style={{ aspectRatio: ratio }} />
      </Pressable>
      {artwork.annotation ? (
        <HandNote size={24} color={colors.anotacion} rotate={-2} style={{ marginTop: 12 }}>{artwork.annotation}</HandNote>
      ) : null}
      <Pressable accessibilityRole="link" onPress={open}>
        <Headline size={34} style={{ marginTop: artwork.annotation ? 0 : 12, marginBottom: 2 }}>{artwork.title}</Headline>
      </Pressable>
      {artwork.note ? <Txt size={14} lineHeight={20} numberOfLines={3}>{artwork.note}</Txt> : null}
      <ArtworkActions artwork={artwork} onComments={() => nav.navigate('Comments', { artworkId: artwork.id, title: artwork.title })} />
    </CutoutCard>
  );
}

function CallsCutout({ count, firstClosesAt }: { count: number; firstClosesAt: string | null }) {
  const { nav } = useAppNavigation();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${t.feed.callsTitle(count)}, ${t.feed.callsNote(firstClosesAt ? dotDate(firstClosesAt) : null)}`}
      onPress={() => nav.navigate('Tabs', { screen: 'Calls' })}
      style={({ pressed }) => ({
        marginTop: 30, marginLeft: 30, marginRight: 10, paddingVertical: 16, paddingHorizontal: 18, backgroundColor: colors.cobalto,
        transform: [{ rotate: '2deg' }], opacity: pressed ? 0.9 : 1,
      })}
    >
      <Leaf color={colors.verde} width={60} height={60} style={{ left: -34, top: -20 }} />
      <Headline size={30} color={colors.crema}>{t.feed.callsTitle(count)}</Headline>
      <HandNote size={22} color={colors.crema} style={{ marginTop: 4 }}>{t.feed.callsNote(firstClosesAt ? dotDate(firstClosesAt) : null)}</HandNote>
    </Pressable>
  );
}

function Suggestions({ users }: { users: UserSummary[] }) {
  const { openUser } = useAppNavigation();
  const connect = useConnect();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  return (
    <View style={{ marginTop: 30 }}>
      <Headline size={24} em={-0.02}>{t.feed.suggestions}</Headline>
      <FlatList
        horizontal
        data={users}
        keyExtractor={(u) => u.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 12, paddingRight: 8 }}
        renderItem={({ item: u, index }) => (
          <CutoutCard rotate={tiltAt(index, 0.6)} padding={12} style={{ width: 150, alignItems: 'center' }} shadow="soft">
            <Avatar user={u} size={56} onPress={() => openUser(u.handle)} />
            <Txt size={14} weight="black" center numberOfLines={1} style={{ marginTop: 8 }}>{u.name}</Txt>
            <Txt size={12} center numberOfLines={1}>{u.headline ?? u.city ?? ''}</Txt>
            <Button
              label={sent[u.id] ? t.network.pending : t.network.connect}
              variant={sent[u.id] ? 'dark' : 'white'}
              size="sm"
              disabled={sent[u.id]}
              style={{ marginTop: 10, alignSelf: 'stretch', height: 40 }}
              onPress={() => connect.mutate({ id: u.id }, { onSuccess: () => setSent((s) => ({ ...s, [u.id]: true })), onError: toast.error })}
            />
          </CutoutCard>
        )}
      />
    </View>
  );
}

export function FeedScreen({ navigation }: TabScreenProps<'Feed'>) {
  const feed = useFeed();
  const summary = useSummary();
  useRefreshOnFocus(summary.refetch);
  const { refreshing, onRefresh } = usePullRefresh(async () => {
    await Promise.all([feed.refetch(), summary.refetch()]);
  });
  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const unreadN = summary.data?.unreadNotifications ?? 0;
  const unreadM = summary.data?.unreadMessages ?? 0;

  const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
    if (item.kind === 'artwork') return <ArtworkPost artwork={item.artwork} index={index} />;
    if (item.kind === 'calls') return item.count > 0 ? <CallsCutout count={item.count} firstClosesAt={item.firstClosesAt} /> : null;
    return item.users.length ? <Suggestions users={item.users} /> : null;
  };

  return (
    <Screen decor={<Blob color={colors.coral} size={170} style={{ top: -30, right: -40 }} />}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10 }}>
        <Headline size={44} lineHeight={44} accessibilityLabel={t.common.appName}>
          Portfol<Headline size={44} lineHeight={44} color={colors.cobalto}>.io</Headline>
        </Headline>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <IconButton icon="bell" variant="cream" style={{ borderWidth: 2, borderColor: colors.tinta }} badge={unreadN} accessibilityLabel={t.feed.notifications(unreadN)} onPress={() => navigation.navigate('Notifications')} />
          <IconButton icon="chat" variant="primary" badge={unreadM} accessibilityLabel={t.feed.messages(unreadM)} onPress={() => navigation.navigate('Inbox')} />
        </View>
      </View>
      {feed.isPending ? (
        <LoadingState />
      ) : feed.error && !items.length ? (
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} colors={[colors.cobalto]} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
          ListEmptyComponent={
            <EmptyState title={t.feed.emptyTitle} text={t.feed.emptyText} action={t.feed.emptyAction} onAction={() => navigation.navigate('Explore')} />
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <ActivityIndicator color={colors.cobalto} style={{ marginTop: 24 }} />
            ) : items.length && !feed.hasNextPage ? (
              <HandNote size={20} color={colors.gris} style={{ textAlign: 'center', marginTop: 28 }}>{t.feed.end}</HandNote>
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}
