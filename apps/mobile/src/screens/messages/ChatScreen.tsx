/**
 * 18 · Conversación en tiempo real (RF-30, HU-07): burbujas en dos colores, obra adjunta como polaroid,
 * indicador «escribiendo…», respuestas rápidas y mensajes vistos.
 */
import type { Artwork, Message } from '@portfolio/schemas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtwork } from '../../api/hooks/artworks';
import { useMe, useMyArtworks } from '../../api/hooks/me';
import { useConversation, useMarkConversationRead, useMessages, useQuickReplies } from '../../api/hooks/messaging';
import { activeConversation, useRealtime, useTyping } from '../../api/socket';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Avatar } from '../../components/Avatar';
import { IconButton } from '../../components/Button';
import { Chip, ChipRow } from '../../components/Chip';
import { Polaroid } from '../../components/Cutout';
import { tapeColors } from '../../components/Decor';
import { Screen } from '../../components/Screen';
import { ScreenQuery } from '../../components/ScreenQuery';
import { Sheet } from '../../components/Sheet';
import { ErrorState, LoadingState } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { colors, fonts, stroke } from '../../theme';
import { dayLabel, daysBetween, hoursText } from '../../utils/format';

type Row = { kind: 'day'; id: string; label: string } | { kind: 'msg'; id: string; m: Message; mine: boolean; lastMine: boolean };

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const { nav } = useAppNavigation();
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', gap: 10 }}>
      {m.artwork ? (
        <Polaroid
          image={m.artwork.images[0]}
          title={m.artwork.title}
          caption={`${labels.technique[m.artwork.technique]} · ${m.artwork.widthCm} × ${m.artwork.heightCm} cm`}
          imageHeight={110}
          titleSize={16}
          width={200}
          rotate={mine ? 3 : -2}
          tape={{ at: 0.3, rotate: -5, color: tapeColors.coral, width: 70 }}
          onPress={() => nav.navigate('Artwork', { id: m.artwork!.id })}
          style={{ alignSelf: mine ? 'flex-end' : 'flex-start', marginTop: 8 }}
        />
      ) : null}
      {m.text ? (
        <View
          style={{
            paddingVertical: 12, paddingHorizontal: 16, backgroundColor: mine ? colors.cobalto : colors.blanco,
            borderTopLeftRadius: mine ? 28 : 4, borderTopRightRadius: mine ? 4 : 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
            boxShadow: mine ? undefined : '0px 4px 10px rgba(20,20,20,0.08)',
          }}
        >
          <Txt size={15} lineHeight={21} color={mine ? colors.crema : colors.tinta} selectable>{m.text}</Txt>
        </View>
      ) : null}
    </View>
  );
}

function AttachSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (a: Artwork) => void }) {
  const mine = useMyArtworks();
  const list = mine.data?.filter((a) => !a.draft) ?? [];
  return (
    <Sheet visible={visible} onClose={onClose} title={t.chat.attachTitle}>
      {mine.isPending ? <LoadingState /> : mine.error ? <ErrorState error={mine.error} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {list.map((a) => (
            <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={t.a11y.artwork(a.title)} onPress={() => onPick(a)} style={{ width: '31%', padding: 4, backgroundColor: colors.blanco }}>
              <ArtworkImage image={a.images[0]} title={a.title} variant="thumb" style={{ aspectRatio: 1 }} />
              <Txt size={12} weight="bold" numberOfLines={1}>{a.title}</Txt>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

function Chat({ conversationId, attachArtworkId }: { conversationId: string; attachArtworkId?: string }) {
  const { nav, openUser } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const conv = useConversation(conversationId).data!;
  const other = conv.other;
  const msgs = useMessages(conversationId);
  const quick = useQuickReplies();
  const markRead = useMarkConversationRead();
  const realtime = useRealtime();
  const typingUser = useTyping((s) => s.byConversation[conversationId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachId, setAttachId] = useState<string | undefined>(attachArtworkId);
  const attached = useArtwork(attachId ?? '');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingOn = useRef(false);

  // Leer al abrir y cada vez que llega un mensaje con la conversación en pantalla.
  useEffect(() => {
    markRead.mutate(conversationId);
    activeConversation.id = conversationId;
    activeConversation.onIncoming = (m) => {
      if (m.author.id !== me?.id) markRead.mutate(conversationId);
    };
    return () => {
      activeConversation.id = null;
      activeConversation.onIncoming = null;
      if (typingOn.current) realtime.typing(conversationId, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const chronological = useMemo(() => (msgs.data ? [...msgs.data.pages].reverse().flat() : []), [msgs.data]);
  const rows = useMemo(() => {
    const out: Row[] = [];
    let lastDay = '';
    const lastMineId = [...chronological].reverse().find((m) => m.author.id === me?.id)?.id;
    for (const m of chronological) {
      const d = new Date(m.sentAt).toDateString();
      if (d !== lastDay) {
        lastDay = d;
        out.push({ kind: 'day', id: `day-${d}`, label: dayLabel(m.sentAt) });
      }
      out.push({ kind: 'msg', id: m.id, m, mine: m.author.id === me?.id, lastMine: m.id === lastMineId });
    }
    return out.reverse(); // lista invertida: lo más reciente abajo
  }, [chronological, me?.id]);

  const last = chronological[chronological.length - 1];
  const showQuick = !text && (!last || last.author.id !== me?.id) && (quick.data?.length ?? 0) > 0;
  const otherTyping = typingUser === other.id;

  const onChangeText = (s: string) => {
    setText(s);
    if (!typingOn.current && s) {
      typingOn.current = true;
      realtime.typing(conversationId, true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingOn.current = false;
      realtime.typing(conversationId, false);
    }, 2500);
  };

  const send = async (body: string) => {
    const v = body.trim();
    if ((!v && !attachId) || sending) return;
    setSending(true);
    try {
      await realtime.send(conversationId, { text: v, artworkId: attachId });
      setText('');
      setAttachId(undefined);
      if (typingOn.current) {
        typingOn.current = false;
        realtime.typing(conversationId, false);
      }
    } catch (e) {
      toast.error(e);
    } finally {
      setSending(false);
    }
  };

  const status = otherTyping ? t.chat.typing : conv.context ? t.chat.context(conv.context.title) : t.chat.status(other.headline, other.city);

  return (
    <Screen top={false} keyboard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.verde }}>
        <IconButton icon="back" variant="cream" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />
        <Pressable accessibilityRole="link" accessibilityLabel={t.a11y.openProfile(other.name)} onPress={() => openUser(other.handle)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Avatar user={other} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Headline size={20} em={-0.02} lineHeight={23} color={colors.crema} numberOfLines={1}>{other.name}</Headline>
            <HandNote size={19} color={colors.crema} numberOfLines={1} accessibilityLiveRegion="polite">{status}</HandNote>
          </View>
        </Pressable>
      </View>

      {msgs.isPending ? (
        <LoadingState />
      ) : msgs.error && !rows.length ? (
        <ErrorState error={msgs.error} onRetry={() => void msgs.refetch()} />
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 18, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.3}
          onEndReached={() => msgs.hasNextPage && !msgs.isFetchingNextPage && void msgs.fetchNextPage()}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              {otherTyping ? <HandNote size={20} color={colors.verde}>{t.chat.typingName(other.name)}</HandNote> : null}
              {showQuick ? (
                <ChipRow scroll>
                  {quick.data!.map((r, i) => (
                    <Chip key={r} label={r} size="sm" selected={i === 0} selectedColor={colors.coral} bg="transparent" onPress={() => void send(r)} style={i === 0 ? { borderColor: colors.coral } : undefined} />
                  ))}
                </ChipRow>
              ) : null}
            </View>
          }
          ListFooterComponent={
            msgs.isFetchingNextPage ? <ActivityIndicator color={colors.cobalto} /> : rows.length === 0 ? <HandNote size={22} style={{ textAlign: 'center' }}>{t.chat.empty}</HandNote> : undefined
          }
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <View style={{ alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 2, backgroundColor: colors.tinta, transform: [{ rotate: '-1deg' }] }}>
                <HandNote size={21} color={colors.crema}>{item.label}</HandNote>
              </View>
            ) : (
              <View>
                <Bubble m={item.m} mine={item.mine} />
                {item.lastMine ? (
                  <HandNote size={16} color={colors.tintaSuave} style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                    {[daysBetween(new Date(item.m.sentAt)) === 0 ? hoursText(item.m.sentAt) : null, item.m.readAt ? t.chat.seen : null].filter(Boolean).join(' · ')}
                  </HandNote>
                ) : null}
              </View>
            )
          }
        />
      )}

      {attachId && attached.data ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.pared }}>
          <ArtworkImage image={attached.data.images[0]} title={attached.data.title} variant="thumb" style={{ width: 40, height: 40 }} />
          <HandNote size={19} style={{ flex: 1 }} numberOfLines={1}>{t.chat.attached(attached.data.title)}</HandNote>
          <IconButton icon="close" size={36} accessibilityLabel={t.chat.removeAttachment} onPress={() => setAttachId(undefined)} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 12, backgroundColor: colors.blanco }}>
        <IconButton icon="plus" variant="mustard" size={48} accessibilityLabel={t.chat.attach} onPress={() => setAttachOpen(true)} />
        <View style={{ flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: stroke, borderColor: colors.tinta }}>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder={t.chat.placeholder}
            placeholderTextColor={colors.gris}
            accessibilityLabel={t.chat.input}
            onSubmitEditing={() => void send(text)}
            returnKeyType="send"
            submitBehavior="submit"
            maxLength={2000}
            style={[{ flex: 1, minWidth: 0, height: 44, fontFamily: fonts.body, fontSize: 15, color: colors.tinta }, { outlineStyle: 'none' } as object]}
          />
        </View>
        <IconButton icon="send" variant="primary" size={48} accessibilityLabel={t.chat.send} onPress={() => void send(text)} disabled={sending || (!text.trim() && !attachId)} />
      </View>
      <AttachSheet visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={(a) => { setAttachId(a.id); setAttachOpen(false); }} />
    </Screen>
  );
}

export function ChatScreen({ route }: RootScreenProps<'Chat'>) {
  const conv = useConversation(route.params.conversationId);
  return (
    <ScreenQuery query={conv}>
      {() => <Chat conversationId={route.params.conversationId} attachArtworkId={route.params.attachArtworkId} />}
    </ScreenQuery>
  );
}

