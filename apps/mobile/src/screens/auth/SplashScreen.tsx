/** 01 · Bienvenida: collage de obras, frase manuscrita y dos acciones (RF-01). */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Button } from '../../components/Button';
import { Blob, Dot, Leaf, Tape } from '../../components/Decor';
import { HandNote, Headline, Txt } from '../../components/Text';
import { t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors, shadows } from '../../theme';

function ArtA() {
  return (
    <Svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <Rect width={100} height={100} fill={colors.coral} />
      <Rect y={14} width={100} height={10} fill={colors.crema} />
      <Rect y={38} width={100} height={10} fill={colors.crema} />
      <Rect y={62} width={100} height={10} fill={colors.crema} />
      <Circle cx={68} cy={58} r={15} fill={colors.cobalto} />
    </Svg>
  );
}

function ArtB() {
  return (
    <Svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <Rect width={100} height={100} fill="#C8962E" />
      <Rect x={8} y={9} width={84} height={40} fill="#E7C27A" />
      <Rect x={8} y={54} width={84} height={37} fill="#8C3B1F" />
    </Svg>
  );
}

export function SplashScreen({ navigation }: RootScreenProps<'Splash'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.cobalto, overflow: 'hidden' }}>
      <Blob color={colors.coral} size={240} style={{ top: -40, right: -50 }} />
      <Leaf color={colors.verde} width={110} height={190} style={{ left: -20, top: 300 }} />
      <Dot color={colors.mostaza} size={70} style={{ right: 30, top: insets.top + 395 }} />

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: insets.top + 110, left: 0, right: 0, height: 260 }}>
        <View style={{ position: 'absolute', left: 60, top: 0, width: 150, height: 180, padding: 8, backgroundColor: colors.blanco, transform: [{ rotate: '-7deg' }], boxShadow: shadows.deep }}>
          <ArtA />
          <Tape width={70} height={20} rotate={5} color="rgba(242,183,5,0.75)" style={{ top: -10, left: 40 }} />
        </View>
        <View style={{ position: 'absolute', left: 180, top: 60, width: 140, height: 160, padding: 8, backgroundColor: colors.blanco, transform: [{ rotate: '6deg' }], boxShadow: shadows.deep }}>
          <ArtB />
        </View>
      </View>

      <View style={{ flex: 1, zIndex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <HandNote size={28} color={colors.mostaza} rotate={-3}>{t.splash.tagline}</HandNote>
        <Headline size={66} color={colors.crema} em={-0.045} lineHeight={64} style={{ marginTop: 4 }}>{t.common.appName}</Headline>
        <Txt size={16} color={colors.crema} lineHeight={23} style={{ marginTop: 14, marginBottom: 26 }}>{t.splash.pitch}</Txt>
        <Button label={t.splash.create} variant="coral" onPress={() => navigation.navigate('Auth', { mode: 'registro' })} />
        <Button label={t.splash.login} variant="outlineLight" onPress={() => navigation.navigate('Auth', { mode: 'acceso' })} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}
