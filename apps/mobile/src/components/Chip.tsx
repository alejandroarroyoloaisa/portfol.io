/** Chips seleccionables, etiquetas fijas, interruptores y selectores segmentados. */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, stroke } from '../theme';
import { Icon, type IconName } from './Icon';
import { Txt } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Fondo cuando está activo (coral por defecto, como en las maquetas). */
  selectedColor?: string;
  selectedTextColor?: string;
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Botón de una sola opción (radio) en lugar de conmutador. */
  radio?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  bg?: string;
}

export function Chip({
  label, selected, onPress, selectedColor = colors.coral, selectedTextColor = colors.tinta, size = 'md', icon, radio, accessibilityLabel, style, bg,
}: ChipProps) {
  const fg = selected ? selectedTextColor : colors.tinta;
  return (
    <Pressable
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { checked: !!selected } : { selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={size === 'sm' ? 4 : 2}
      style={({ pressed }) => [
        {
          minHeight: size === 'sm' ? 36 : 40,
          paddingHorizontal: size === 'sm' ? 14 : 16,
          borderRadius: 999,
          borderWidth: stroke,
          borderColor: colors.tinta,
          backgroundColor: selected ? selectedColor : bg ?? colors.blanco,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} strokeWidth={2.4} /> : null}
      <Txt size={size === 'sm' ? 13 : 14} weight="bold" color={fg}>{label}</Txt>
    </Pressable>
  );
}

/** Fila envolvente de chips. */
export function ChipRow({ children, style, scroll }: { children: ReactNode; style?: StyleProp<ViewStyle>; scroll?: boolean }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingRight: 18 }, style]}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

/**
 * Selección múltiple (o única con `single`) sobre un catálogo: técnicas, temas, formatos…
 * Si se alcanza `max`, los chips no elegidos no cambian (como en la solicitud, CU-07 4a).
 */
export function ChoiceChips<K extends string>({
  options, labels, value, onChange, max, single, selectedColor, selectedTextColor, size, capitalize = true,
}: {
  options: readonly K[];
  labels: Record<K, string>;
  value: K[];
  onChange: (v: K[]) => void;
  max?: number;
  single?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  size?: 'md' | 'sm';
  capitalize?: boolean;
}) {
  return (
    <ChipRow>
      {options.map((k) => {
        const on = value.includes(k);
        const label = capitalize ? labels[k].charAt(0).toUpperCase() + labels[k].slice(1) : labels[k];
        return (
          <Chip
            key={k}
            label={label}
            selected={on}
            radio={single}
            size={size}
            selectedColor={selectedColor}
            selectedTextColor={selectedTextColor}
            onPress={() => {
              if (single) onChange(on ? [] : [k]);
              else if (on) onChange(value.filter((x) => x !== k));
              else if (!max || value.length < max) onChange([...value, k]);
            }}
          />
        );
      })}
    </ChipRow>
  );
}

/** Etiqueta fija en píldora (ficha técnica, «acepta encargos»…). */
export function Tag({ label, bg = colors.coral, color = colors.tinta, outline, small, style }: {
  label: string; bg?: string; color?: string; outline?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          paddingHorizontal: small ? 10 : 14,
          paddingVertical: small ? 4 : 7,
          borderRadius: 999,
          backgroundColor: outline ? 'transparent' : bg,
          borderWidth: outline ? stroke : 0,
          borderColor: colors.tinta,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Txt size={small ? 12 : 13} weight="bold" color={color}>{label}</Txt>
    </View>
  );
}

/** Interruptor con la forma de las maquetas (pista verde / arena). */
export function Switch({ value }: { value: boolean }) {
  return (
    <View style={{ width: 48, height: 28, borderRadius: 999, backgroundColor: value ? colors.verde : colors.pista, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blanco }} />
    </View>
  );
}

/** Fila con texto e interruptor. Toda la fila es el control (role switch). */
export function ToggleRow({ label, sub, value, onChange, boxed = true, last, disabled }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; boxed?: boolean; last?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={sub}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.85 : disabled ? 0.5 : 1 },
        boxed
          ? { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: colors.blanco, marginBottom: 8 }
          : { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 2, borderStyle: 'dashed', borderColor: colors.arena },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Txt size={sub ? 16 : 15} weight={sub ? 'black' : 'bold'}>{label}</Txt>
        {sub ? <Txt size={13}>{sub}</Txt> : null}
      </View>
      <Switch value={value} />
    </Pressable>
  );
}

/** Selector segmentado en píldora (Crear cuenta / Entrar). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; accessibilityLabel: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', padding: 4, borderRadius: 999, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: colors.blanco }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 42, borderRadius: 999, backgroundColor: on ? colors.tinta : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt weight="black" size={15} color={on ? colors.crema : colors.tinta}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
