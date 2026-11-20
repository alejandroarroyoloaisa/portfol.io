/** 08 · Detalle de obra: obra enmarcada con cinta, ficha técnica, nota y sala virtual (RF-09, RF-10, RF-18). */
import type { Artwork } from '@portfolio/schemas';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useArtwork } from '../../api/hooks/artworks';
import { useMe } from '../../api/hooks/me';
import { useStartConversation } from '../../api/hooks/messaging';
import { CommentsButton, LikeButton, SaveButton } from '../../components/ArtworkActions';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Button, IconButton, TextLink } from '../../components/Button';
import { Tag } from '../../components/Chip';
import { Blob, Tape, tapeColors } from '../../components/Decor';
import { ReportSheet } from '../../components/ReportSheet';
import { Screen } from '../../components/Screen';
import { ScreenQuery } from '../../components/ScreenQuery';
import { HandNote, Headline, Txt } from '../../components/Text';
import { toast } from '../../components/Toast';
import { capitalize, labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { formatNumber } from '../../utils/format';

const STATUS_COLORS: Record<Artwork['status'], { bg: string; fg: string }> = {
  exposicion: { bg: colors.verde, fg: colors.crema },
  privada: { bg: colors.arena, fg: colors.tinta },
  proceso: { bg: colors.blanco, fg: colors.tinta },
};

function Gallery({ artwork }: { artwork: Artwork }) {
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const n = artwork.images.length;
  const first = artwork.images[0];
  // Altura según la proporción de la obra, dentro de unos límites para que la ficha siga a la vista.
  const h = w && first ? Math.round(Math.min(420, Math.max(240, w / (first.width / first.height)))) : 340;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
      {w > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          scrollEnabled={n > 1}
        >
          {(n ? artwork.images : [null]).map((img, i) => (
            <View key={i} style={{ width: w, height: h }} accessibilityLabel={n > 1 ? t.artwork.imageOf(i + 1, n) : undefined}>
              <ArtworkImage image={img} title={artwork.title} variant="large" style={{ height: h }} contentFit={i === 0 ? 'cover' : 'contain'} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      {n > 1 ? (
        <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
          {artwork.images.map((_, i) => (
            <View key={i} style={{ width: i === page ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.tinta : colors.crema }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ArtworkDetail({ artwork }: { artwork: Artwork }) {
  const { nav, openUser } = useAppNavigation();
  const me = useMe().data;
  const mine = me?.id === artwork.artist.id;
  const start = useStartConversation();
  const [reporting, setReporting] = useState(false);
  const titleSize = artwork.title.length > 22 ? 40 : artwork.title.length > 13 ? 48 : 58;
  const st = STATUS_COLORS[artwork.status];

  const contact = () =>
    start.mutate(
      { userId: artwork.artist.id },
      { onSuccess: (c) => nav.navigate('Chat', { conversationId: c.id, attachArtworkId: artwork.id }), onError: toast.error },
    );

  const share = async () => {
    try {
      await Share.share({ message: t.artwork.shareText(artwork.title, artwork.artist.name) });
    } catch {
      /* compartir no disponible (web sin navigator.share) */
    }
  };

  return (
    <Screen
      footerBg={colors.crema}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {mine ? (
            <Button label={t.artwork.edit} variant="dark" flex onPress={() => nav.navigate('Publish', { artworkId: artwork.id })} />
          ) : (
            <Button label={t.artwork.contact} flex onPress={contact} loading={start.isPending} />
          )}
          <SaveButton artwork={artwork} size={56} variant="coral" />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
        <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />
        {artwork.series ? (
          <HandNote size={24} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {t.artwork.series(artwork.series.title, artwork.series.position, artwork.series.count)}
          </HandNote>
        ) : artwork.draft ? (
          <HandNote size={24} color={colors.cobalto}>{t.artwork.draft}</HandNote>
        ) : <View />}
        <IconButton icon="share" accessibilityLabel={t.common.share} onPress={share} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ marginTop: 10, marginHorizontal: 6 }}>
          <Blob color={colors.verde} size={140} style={{ left: -40, bottom: -36 }} />
          <View style={{ padding: 10, backgroundColor: colors.blanco, transform: [{ rotate: '1.5deg' }], boxShadow: '0px 10px 26px rgba(20,20,20,0.16)' }}>
            <Gallery artwork={artwork} />
            <Tape width={80} height={24} rotate={-35} color={tapeColors.coral} style={{ top: -12, left: -14 }} />
            <Tape width={80} height={24} rotate={-35} color={tapeColors.mostaza} style={{ bottom: -10, right: -12 }} />
          </View>
        </View>

        <Headline size={titleSize} lineHeight={Math.round(titleSize * 0.95)} style={{ marginTop: 34 }}>{artwork.title}</Headline>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t.a11y.openProfile(artwork.artist.name)}
          onPress={() => openUser(artwork.artist.handle)}
          style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.tinta, transform: [{ rotate: '-1.5deg' }], minHeight: 30, justifyContent: 'center' }}
        >
          <Txt size={13} weight="bold" color={colors.crema}>{t.artwork.byline(artwork.artist.name, artwork.year)}</Txt>
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <Tag label={labels.technique[artwork.technique]} bg={colors.coral} />
          <Tag label={t.artwork.size(artwork.widthCm, artwork.heightCm)} bg={colors.mostaza} />
          <Tag label={labels.artworkStatus[artwork.status]} bg={st.bg} color={st.fg} />
          {artwork.themes.map((th) => <Tag key={th} label={capitalize(labels.theme[th])} outline />)}
        </View>

        {artwork.note ? (
          <HandNote size={27} semi lineHeight={30} style={{ marginTop: 18 }}>{artwork.note}</HandNote>
        ) : null}

        {artwork.series ? (
          <Button
            label={t.artwork.room}
            variant="dark"
            size="sm"
            icon="arrowRight"
            style={{ alignSelf: 'flex-start', marginTop: 16 }}
            onPress={() => nav.navigate('Exhibition', { seriesId: artwork.series!.id, startId: artwork.id })}
          />
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <LikeButton artwork={artwork} />
          <CommentsButton artwork={artwork} onPress={() => nav.navigate('Comments', { artworkId: artwork.id, title: artwork.title })} />
          <View style={{ flex: 1 }} />
          {artwork.views ? <HandNote size={19} color={colors.tintaSuave}>{t.artwork.views(formatNumber(artwork.views))}</HandNote> : null}
        </View>

        {!mine ? <TextLink label={t.common.report} color={colors.tintaSuave} size={13} onPress={() => setReporting(true)} style={{ marginTop: 18, alignSelf: 'flex-start' }} /> : null}
      </ScrollView>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} target={{ targetType: 'obra', targetId: artwork.id }} title={t.artwork.reportTitle} />
    </Screen>
  );
}

export function ArtworkScreen({ route }: RootScreenProps<'Artwork'>) {
  const q = useArtwork(route.params.id);
  return <ScreenQuery query={q}>{(a) => <ArtworkDetail artwork={a} />}</ScreenQuery>;
}
