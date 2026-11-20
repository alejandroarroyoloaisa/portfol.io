/** Recortes de papel: tarjeta blanca girada con sombra y cinta, y polaroid de obra. */
import type { Artwork, ImageVariants } from '@portfolio/schemas';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { t } from '../i18n';
import { colors, shadows } from '../theme';
import { shortName } from '../utils/format';
import { ArtworkImage } from './ArtworkImage';
import { Tape } from './Decor';
import { HandNote, Headline } from './Text';

interface CutoutProps {
  children: ReactNode;
  rotate?: number;
  /** Cinta adhesiva arriba: posición horizontal (0–1) y color. */
  tape?: { at?: number; rotate?: number; color?: string; width?: number } | false;
  padding?: number;
  bg?: string;
  shadow?: keyof typeof shadows | false;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function CutoutCard({ children, rotate = 0, tape, padding = 14, bg = colors.blanco, shadow = 'card', style, onPress, accessibilityLabel }: CutoutProps) {
  const content = (
    <>
      {tape ? (
        <Tape
          width={tape.width ?? 90}
          rotate={tape.rotate ?? 4}
          color={tape.color}
          style={{ top: -12, left: `${Math.round((tape.at ?? 0.4) * 100)}%` }}
        />
      ) : null}
      {children}
    </>
  );
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: bg, padding, transform: [{ rotate: `${rotate}deg` }], boxShadow: shadow ? shadows[shadow] : undefined },
    style,
  ];
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.9 }]}>
      {content}
    </Pressable>
  );
}

interface PolaroidProps {
  image?: ImageVariants | null;
  title?: string;
  /** Nombre manuscrito bajo el título (p. ej. «L. Montero»). */
  caption?: string;
  rotate?: number;
  imageHeight?: number;
  /** Proporción de la imagen cuando no se fija la altura. */
  aspect?: number;
  width?: number | `${number}%`;
  padding?: number;
  titleSize?: number;
  tape?: CutoutProps['tape'];
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Obra «colgada» como polaroid. */
export function Polaroid({
  image, title, caption, rotate = 0, imageHeight, aspect, width, padding = 8, titleSize = 20, tape, onPress, accessibilityLabel, style, children,
}: PolaroidProps) {
  return (
    <CutoutCard
      rotate={rotate}
      padding={padding}
      shadow="polaroid"
      tape={tape}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? (title ? t.a11y.artwork(title) : undefined)}
      style={[{ width, paddingBottom: title || caption ? padding + 2 : padding }, style]}
    >
      <ArtworkImage image={image} title={title ?? ''} style={imageHeight ? { height: imageHeight } : { aspectRatio: aspect ?? 1 }} />
      {title ? <Headline size={titleSize} lineHeight={Math.round(titleSize * 1.1)} style={{ marginTop: 6 }} numberOfLines={2}>{title}</Headline> : null}
      {caption ? <HandNote size={18}>{caption}</HandNote> : null}
      {children}
    </CutoutCard>
  );
}

/** Polaroid de una obra con su autora abreviada. */
export function ArtworkPolaroid({ artwork, ...rest }: { artwork: Artwork } & Omit<PolaroidProps, 'image' | 'title'>) {
  return (
    <Polaroid
      image={artwork.images[0]}
      title={artwork.title}
      caption={rest.caption ?? shortName(artwork.artist.name)}
      accessibilityLabel={t.a11y.artwork(artwork.title, artwork.artist.name)}
      {...rest}
    />
  );
}
