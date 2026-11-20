/** 07 · Filtros: hoja inferior con técnica, formato, distancia y disponibilidad; contador en directo (RF-20). */
import { FORMATS, TECHNIQUES, type Format } from '@portfolio/schemas';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '../../api/hooks/discovery';
import { useMe } from '../../api/hooks/me';
import { Button, HandLink } from '../../components/Button';
import { ChoiceChips, ToggleRow } from '../../components/Chip';
import { Slider } from '../../components/Slider';
import { HandNote, Headline, Txt } from '../../components/Text';
import { labels, t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { EMPTY_FILTERS, toSearchInput, useExploreStore, type ExploreFilters } from '../../store/filters';
import { colors, stroke } from '../../theme';
import { useDebounced } from '../../utils/hooks';

const MAX_KM = 500;

export function FiltersScreen({ navigation }: RootScreenProps<'Filters'>) {
  const insets = useSafeAreaInsets();
  const store = useExploreStore();
  const hasLocation = !!useMe().data?.location;
  const [f, setF] = useState<ExploreFilters>(store.filters);
  const set = (patch: Partial<ExploreFilters>) => setF((x) => ({ ...x, ...patch }));
  // Contador en directo: misma búsqueda (tipo obras) con los filtros en edición.
  const live = useSearch(toSearchInput(store.q, 'obras', useDebounced(hasLocation ? f : { ...f, km: null }, 250)));
  const count = live.data?.artworks.length ?? null;
  const km = f.km ?? MAX_KM;

  const apply = () => {
    store.setFilters(f);
    if (store.type === 'galerias' && (f.technique.length || f.format)) store.setType('obras');
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.filters.close} onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.velo }} />
      <View accessibilityViewIsModal accessibilityLabel={t.filters.title} style={{ height: '82%', backgroundColor: colors.crema, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: colors.pista }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6 }}>
          <Headline size={30} em={-0.04}>{t.filters.title}</Headline>
          <HandLink label={t.filters.clear} size={22} onPress={() => setF(EMPTY_FILTERS)} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 }}>
          <Txt size={16} weight="black" style={{ marginTop: 8, marginBottom: 10 }}>{t.filters.technique}</Txt>
          <ChoiceChips options={TECHNIQUES} labels={labels.technique} value={f.technique} onChange={(technique) => set({ technique })} size="sm" />

          <Txt size={16} weight="black" style={{ marginTop: 20, marginBottom: 10 }}>{t.filters.format}</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FORMATS.map((k: Format) => {
              const on = f.format === k;
              const [name, sub] = t.filters.formats[k];
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${name}, ${sub}`}
                  onPress={() => set({ format: on ? null : k })}
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 18, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: on ? colors.tinta : colors.blanco, alignItems: 'center' }}
                >
                  <Txt size={15} weight="black" color={on ? colors.crema : colors.tinta}>{name}</Txt>
                  <Txt size={12} color={on ? colors.crema : colors.tinta}>{sub}</Txt>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 20, marginBottom: 4 }}>
            <Txt size={16} weight="black">{t.filters.distance}</Txt>
            <HandNote size={21} color={colors.cobalto}>{f.km ? t.filters.upTo(f.km) : t.filters.anyDistance}</HandNote>
          </View>
          {hasLocation ? (
            <Slider
              min={10}
              max={MAX_KM}
              step={10}
              value={km}
              onChange={(v) => set({ km: v >= MAX_KM ? null : v })}
              accessibilityLabel={t.filters.distanceA11y}
              valueText={f.km ? t.filters.upTo(f.km) : t.filters.anyDistance}
            />
          ) : (
            <Txt size={13}>{t.filters.noLocation}</Txt>
          )}

          <Txt size={16} weight="black" style={{ marginTop: 18, marginBottom: 8 }}>{t.filters.availability}</Txt>
          <ToggleRow label={t.filters.available} value={f.available} onChange={(available) => set({ available })} />
          <ToggleRow label={t.filters.commissions} value={f.acceptsCommissions} onChange={(acceptsCommissions) => set({ acceptsCommissions })} />
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 14, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.pista }}>
          <Button label={t.filters.apply(count)} onPress={apply} loading={live.isFetching && count == null} />
        </View>
      </View>
    </View>
  );
}
