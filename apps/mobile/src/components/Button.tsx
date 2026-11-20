/** Botones en píldora, botones redondos de icono y enlaces manuscritos. */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, stroke, touchTarget } from '../theme';
import { Icon, type IconName } from './Icon';
import { HandNote, Txt } from './Text';

export type ButtonVariant = 'primary' | 'dark' | 'coral' | 'cream' | 'outline' | 'outlineLight' | 'danger' | 'white';

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.cobalto, fg: colors.crema },
  dark: { bg: colors.tinta, fg: colors.crema },
  coral: { bg: colors.coral, fg: colors.tinta },
  cream: { bg: colors.crema, fg: colors.tinta },
  white: { bg: colors.blanco, fg: colors.tinta, border: colors.tinta },
  outline: { bg: 'transparent', fg: colors.tinta, border: colors.tinta },
  outlineLight: { bg: 'transparent', fg: colors.crema, border: colors.crema },
  danger: { bg: 'transparent', fg: '#B23A15', border: colors.anotacion },
};

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}

const HEIGHT = { lg: 56, md: 50, sm: 44 };
const FONT = { lg: 17, md: 15, sm: 14 };

export function Button({ label, variant = 'primary', size = 'lg', icon, loading, disabled, style, flex, ...rest }: ButtonProps) {
  const v = VARIANTS[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      {...rest}
      style={({ pressed }) => [
        {
          height: HEIGHT[size],
          minHeight: touchTarget,
          paddingHorizontal: size === 'sm' ? 18 : 22,
          borderRadius: 999,
          backgroundColor: disabled && !v.border ? colors.gris : v.bg,
          borderWidth: v.border ? stroke : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : disabled && v.border ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        flex && { flex: 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          <Txt weight="black" size={FONT[size]} color={disabled && !v.border ? colors.crema : v.fg} numberOfLines={1}>
            {label}
          </Txt>
          {icon ? <Icon name={icon} size={16} color={v.fg} strokeWidth={2.4} /> : null}
        </>
      )}
    </Pressable>
  );
}

export type IconButtonVariant = 'outline' | 'cream' | 'primary' | 'coral' | 'mustard' | 'dark' | 'white' | 'green';
const ICON_VARIANTS: Record<IconButtonVariant, { bg: string; fg: string; border?: boolean }> = {
  outline: { bg: 'transparent', fg: colors.tinta, border: true },
  white: { bg: colors.blanco, fg: colors.tinta, border: true },
  cream: { bg: colors.crema, fg: colors.tinta },
  primary: { bg: colors.cobalto, fg: colors.crema },
  coral: { bg: colors.coral, fg: colors.tinta },
  mustard: { bg: colors.mostaza, fg: colors.tinta },
  dark: { bg: colors.tinta, fg: colors.crema },
  green: { bg: colors.verde, fg: colors.crema },
};

interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: IconName;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

/** Botón redondo de icono (mínimo 44 × 44, RNF-07). */
export function IconButton({ icon, variant = 'outline', size = 44, iconSize, badge, style, ...rest }: IconButtonProps) {
  const v = ICON_VARIANTS[variant];
  const dim = Math.max(size, touchTarget - 4);
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={size < touchTarget ? (touchTarget - size) / 2 : undefined}
      {...rest}
      style={({ pressed }) => [
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: v.bg,
          borderWidth: v.border ? stroke : 0,
          borderColor: colors.tinta,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : rest.disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize ?? Math.round(dim * 0.42)} color={v.fg} strokeWidth={2.3} />
      {badge ? <CountBadge n={badge} style={{ position: 'absolute', top: -4, right: -4 }} /> : null}
    </Pressable>
  );
}

/** Contador redondo coral (no leídos). */
export function CountBadge({ n, style }: { n: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Txt size={11} lineHeight={13} weight="black">{n > 99 ? '99+' : n}</Txt>
    </View>
  );
}

/** Enlace manuscrito (Caveat), p. ej. «¿olvidaste la contraseña?», «+ añadir obra». */
export function HandLink({ label, onPress, color = colors.cobalto, size = 21, style, accessibilityLabel }: {
  label: string; onPress: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [{ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.6 : 1 }, style]}
    >
      <HandNote size={size} color={color}>{label}</HandNote>
    </Pressable>
  );
}

/** Enlace de texto subrayado (cobalto). */
export function TextLink({ label, onPress, color = colors.cobalto, size = 14, style }: {
  label: string; onPress: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={({ pressed }) => [{ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.6 : 1 }, style]}>
      <Txt size={size} weight="bold" color={color} style={{ textDecorationLine: 'underline' }}>{label}</Txt>
    </Pressable>
  );
}

/** Botón genérico sin estilo con rol y etiqueta obligatorios. */
export function Touchable({ children, accessibilityLabel, style, ...rest }: PressableProps & { accessibilityLabel: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} {...rest} style={({ pressed }) => [style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}
