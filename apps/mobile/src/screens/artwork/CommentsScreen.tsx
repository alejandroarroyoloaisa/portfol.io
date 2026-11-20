/** Comentarios de una obra (RF-18). */
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useAddComment, useComments } from '../../api/hooks/artworks';
import { Avatar } from '../../components/Avatar';
import { IconButton } from '../../components/Button';
import { Screen, ScreenHeader } from '../../components/Screen';
import { EmptyState, QueryView } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { timeAgo } from '../../utils/format';

export function CommentsScreen({ route }: RootScreenProps<'Comments'>) {
  const { artworkId, title } = route.params;
  const comments = useComments(artworkId);
  const add = useAddComment(artworkId);
  const [text, setText] = useState('');
  const { openUser } = useAppNavigation();

  const send = () => {
    const v = text.trim();
    if (!v) return;
    add.mutate(v, { onSuccess: () => setText(''), onError: toast.error });
  };

  return (
    <Screen
      keyboard
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextField value={text} onChangeText={setText} placeholder={t.comments.placeholder} accessibilityLabel={t.comments.placeholder} containerStyle={{ flex: 1 }} height={48} onSubmitEditing={send} returnKeyType="send" maxLength={500} />
          <IconButton icon="send" variant="primary" size={48} accessibilityLabel={t.comments.send} onPress={send} disabled={add.isPending || !text.trim()} />
        </View>
      }
    >
      <ScreenHeader title={t.comments.title} note={`«${title}»`} titleSize={40} />
      <QueryView query={comments}>
        {(list) => (
          <FlatList
            data={list}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 18, gap: 10 }}
            ListEmptyComponent={<EmptyState title={t.comments.title} text={t.comments.empty} />}
            renderItem={({ item: c }) => (
              <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 22, backgroundColor: colors.blanco }}>
                <Avatar user={c.author} size={40} onPress={() => openUser(c.author.handle)} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Txt size={15} weight="black" style={{ flexShrink: 1 }}>{c.author.name}</Txt>
                    <HandNote size={18}>{timeAgo(c.createdAt)}</HandNote>
                  </View>
                  <Txt size={15} lineHeight={21}>{c.text}</Txt>
                </View>
              </View>
            )}
          />
        )}
      </QueryView>
    </Screen>
  );
}
