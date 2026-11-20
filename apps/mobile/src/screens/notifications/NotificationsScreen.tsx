/** 19 · Avisos: agrupados por hoy / esta semana / antes, cada uno con su icono y enlazado a su destino (RF-31). */
import type { Notification } from '@portfolio/schemas';
import { Fragment, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMarkNotificationRead, useNotifications, useReadAllNotifications } from '../../api/hooks/messaging';
import { Avatar } from '../../components/Avatar';
import { HandLink } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, ScreenHeader } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { HandNote } from '../../components/Text';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors, fonts, onColor, shapeRadii, type Shape } from '../../theme';
import { recencyGroup, timeAgo } from '../../utils/format';
import { usePullRefresh } from '../../utils/hooks';

/** Icono por tipo de aviso (cuando no hay foto de la persona). */
const ICONS: Partial<Record<Notification['type'], { icon: IconName; bg: string; shape: Shape; filled?: boolean }>> = {
  convocatoria_encaje: { icon: 'briefcase', bg: colors.coral, shape: 'leaf' },
  valoraciones: { icon: 'heart', bg: colors.coral, shape: 'circle', filled: true },
  validacion_tecnica: { icon: 'check', bg: colors.cobalto, shape: 'square' },
  solicitud_estado: { icon: 'clock', bg: colors.mostaza, shape: 'circle' },
  mensaje: { icon: 'chat', bg: colors.cobalto, shape: 'blob' },
  comentario: { icon: 'chat', bg: colors.mostaza, shape: 'blob' },
};
const WITH_ACTOR: Notification['type'][] = ['conexion_solicitada', 'conexion_aceptada', 'visita_perfil', 'expo_abierta'];

/** Negrita para el nombre de quien actúa y para los títulos entre comillas «…». */
function RichText({ n }: { n: Notification }) {
  const parts: { s: string; b: boolean }[] = [];
  let text = n.text;
  if (n.actor && text.startsWith(n.actor.name)) {
    parts.push({ s: n.actor.name, b: true });
    text = text.slice(n.actor.name.length);
  }
  const colon = n.type === 'convocatoria_encaje' ? text.indexOf(':') : -1;
  if (colon > 0) {
    parts.push({ s: text.slice(0, colon + 1), b: true });
    text = text.slice(colon + 1);
  }
  text.split(/(«[^»]+»)/).forEach((s) => s && parts.push({ s, b: s.startsWith('«') && colon < 0 }));
  return (
    <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.tinta }}>
      {parts.map((p, i) => (
        <Text key={i} style={p.b ? { fontFamily: fonts.display } : undefined}>{p.s}</Text>
      ))}
    </Text>
  );
}

function NotifIcon({ n }: { n: Notification }) {
  const def = ICONS[n.type];
  if (n.actor && (WITH_ACTOR.includes(n.type) || !def)) return <Avatar user={n.actor} size={44} />;
  const d = def ?? { icon: 'bell' as IconName, bg: colors.mostaza, shape: 'circle' as Shape };
  const fg = onColor(d.bg);
  return (
    <View style={[{ width: 44, height: 44, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center' }, shapeRadii(d.shape, 44)]}>
      <Icon name={d.filled ? 'heartFilled' : d.icon} size={20} color={fg} strokeWidth={2.4} />
    </View>
  );
}

export function NotificationsScreen() {
  const { nav, open } = useAppNavigation();
  const q = useNotifications();
  const read = useMarkNotificationRead();
  const readAll = useReadAllNotifications();
  const { refreshing, onRefresh } = usePullRefresh(q.refetch);
  const groups = useMemo(() => {
    const g: Record<'today' | 'week' | 'earlier', Notification[]> = { today: [], week: [], earlier: [] };
    q.data?.forEach((n) => g[recencyGroup(n.createdAt)].push(n));
    return g;
  }, [q.data]);
  const anyUnread = q.data?.some((n) => !n.read);

  return (
    <Screen>
      <ScreenHeader
        title={t.notifications.title}
        right={<HandLink label={t.notifications.settings} onPress={() => nav.navigate('Settings')} />}
      >
        {anyUnread ? <HandLink label={t.notifications.readAll} color={colors.tintaSuave} size={19} onPress={() => readAll.mutate()} style={{ alignSelf: 'flex-start' }} /> : null}
      </ScreenHeader>
      {q.isPending ? <LoadingState /> : q.error && !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} />}>
          {!q.data?.length ? <EmptyState title={t.notifications.emptyTitle} text={t.notifications.emptyText} /> : null}
          {(['today', 'week', 'earlier'] as const).map((k) =>
            groups[k].length ? (
              <Fragment key={k}>
                <HandNote size={24} color={colors.anotacion} rotate={-2} style={{ marginTop: k === 'today' ? 6 : 16, marginBottom: 4 }}>{t.notifications.groups[k]}</HandNote>
                {groups[k].map((n) => (
                  <Pressable
                    key={n.id}
                    accessibilityRole={n.link ? 'link' : 'text'}
                    accessibilityLabel={`${n.read ? '' : `${t.notifications.unreadA11y}. `}${n.text}. ${timeAgo(n.createdAt)}`}
                    onPress={() => {
                      if (!n.read) read.mutate(n.id);
                      open(n.link);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, marginBottom: 8, borderRadius: 22,
                      backgroundColor: n.read ? 'transparent' : colors.blanco, opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <NotifIcon n={n} />
                    <View style={{ flex: 1 }}>
                      <RichText n={n} />
                      <HandNote size={17} color={colors.tintaSuave}>{timeAgo(n.createdAt)}</HandNote>
                    </View>
                  </Pressable>
                ))}
              </Fragment>
            ) : null,
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

