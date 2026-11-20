/** 24 · Ajustes: cuenta, avisos, privacidad, descarga de datos, eliminar cuenta y cerrar sesión (RF-02, RF-31, RF-33, RF-34, HU-10). */
import { NOTIFICATION_PREFS, type Me } from '@portfolio/schemas';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { signOut, useForgotPassword } from '../../api/hooks/auth';
import { useDeleteAccount, useExportData, useMe, useUpdateSettings } from '../../api/hooks/me';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { ToggleRow } from '../../components/Chip';
import { Screen, ScreenHeader } from '../../components/Screen';
import { ConfirmSheet } from '../../components/Sheet';
import { LoadingState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { APP_VERSION } from '../../config';
import { labels, t } from '../../i18n';
import { colors } from '../../theme';
import { registerForPush } from '../../utils/push';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <HandNote size={24} color={colors.anotacion} style={{ marginTop: 20, marginBottom: 8 }} accessibilityRole="header">{title}</HandNote>
      <View style={{ borderRadius: 22, backgroundColor: colors.blanco, overflow: 'hidden' }}>{children}</View>
    </>
  );
}

function Row({ label, value, onPress, last, busy }: { label: string; value?: string; onPress?: () => void; last?: boolean; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      disabled={!onPress || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: last ? 0 : 2, borderStyle: 'dashed', borderColor: colors.arena, opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt size={15} weight="bold">{label}</Txt>
      <Txt size={15} numberOfLines={1} style={{ flexShrink: 1 }}>{busy ? t.settings.exporting : value ?? '›'}</Txt>
    </Pressable>
  );
}

async function deliverExport(data: Record<string, unknown>) {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-mis-datos.json';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ title: t.settings.export, message: json });
  }
}

function SettingsBody({ me }: { me: Me }) {
  const settings = useUpdateSettings();
  const exportData = useExportData();
  const del = useDeleteAccount();
  const forgot = useForgotPassword();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [push, setPush] = useState<'idle' | 'busy' | 'enabled'>('idle');
  const s = me.settings;
  const set = (b: Parameters<typeof settings.mutate>[0]) => settings.mutate(b, { onError: toast.error });

  const enablePush = async () => {
    setPush('busy');
    const r = await registerForPush(true);
    setPush(r === 'enabled' ? 'enabled' : 'idle');
    if (r === 'enabled') toast.ok(t.settings.pushDone);
    else toast.error(r === 'denied' ? t.settings.pushDenied : t.settings.pushUnavailable);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 32 }}>
      <Group title={t.settings.account}>
        <Row label={t.settings.email} value={me.email} />
        <Row
          label={t.settings.password}
          value={t.settings.change}
          onPress={() => forgot.mutate(me.email, { onSuccess: () => toast.ok(t.settings.passwordSent), onError: toast.error })}
          busy={forgot.isPending}
        />
        <Row label={t.settings.role} value={labels.role[me.role]} last />
      </Group>

      <Group title={t.settings.notifications}>
        {NOTIFICATION_PREFS.map((k, i) => (
          <ToggleRow key={k} boxed={false} label={t.settings.prefs[k]} value={s.notifications[k]} onChange={(v) => set({ notifications: { [k]: v } })} last={i === NOTIFICATION_PREFS.length - 1 && Platform.OS === 'web'} />
        ))}
        {Platform.OS !== 'web' ? (
          <Row label={t.settings.push} value={push === 'enabled' ? t.settings.pushOn : t.settings.pushOff} onPress={() => void enablePush()} busy={push === 'busy'} last />
        ) : null}
      </Group>

      <Group title={t.settings.privacy}>
        <ToggleRow boxed={false} label={t.settings.visible} value={!s.privateProfile} onChange={(v) => set({ privateProfile: !v })} />
        <ToggleRow boxed={false} label={t.settings.showCity} value={s.showCity} onChange={(v) => set({ showCity: v })} />
        <ToggleRow boxed={false} label={t.settings.watermark} value={s.watermark} onChange={(v) => set({ watermark: v })} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <Txt size={15} weight="bold">{t.settings.messagesFrom}</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['todos', 'conexiones'] as const).map((k) => (
              <Chip key={k} label={t.settings.messagesFromOpts[k]} size="sm" radio selected={s.allowMessagesFrom === k} selectedColor={colors.tinta} selectedTextColor={colors.crema} onPress={() => set({ allowMessagesFrom: k })} />
            ))}
          </View>
        </View>
      </Group>

      <Group title={t.settings.more}>
        <Row label={t.settings.language} value={t.settings.languageValue} />
        <Row label={t.settings.help} onPress={() => void Linking.openURL(t.settings.helpEmail)} />
        <Row
          label={t.settings.export}
          busy={exportData.isPending}
          onPress={() =>
            exportData.mutate(undefined, {
              onSuccess: async (d) => {
                await deliverExport(d);
                toast.ok(t.settings.exported);
              },
              onError: toast.error,
            })
          }
        />
        <Row label={t.settings.deleteAccount} onPress={() => setConfirmDelete(true)} last />
      </Group>

      <Button label={t.settings.logout} variant="danger" size="md" style={{ marginTop: 22 }} onPress={() => void signOut()} />
      <HandNote size={19} style={{ textAlign: 'center', marginTop: 14 }}>{t.settings.version(APP_VERSION)}</HandNote>

      <ConfirmSheet
        visible={confirmDelete}
        title={t.settings.deleteTitle}
        text={t.settings.deleteText}
        confirmLabel={t.settings.deleteConfirm}
        requireWord={t.settings.deleteWord}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync();
          toast.ok(t.settings.deleted);
        }}
      />
    </ScrollView>
  );
}

export function SettingsScreen() {
  const me = useMe().data;
  return (
    <Screen>
      <ScreenHeader title={t.settings.title} />
      {me ? <SettingsBody me={me} /> : <LoadingState />}
    </Screen>
  );
}
