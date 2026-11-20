/**
 * Imagen de obra con carga progresiva (RNF-02): fondo del color dominante, miniatura como
 * marcador y la variante media o grande encima. Nunca se pide el original (RNF-13).
 */
import type { ImageVariants } from '@portfolio/schemas';
import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { mediaUrl } from '../config';
import { t } from '../i18n';
import { colors } from '../theme';

interface Props {
  image?: ImageVariants | null;
  title: string;
  variant?: 'thumb' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}

export function ArtworkImage({ image, title, variant = 'medium', style, contentFit = 'cover' }: Props) {
  if (!image) {
    return <View accessibilityRole="image" accessibilityLabel={t.a11y.artwork(title)} style={[{ backgroundColor: colors.arena, width: '100%' }, style]} />;
  }
  return (
    <View style={[{ backgroundColor: image.color, width: '100%', overflow: 'hidden' }, style]}>
      <Image
        source={{ uri: mediaUrl(image[variant]) }}
        placeholder={variant !== 'thumb' ? { uri: mediaUrl(image.thumb) } : undefined}
        placeholderContentFit={contentFit}
        contentFit={contentFit}
        transition={200}
        cachePolicy="memory-disk"
        accessible
        accessibilityRole="image"
        accessibilityLabel={t.a11y.artwork(title)}
        // Se desactiva el arrastre/descarga directa en la web (RNF-13)
        draggable={false}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
