/** 11 · Exposición virtual: pared con foco, obra colgada, cartela manuscrita; se recorre deslizando (RF-21, HU-08). */
import type { Artwork, Exhibition } from '@portfolio/schemas';
import { useRef, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useExhibition, useSeriesRoom } from '../../api/hooks/artworks';
import { useMe } from '../../api/hooks/me';
import { useStartConversation } from '../../api/hooks/messaging';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Button, IconButton } from '../../components/Button';
import { Tape, tapeColors } from '../../components/Decor';
import { ScreenQuery } from '../../components/ScreenQuery';
import { EmptyState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { labels, t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { colors, shadows } from '../../theme';
import { shortDate } from '../../utils/format';

function Wall({ artwork, width, height }: { artwork: Artwork; width: number; height: number }) {
  const img = artwork.images[0];
  const ratio = img ? img.width / img.height : 0.83;
  // Marco máximo 250 × 300 como en la maqueta, adaptado a la proporción de la obra
  const frameW = ratio >= 0.83 ? 260 : Math.round(300 * ratio) + 24;
  const frameH = ratio >= 0.83 ? Math.round((260 - 24) / ratio) + 24 : 300;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(0, height / 2 - frameH / 2 - 150) }}>
        <Svg width={300} height={240}>
          <Defs>
            <RadialGradient id="foco" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={150} cy={120} rx={150} ry={120} fill="url(#foco)" />
        </Svg>
      </View>
      <View style={{ width: frameW, height: frameH, padding: 12, backgroundColor: colors.blanco, boxShadow: shadows.wall, marginBottom: 60 }}>
        <ArtworkImage image={img} title={artwork.title} variant="large" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Room({ ex, startId }: { ex: Exhibition; startId?: string }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const start = useStartConversation();
  const me = useMe().data;
  const listRef = useRef<FlatList<Artwork>>(null);
  const works = ex.artworks;
  const initial = Math.max(0, startId ? works.findIndex((a) => a.id === startId) : 0);
  const [i, setI] = useState(initial);
  const [wallH, setWallH] = useState(0);
  const { nav: navigation } = useAppNavigation();

  const go = (to: number) => {
    const n = works.length;
    const next = (to + n) % n;
    setI(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };
  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const idx = viewableItems[0]?.index;
    if (idx != null) setI(idx);
  }).current;

  const current = works[i];
  const owner = ex.artist;
  const ask = () =>
    current &&
    start.mutate(
      { userId: owner.id },
      { onSuccess: (c) => navigation.navigate('Chat', { conversationId: c.id, attachArtworkId: current.id }), onError: toast.error },
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.pared, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
        <IconButton icon="close" accessibilityLabel={t.exhibition.exit} onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Txt size={18} weight="black" numberOfLines={1}>{ex.title.startsWith('«') ? ex.title : `«${ex.title}»`}</Txt>
          <Txt size={13} numberOfLines={1}>
            {[ex.artist.name, ex.organization?.name, ex.endsAt ? t.exhibition.until(shortDate(ex.endsAt)) : null].filter(Boolean).join(' · ')}
          </Txt>
        </View>
        <HandNote size={22}>{t.exhibition.room}</HandNote>
      </View>

      {works.length === 0 ? (
        <EmptyState title={ex.title} text={t.exhibition.empty} />
      ) : (
        <View accessibilityLabel={t.exhibition.wall} style={{ flex: 1 }} onLayout={(e) => setWallH(e.nativeEvent.layout.height)}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: colors.suelo }} />
          <FlatList
            ref={listRef}
            data={works}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initial}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(a) => a.id}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => <Wall artwork={item} width={width} height={wallH} />}
          />
          {current ? (
            <View
              accessible
              accessibilityLabel={`${current.title}. ${t.exhibition.label(labels.technique[current.technique], current.widthCm, current.heightCm, i + 1, works.length)}`}
              style={{ position: 'absolute', right: 22, bottom: 140, width: 160, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.blanco, transform: [{ rotate: '3deg' }], boxShadow: '0px 4px 10px rgba(20,20,20,0.15)' }}
            >
              <Tape width={54} height={18} rotate={-4} color={tapeColors.coral} style={{ top: -9, left: 46 }} />
              <Txt size={16} weight="black">{current.title}</Txt>
              <HandNote size={19} lineHeight={20}>
                {t.exhibition.label(labels.technique[current.technique], current.widthCm, current.heightCm, current.series?.position ?? i + 1, current.series?.count ?? works.length)}
              </HandNote>
            </View>
          ) : null}
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 12, backgroundColor: colors.crema }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }} accessibilityLabel={t.exhibition.position(i + 1, works.length)}>
          {works.map((a, k) => (
            <View key={a.id} style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.tinta : colors.pista }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconButton icon="back" variant="white" size={52} accessibilityLabel={t.exhibition.prev} onPress={() => go(i - 1)} disabled={works.length < 2} />
          {me?.id !== owner.id ? (
            <Button label={t.exhibition.ask} size="md" flex onPress={ask} loading={start.isPending} disabled={!current} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <IconButton icon="forward" variant="coral" size={52} style={{ borderWidth: 2, borderColor: colors.tinta }} accessibilityLabel={t.exhibition.next} onPress={() => go(i + 1)} disabled={works.length < 2} />
        </View>
      </View>
    </View>
  );
}

export function ExhibitionScreen({ route }: RootScreenProps<'Exhibition'>) {
  const { seriesId, exhibitionId, startId } = route.params;
  const series = useSeriesRoom(seriesId);
  const exhibition = useExhibition(exhibitionId);
  const q = seriesId ? series : exhibition;
  return <ScreenQuery query={q} bg={colors.pared}>{(ex) => <Room ex={ex} startId={startId} />}</ScreenQuery>;
}
