/** 06 · Explorar: buscador, pestañas obras/artistas/galerías y tablero de corcho con resultados (RF-19). */
import type { Artwork, SearchResult } from '@portfolio/schemas';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useMe } from '../../api/hooks/me';
import { useSearch } from '../../api/hooks/discovery';
import { Avatar } from '../../components/Avatar';
import { Chip, ChipRow, Tag } from '../../components/Chip';
import { ArtworkPolaroid } from '../../components/Cutout';
import { Tape, tapeColors } from '../../components/Decor';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { labels, t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { TabScreenProps } from '../../navigation/types';
import { countFilters, toSearchInput, useExploreStore, type ExploreType } from '../../store/filters';
import { colors, fonts, stroke, tiltAt } from '../../theme';
import { useDebounced, usePullRefresh } from '../../utils/hooks';

const TYPES: ExploreType[] = ['obras', 'artistas', 'galerias'];

function Board({ artworks, total }: { artworks: Artwork[]; total: number }) {
  const { nav } = useAppNavigation();
  const left: { a?: Artwork; count?: boolean; i: number }[] = [];
  const right: { a: Artwork; i: number }[] = [];
  artworks.forEach((a, i) => (i % 2 === 0 ? left : right).push({ a, i }));
  left.splice(Math.min(1, left.length), 0, { count: true, i: -1 });
  const item = (a: Artwork, i: number) => {
    const img = a.images[0];
    const aspect = img ? Math.min(1.3, Math.max(0.75, img.width / img.height)) : 1;
    return (
      <ArtworkPolaroid
        key={a.id}
        artwork={a}
        aspect={aspect}
        rotate={tiltAt(i, 2)}
        titleSize={i % 3 === 0 ? 22 : 20}
        onPress={() => nav.navigate('Artwork', { id: a.id })}
        style={{ marginBottom: 22 }}
      />
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      {right.length ? <Tape width={80} height={22} rotate={30} color={tapeColors.cobalto} style={{ top: 270, left: 150, zIndex: 0 }} /> : null}
      <View style={{ flex: 1.1 }}>
        {left.map((x) =>
          x.count ? (
            <View
              key="count"
              accessible
              accessibilityLabel={`${total} ${t.explore.found(total, 'obras')}`}
              style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: colors.coral, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 22, transform: [{ rotate: '-6deg' }] }}
            >
              <Headline size={48} lineHeight={50}>{total}</Headline>
              <HandNote size={22} style={{ textAlign: 'center' }}>{t.explore.found(total, 'obras')}</HandNote>
            </View>
          ) : (
            item(x.a!, x.i)
          ),
        )}
      </View>
      <View style={{ flex: 0.9, paddingTop: 40 }}>
        {right.map((x) => item(x.a, x.i))}
      </View>
    </View>
  );
}

function People({ result, type }: { result: SearchResult; type: 'artistas' | 'galerias' }) {
  const { openUser } = useAppNavigation();
  const people = type === 'artistas' ? result.artists : result.galleries;
  return (
    <View style={{ gap: 12 }}>
      <HandNote size={24} color={colors.cobalto}>{`${people.length} ${t.explore.found(people.length, type)}`}</HandNote>
      {people.map((p, i) => {
        const artist = type === 'artistas' ? (p as SearchResult['artists'][number]) : null;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.openProfile(p.name)}
            onPress={() => openUser(p.handle)}
            style={({ pressed }) => ({
              flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 22, backgroundColor: colors.blanco,
              transform: [{ rotate: `${tiltAt(i, 0.4)}deg` }], opacity: pressed ? 0.9 : 1,
            })}
          >
            <Avatar user={p} size={54} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={16} weight="black" numberOfLines={1}>{p.name}</Txt>
              {p.headline ? <Txt size={13} numberOfLines={1}>{p.headline}</Txt> : null}
              <HandNote size={18} color={colors.cobalto}>
                {[p.city, p.distanceKm != null ? t.explore.km(p.distanceKm) : null].filter(Boolean).join(' · ')}
              </HandNote>
              {artist ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {artist.acceptsCommissions ? <Tag small label={t.explore.commissions} bg={colors.tinta} color={colors.crema} /> : null}
                  {artist.techniques.slice(0, 2).map((tq) => <Tag key={tq} small outline label={labels.technique[tq]} />)}
                </View>
              ) : null}
            </View>
            <Icon name="chevronRight" size={18} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ExploreScreen({ navigation }: TabScreenProps<'Explore'>) {
  const { q, type, filters, setQ, setType } = useExploreStore();
  const hasLocation = !!useMe().data?.location;
  const dq = useDebounced(q);
  const search = useSearch(toSearchInput(dq, type, hasLocation ? filters : { ...filters, km: null }));
  const { refreshing, onRefresh } = usePullRefresh(search.refetch);
  const nFilters = countFilters(filters);
  const r = search.data;
  const empty = r && (type === 'obras' ? !r.artworks.length : type === 'artistas' ? !r.artists.length : !r.galleries.length);

  return (
    <Screen>
      <View style={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 8 }}>
        <Headline size={52} lineHeight={50}>{t.explore.title}</Headline>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, marginTop: 14, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.blanco, borderWidth: stroke, borderColor: colors.tinta }}>
          <Icon name="search" size={19} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.explore.placeholder}
            placeholderTextColor={colors.gris}
            accessibilityLabel={t.explore.search}
            returnKeyType="search"
            autoCorrect={false}
            style={[{ flex: 1, minWidth: 0, height: 48, fontFamily: fonts.bold, fontSize: 15, color: colors.tinta }, { outlineStyle: 'none' } as object]}
          />
          {q ? <Pressable accessibilityRole="button" accessibilityLabel={t.common.close} onPress={() => setQ('')} hitSlop={12}><Icon name="close" size={16} /></Pressable> : null}
        </View>
        <ChipRow scroll style={{ marginTop: 12 }}>
          {TYPES.map((k) => (
            <Chip
              key={k}
              label={t.explore.types[k]}
              size="sm"
              radio
              selected={type === k}
              selectedColor={colors.cobalto}
              selectedTextColor={colors.crema}
              bg="transparent"
              onPress={() => setType(k)}
              style={type === k ? { borderColor: colors.cobalto } : undefined}
            />
          ))}
          <Chip
            label={t.explore.filters(nFilters)}
            size="sm"
            icon="filters"
            bg={colors.mostaza}
            style={{ borderColor: colors.mostaza }}
            onPress={() => navigation.navigate('Filters')}
          />
        </ChipRow>
      </View>
      {search.isPending ? (
        <LoadingState />
      ) : !r ? (
        <ErrorState error={search.error} onRetry={() => void search.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cobalto} colors={[colors.cobalto]} />}
        >
          {empty ? (
            <EmptyState title={t.explore.emptyTitle} text={t.explore.emptyText} />
          ) : type === 'obras' ? (
            <Board artworks={r.artworks} total={r.artworks.length} />
          ) : (
            <People result={r} type={type} />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

