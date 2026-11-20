/** Acciones sobre una obra con actualización optimista: valorar, comentar y guardar (RF-18). */
import type { Artwork } from '@portfolio/schemas';
import { Pressable, View } from 'react-native';
import { useToggleLike, useToggleSave } from '../api/hooks/artworks';
import { t } from '../i18n';
import { colors, stroke } from '../theme';
import { formatNumber } from '../utils/format';
import { IconButton } from './Button';
import { Icon } from './Icon';
import { Txt } from './Text';
import { toast } from './Toast';

function Pill({ icon, count, active, onPress, label }: { icon: 'heart' | 'chat'; count: number; active?: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={icon === 'heart' ? { selected: !!active } : undefined}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 999,
        backgroundColor: active ? colors.coral : 'transparent', borderWidth: active ? 0 : stroke, borderColor: colors.tinta,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon === 'heart' ? (active ? 'heartFilled' : 'heart') : 'chat'} size={16} strokeWidth={2} />
      <Txt size={13} weight="bold">{formatNumber(count)}</Txt>
    </Pressable>
  );
}

export function LikeButton({ artwork }: { artwork: Artwork }) {
  const like = useToggleLike();
  return (
    <Pill
      icon="heart"
      count={artwork.likes}
      active={artwork.likedByMe}
      label={t.feed.like(artwork.likes, artwork.likedByMe)}
      onPress={() => like.mutate(artwork, { onError: toast.error })}
    />
  );
}

export function CommentsButton({ artwork, onPress }: { artwork: Artwork; onPress: () => void }) {
  return <Pill icon="chat" count={artwork.comments} label={t.feed.comments(artwork.comments)} onPress={onPress} />;
}

export function SaveButton({ artwork, size = 44, variant }: { artwork: Artwork; size?: number; variant?: 'coral' | 'outline' }) {
  const save = useToggleSave();
  return (
    <IconButton
      icon={artwork.savedByMe ? 'bookmarkFilled' : 'bookmark'}
      variant={variant ?? (artwork.savedByMe ? 'coral' : 'outline')}
      size={size}
      accessibilityLabel={t.feed.save(artwork.savedByMe)}
      accessibilityState={{ selected: artwork.savedByMe }}
      onPress={() => save.mutate(artwork, { onError: toast.error })}
    />
  );
}

export function ArtworkActions({ artwork, onComments }: { artwork: Artwork; onComments: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
      <LikeButton artwork={artwork} />
      <CommentsButton artwork={artwork} onPress={onComments} />
      <View style={{ flex: 1 }} />
      <SaveButton artwork={artwork} />
    </View>
  );
}
