/** Formas decorativas de los recortes: mancha (blob), hoja, círculo y cinta adhesiva. */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const BLOB = 'M50 4 C58 18 72 10 74 26 C88 24 92 40 80 48 C96 58 84 74 70 70 C72 88 56 96 50 82 C44 96 28 88 30 70 C16 74 4 58 20 48 C8 40 12 24 26 26 C28 10 42 18 50 4Z';
const LEAF = 'M20 100 C10 70 40 60 25 35 C15 15 40 5 45 0 L55 0 C50 15 30 25 40 45 C55 70 30 80 40 100Z';

interface ShapeProps {
  color: string;
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Mancha recortada (flor de 8 lóbulos) de las esquinas. Siempre decorativa. */
export function Blob({ color, size = 170, width, height, style }: ShapeProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute' }, style]}>
      <Svg width={width ?? size} height={height ?? size} viewBox="0 0 100 100">
        <Path d={BLOB} fill={color} />
      </Svg>
    </View>
  );
}

/** Hoja vertical (recorte alargado). */
export function Leaf({ color, width = 90, height = 120, style }: ShapeProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute' }, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path d={LEAF} fill={color} />
      </Svg>
    </View>
  );
}

export function Dot({ color, size = 70, style }: ShapeProps) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

interface TapeProps {
  width?: number;
  height?: number;
  rotate?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Cinta adhesiva translúcida que «sujeta» los recortes. */
export function Tape({ width = 90, height = 24, rotate = 4, color = colors.cinta, style }: TapeProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', width, height, backgroundColor: color, transform: [{ rotate: `${rotate}deg` }], zIndex: 2 }, style]}
    />
  );
}

export const tapeColors = {
  mostaza: 'rgba(242,183,5,0.7)',
  coral: 'rgba(255,107,74,0.7)',
  crema: 'rgba(255,244,224,0.75)',
  cobalto: 'rgba(35,64,232,0.55)',
};
