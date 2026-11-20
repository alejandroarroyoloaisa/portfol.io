/** Avatar con foto o iniciales sobre el color de la persona (avatarColor) y forma orgánica. */
import type { UserSummary } from '@portfolio/schemas';
import { Image } from 'expo-image';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { mediaUrl } from '../config';
import { t } from '../i18n';
import { avatarColor, onColor, shapeRadii, type Shape } from '../theme';
import { Txt } from './Text';

type Person = Pick<UserSummary, 'id' | 'name' | 'initials' | 'avatarUrl' | 'role'>;

/** Las organizaciones llevan forma de recorte cuadrado; las personas, círculo o mancha. */
export function shapeFor(p: Pick<UserSummary, 'role' | 'id'>): Shape {
  if (p.role === 'galeria' || p.role === 'institucion') return 'square';
  const h = p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1);
  return h % 3 === 0 ? 'blob' : 'circle';
}

interface Props {
  user: Person;
  size?: number;
  shape?: Shape;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Avatar en marco polaroid (perfil). */
  square?: boolean;
  fontSize?: number;
}

export function Avatar({ user, size = 44, shape, color, onPress, style, square, fontSize }: Props) {
  const bg = color ?? avatarColor(user.id);
  const radii = square ? {} : shapeRadii(shape ?? shapeFor(user), size);
  const inner = (
    <View
      accessible={!onPress}
      accessibilityRole="image"
      accessibilityLabel={t.a11y.avatar(user.name)}
      style={[{ width: square ? '100%' : size, height: square ? '100%' : size, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, radii, style]}
    >
      {user.avatarUrl ? (
        <Image source={{ uri: mediaUrl(user.avatarUrl) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Txt weight="black" size={fontSize ?? Math.max(12, Math.round(size * 0.32))} color={onColor(bg)} style={{ letterSpacing: -0.5 }}>
          {user.initials}
        </Txt>
      )}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t.a11y.openProfile(user.name)} onPress={onPress} hitSlop={4}>
      {inner}
    </Pressable>
  );
}
