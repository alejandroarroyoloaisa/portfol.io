/** Contenedor de pantalla (fondo crema, zonas seguras) y cabecera con botón de volver. */
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { colors } from '../theme';
import { IconButton, type IconButtonVariant } from './Button';
import { Headline, HandNote } from './Text';

interface ScreenProps {
  children: ReactNode;
  bg?: string;
  /** Respeta la zona segura superior (false cuando la cabecera de color llega hasta arriba). */
  top?: boolean;
  /** Pie fijo (botón principal); se le añade la zona segura inferior. */
  footer?: ReactNode;
  footerBg?: string;
  /** Capa superpuesta (confirmaciones a pantalla completa). */
  overlay?: ReactNode;
  /** Decoración absoluta detrás del contenido (manchas). */
  decor?: ReactNode;
  keyboard?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, bg = colors.crema, top = true, footer, footerBg = colors.blanco, overlay, decor, keyboard, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[{ flex: 1, backgroundColor: bg, paddingTop: top ? insets.top : 0, overflow: 'hidden' }, style]}>
      {decor}
      <View style={{ flex: 1 }}>{children}</View>
      {footer ? (
        <View style={{ backgroundColor: footerBg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
          {footer}
        </View>
      ) : null}
      {overlay}
    </View>
  );
  if (!keyboard) return body;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

/** Lista o contenido desplazable con el relleno de las maquetas. */
export function ScrollBody({ children, contentStyle, ...rest }: ScrollViewProps & { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingHorizontal: 18, paddingBottom: 28 }, contentStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

interface HeaderProps {
  title?: string;
  /** Nota manuscrita bajo el título. */
  note?: string;
  noteColor?: string;
  titleSize?: number;
  /** Elemento a la derecha del botón de volver. */
  right?: ReactNode;
  /** Icono del botón de cierre: volver (por defecto) o cerrar (modales). */
  closeIcon?: 'back' | 'close';
  backVariant?: IconButtonVariant;
  onBack?: () => void;
  /** Título en línea con el botón (cabeceras compactas: Editar, Publicar). */
  inline?: boolean;
  children?: ReactNode;
}

export function ScreenHeader({
  title, note, noteColor = colors.cobalto, titleSize = 44, right, closeIcon = 'back', backVariant = 'outline', onBack, inline, children,
}: HeaderProps) {
  const nav = useNavigation();
  const back = (
    <IconButton
      icon={closeIcon}
      variant={backVariant}
      accessibilityLabel={closeIcon === 'close' ? t.common.close : t.common.back}
      onPress={onBack ?? (() => nav.goBack())}
    />
  );
  if (inline) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, gap: 10 }}>
        {back}
        {title ? <Headline size={24} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{title}</Headline> : <View style={{ flex: 1 }} />}
        <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {back}
        {right}
      </View>
      {title ? <Headline size={titleSize} style={{ marginTop: 18 }}>{title}</Headline> : null}
      {note ? <HandNote size={23} color={noteColor}>{note}</HandNote> : null}
      {children}
    </View>
  );
}

/** Título de sección dentro de una pantalla. */
export function SectionTitle({ children, size = 20, style, right }: { children: ReactNode; size?: number; style?: StyleProp<ViewStyle>; right?: ReactNode }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }, style]}>
      <Headline size={size} em={-0.02} lineHeight={Math.round(size * 1.15)} style={{ flexShrink: 1 }}>{children}</Headline>
      {right}
    </View>
  );
}
