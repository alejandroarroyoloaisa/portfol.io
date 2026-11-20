/**
 * Tipografía del sistema «Recortes»: Bricolage Grotesque para todo el texto y titulares,
 * Caveat para las anotaciones manuscritas. El texto respeta el tamaño de letra del sistema
 * (allowFontScaling), con un tope en los titulares gigantes para que no rompan la maqueta.
 */
import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, tight } from '../theme';

type Weight = 'medium' | 'bold' | 'black';
const FAMILY: Record<Weight, string> = { medium: fonts.body, bold: fonts.bold, black: fonts.display };

export interface TxtProps extends TextProps {
  size?: number;
  weight?: Weight;
  color?: string;
  center?: boolean;
  lineHeight?: number;
}

/** Texto de cuerpo. */
export function Txt({ size = 14, weight = 'medium', color = colors.tinta, center, lineHeight, style, ...rest }: TxtProps) {
  const s: TextStyle = {
    fontFamily: FAMILY[weight],
    fontSize: size,
    lineHeight: lineHeight ?? Math.round(size * 1.4),
    color,
    textAlign: center ? 'center' : undefined,
  };
  return <Text maxFontSizeMultiplier={2} {...rest} style={[s, style]} />;
}

/** Titular grande y apretado (Bricolage 800, ≈ −0,03 em). */
export function Headline({ size = 44, color = colors.tinta, em = -0.035, lineHeight, style, ...rest }: TxtProps & { em?: number }) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        { fontFamily: fonts.display, fontSize: size, lineHeight: lineHeight ?? Math.round(size * 0.98), letterSpacing: tight(size, em), color },
        style,
      ]}
    />
  );
}

/** Anotación manuscrita (Caveat), ligeramente girada. */
export function HandNote({
  size = 22, color = colors.tinta, rotate = 0, semi, style, lineHeight, ...rest
}: TxtProps & { rotate?: number; semi?: boolean }) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        {
          fontFamily: semi ? fonts.handSemi : fonts.hand,
          fontSize: size,
          lineHeight: lineHeight ?? Math.round(size * 1.1),
          color,
        },
        rotate ? { transform: [{ rotate: `${rotate}deg` }], transformOrigin: 'left center' } : null,
        style,
      ]}
    />
  );
}
