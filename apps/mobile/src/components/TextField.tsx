/** Campos de texto en forma de píldora (o caja redondeada si son multilínea), con etiqueta y error. */
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { colors, fonts, stroke } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Text';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Contenido a la derecha de la etiqueta (contador manuscrito…). */
  labelRight?: ReactNode;
  error?: string;
  hand?: boolean;
  secureToggle?: { show: string; hide: string };
  containerStyle?: StyleProp<ViewStyle>;
  height?: number;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, labelRight, error, multiline, hand, secureToggle, containerStyle, style, height = 52, secureTextEntry, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  return (
    <View style={containerStyle}>
      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
          <Txt size={14} weight="black" nativeID={rest.nativeID ? `${rest.nativeID}-label` : undefined}>{label}</Txt>
          {labelRight}
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 110 : height, borderRadius: multiline ? 22 : 999, borderWidth: stroke,
          borderColor: error ? colors.anotacion : colors.tinta, backgroundColor: colors.blanco,
          boxShadow: focused ? `0px 0px 0px 3px ${colors.mostaza}` : undefined,
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.gris}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          secureTextEntry={secureTextEntry && !reveal}
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[
            {
              flex: 1, minHeight: multiline ? 106 : height - 4, paddingHorizontal: multiline ? 16 : 18, paddingVertical: multiline ? 14 : 0,
              fontFamily: hand ? fonts.handSemi : fonts.body, fontSize: hand ? 22 : 16, lineHeight: hand ? 25 : multiline ? 22 : undefined, color: colors.tinta,
              outlineStyle: 'none',
            } as object,
            style,
          ]}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? secureToggle.hide : secureToggle.show}
            onPress={() => setReveal((v) => !v)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}
          >
            <Icon name={reveal ? 'eyeOff' : 'eye'} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt accessibilityRole="alert" size={13} weight="bold" color={colors.coralTexto} style={{ marginTop: 4, marginLeft: 12 }}>{error}</Txt>
      ) : null}
    </View>
  );
});

/** Campo enlazado a react-hook-form. */
export function FormField<T extends FieldValues>({ control, name, transform, ...rest }: TextFieldProps & {
  control: Control<T>;
  name: FieldPath<T>;
  /** Conversión del texto al valor del formulario (p. ej. números). */
  transform?: { in: (v: unknown) => string; out: (s: string) => unknown };
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          value={transform ? transform.in(field.value) : (field.value as string | undefined) ?? ''}
          onChangeText={(s) => field.onChange(transform ? transform.out(s) : s)}
          onBlur={field.onBlur}
          error={fieldState.error?.message ?? rest.error}
        />
      )}
    />
  );
}

/** Transformación texto ↔ número entero para campos numéricos. */
export const numberTransform = {
  in: (v: unknown) => (v === undefined || v === null || Number.isNaN(v) ? '' : String(v)),
  out: (s: string) => {
    const clean = s.replace(',', '.').replace(/[^\d.]/g, '');
    return clean === '' ? undefined : Number(clean);
  },
};
