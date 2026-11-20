/** 17 · Bandeja: conversaciones con no leídos y buscador (RF-29). */
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useSummary } from '../../api/hooks/me';
import { useConversations } from '../../api/hooks/messaging';
import { Avatar } from '../../components/Avatar';
import { CountBadge } from '../../components/Button';
import { Blob } from '../../components/Decor';
import { Icon } from '../../components/Icon';
import { Screen, ScreenHeader } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors, fonts, stroke } from '../../theme';
import { inboxTime } from '../../utils/format';
import { useDebounced, usePullRefresh, useRefreshOnFocus } from '../../utils/hooks';

export function InboxScreen() {
  const { nav } = useAppNavigation();
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const convs = useConversations(dq);
  const summary = useSummary();
  useRefreshOnFocus(convs.refetch);
  const { refreshing, onRefresh } = usePullRefresh(() => Promise.all([convs.refetch(), summary.refetch()]));
  const unread = summary.data?.unreadMessages ?? 0;

  return (
    <Screen decor={<Blob color={colors.cobalto} size={150} style={{ top: -30, right: -30 }} />}>
      <ScreenHeader title={t.inbox.title} note={t.inbox.unread(unread)} noteColor={colors.anotacion} backVariant="white">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, marginTop: 12, paddingHorizontal: 16, borderRadius: 999, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: colors.blanco }}>
          <Icon name="search" size={18} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.inbox.placeholder}
            placeholderTextColor={colors.gris}
            accessibilityLabel={t.inbox.search}
            style={[{ flex: 1, minWidth: 0, height: 44, fontFamily: fonts.body, fontSize: 15, color: colors.tinta }, { outlineStyle: 'none' } as object]}
          />
        </View>
      </ScreenHeader>
      <FlatList
        data={convs.data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} colors={[colors.cobalto]} />}
        renderItem={({ item: c }) => {
          const unreadRow = c.unread > 0;
          const last = c.lastMessage;
          const preview = last ? `${last.mine ? `${t.common.you}: ` : ''}${last.text || t.inbox.sentArtwork}` : '';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[c.other.name, unreadRow ? t.a11y.unread(c.unread) : null, preview, last ? inboxTime(last.sentAt) : null].filter(Boolean).join('. ')}
              onPress={() => nav.navigate('Chat', { conversationId: c.id })}
              style={({ pressed }) => ({
                flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 22,
                backgroundColor: unreadRow ? colors.blanco : 'transparent', opacity: pressed ? 0.85 : 1,
              })}
            >
              <Avatar user={c.other} size={54} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Txt size={16} weight="black" numberOfLines={1} style={{ flexShrink: 1 }}>{c.other.name}</Txt>
                  {last ? <HandNote size={18}>{inboxTime(last.sentAt)}</HandNote> : null}
                </View>
                <Txt size={14} weight={unreadRow ? 'bold' : 'medium'} numberOfLines={1}>{preview}</Txt>
                {c.context ? <HandNote size={17} color={colors.cobalto} numberOfLines={1}>{t.inbox.about(c.context.title)}</HandNote> : null}
              </View>
              {unreadRow ? <CountBadge n={c.unread} style={{ width: 22, height: 22, borderRadius: 11 }} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          convs.isPending ? <LoadingState /> : convs.error ? <ErrorState error={convs.error} onRetry={() => void convs.refetch()} /> : (
            <EmptyState title={t.inbox.emptyTitle} text={dq ? t.inbox.noResults : t.inbox.emptyText} color={colors.coral} />
          )
        }
      />
    </Screen>
  );
}
