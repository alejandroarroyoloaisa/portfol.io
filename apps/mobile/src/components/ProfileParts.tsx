/** Piezas compartidas por el perfil ajeno y el propio: cabecera polaroid, cifras orgánicas y cuaderno. */
import type { Artwork, UserSummary } from '@portfolio/schemas';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { colors, onColor, shadows } from '../theme';
import { formatNumber } from '../utils/format';
import { Avatar } from './Avatar';
import { Polaroid } from './Cutout';
import { Tape } from './Decor';
import { HandNote, Headline } from './Text';

/** Cabecera de color con la foto en polaroid y el nombre grande. */
export function ProfileHero({ user, bg, decor, height = 300, left, right, nameColor = colors.crema, avatarColor, kicker }: {
  user: Pick<UserSummary, 'id' | 'name' | 'initials' | 'avatarUrl' | 'role'>;
  bg: string;
  decor?: ReactNode;
  height?: number;
  left?: ReactNode;
  right?: ReactNode;
  nameColor?: string;
  avatarColor?: string;
  kicker?: string;
}) {
  const insets = useSafeAreaInsets();
  const nameSize = user.name.length > 16 ? 38 : 44;
  return (
    <View style={{ height: height + insets.top, paddingTop: insets.top, backgroundColor: bg, overflow: 'hidden' }}>
      {decor}
      <View style={{ position: 'absolute', top: insets.top + 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>{left}</View>
        <View>{right}</View>
      </View>
      {kicker ? null : (
        <View style={{ position: 'absolute', left: 22, top: insets.top + (left ? 84 : 40), width: 108, height: 130, padding: 7, backgroundColor: colors.blanco, transform: [{ rotate: '-5deg' }], boxShadow: shadows.deep }}>
          <Avatar user={user} square color={avatarColor} size={94} fontSize={40} />
          <Tape width={60} height={20} rotate={-6} color="rgba(242,183,5,0.75)" style={{ top: -10, left: 24 }} />
        </View>
      )}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
        {kicker ? <HandNote size={22} color={nameColor}>{kicker}</HandNote> : null}
        <Headline size={kicker ? 46 : nameSize} em={-0.04} lineHeight={Math.round((kicker ? 46 : nameSize) * 0.95)} color={nameColor}>{user.name}</Headline>
      </View>
    </View>
  );
}

const BLOB_RADII: { tl: number; tr: number; br: number; bl: number }[] = [
  { tl: 0.5, tr: 0.4, br: 0.5, bl: 0.45 },
  { tl: 0.45, tr: 0.5, br: 0.4, bl: 0.5 },
  { tl: 0.5, tr: 0.45, br: 0.5, bl: 0.4 },
];

/** Cifras dentro de formas orgánicas (obras, conexiones, muestras). */
export function StatBlobs({ items }: { items: { value: number; label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
      {items.map((it, i) => {
        const r = BLOB_RADII[i % 3];
        const k = 60;
        return (
          <View
            key={it.label}
            accessible
            accessibilityLabel={`${formatNumber(it.value)} ${it.label}`}
            style={{
              flex: 1, paddingVertical: 12, paddingHorizontal: 6, backgroundColor: it.color, alignItems: 'center',
              borderTopLeftRadius: k * r.tl, borderTopRightRadius: k * r.tr, borderBottomRightRadius: k * r.br, borderBottomLeftRadius: k * r.bl,
            }}
          >
            <Headline size={32} lineHeight={34} color={onColor(it.color)}>{formatNumber(it.value)}</Headline>
            <HandNote size={19} lineHeight={20} color={onColor(it.color)}>{it.label}</HandNote>
          </View>
        );
      })}
    </View>
  );
}

/** Cuaderno de obras en rejilla de polaroids giradas. */
export function NotebookGrid({ artworks, onOpen, badge }: { artworks: Artwork[]; onOpen: (a: Artwork) => void; badge?: (a: Artwork) => string | null }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }}>
      {artworks.map((a, i) => {
        const b = badge?.(a);
        return (
          <Polaroid
            key={a.id}
            image={a.images[0]}
            title={a.title}
            titleSize={15}
            padding={6}
            aspect={1}
            width="47%"
            rotate={[-2, 2, 1.5, -1.5][i % 4]}
            onPress={() => onOpen(a)}
            accessibilityLabel={b ? `${t.a11y.artwork(a.title)}, ${b}` : t.a11y.artwork(a.title)}
          >
            {b ? (
              <View style={{ position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.cobalto, transform: [{ rotate: '-3deg' }] }}>
                <HandNote size={17} color={colors.crema}>{b}</HandNote>
              </View>
            ) : null}
          </Polaroid>
        );
      })}
    </View>
  );
}
