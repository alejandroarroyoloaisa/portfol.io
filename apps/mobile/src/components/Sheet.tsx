/**
 * Hoja inferior modal y diálogo de confirmación propios: Alert.alert no funciona en la web
 * (react-native-web no lo implementa), así que todas las confirmaciones pasan por aquí.
 */
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { colors } from '../theme';
import { Button } from './Button';
import { InlineError } from './States';
import { Headline, Txt } from './Text';
import { TextField } from './TextField';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: number | `${number}%`;
}

export function Sheet({ visible, onClose, title, children, maxHeight = '85%' }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.close} onPress={onClose} style={{ flex: 1, backgroundColor: colors.velo }} />
        <View
          accessibilityViewIsModal
          style={{ maxHeight, backgroundColor: colors.crema, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: colors.pista }} />
          </View>
          {title ? <Headline size={28} style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6 }}>{title}</Headline> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  text?: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
  danger?: boolean;
  /** Palabra que hay que escribir para confirmar (eliminar cuenta). */
  requireWord?: string;
}

export function ConfirmSheet({ visible, title, text, confirmLabel, onConfirm, onClose, danger, requireWord }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ok = !requireWord || word.trim().toUpperCase() === requireWord;
  const close = () => {
    setWord('');
    setError(null);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={close} title={title}>
      {text ? <Txt size={15} style={{ marginBottom: 14 }}>{text}</Txt> : null}
      {requireWord ? (
        <TextField value={word} onChangeText={setWord} autoCapitalize="characters" placeholder={requireWord} accessibilityLabel={requireWord} containerStyle={{ marginBottom: 14 }} />
      ) : null}
      <InlineError message={error} style={{ marginBottom: 12 }} />
      <Button
        label={confirmLabel}
        variant={danger ? 'coral' : 'dark'}
        disabled={!ok}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await onConfirm();
            close();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button label={t.common.cancel} variant="outline" onPress={close} style={{ marginTop: 10 }} />
    </Sheet>
  );
}
