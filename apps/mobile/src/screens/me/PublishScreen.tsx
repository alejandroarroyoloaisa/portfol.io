/**
 * 23 · Publicar obra (RF-08, RF-10, HU-02): fotos comprimidas en el móvil y subidas al momento (RNF-02),
 * ficha técnica, estado, serie y nota manuscrita. Borrador en el servidor y autoguardado local (RNF-12).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { ARTWORK_STATUS, TECHNIQUES, THEMES, createArtworkSchema, type Artwork } from '@portfolio/schemas';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import type { z } from 'zod';
import { useArtwork, useCreateArtwork, useDeleteArtwork, useUpdateArtwork } from '../../api/hooks/artworks';
import { useMe, useMySeries } from '../../api/hooks/me';
import { uploadImage } from '../../api/hooks/uploads';
import { Button, HandLink, IconButton, TextLink } from '../../components/Button';
import { Chip, ChipRow, ChoiceChips } from '../../components/Chip';
import { Blob, Tape, tapeColors } from '../../components/Decor';
import { Icon } from '../../components/Icon';
import { Screen, ScreenHeader, ScrollBody } from '../../components/Screen';
import { ConfirmSheet } from '../../components/Sheet';
import { InlineError, LoadingState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { FormField, numberTransform } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { mediaUrl } from '../../config';
import { labels, t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors, shadows, stroke } from '../../theme';
import { errorMessage, fieldErrors } from '../../utils/errors';
import { PermissionError, pickImages } from '../../utils/media';
import { localStore } from '../../utils/storage';

type FormIn = z.input<typeof createArtworkSchema>;
type FormOut = z.output<typeof createArtworkSchema>;
interface Photo { id: string; uri: string; key?: string; uploading: boolean }

const DRAFT_KEY = 'portfolio.publishDraft';
const MAX_PHOTOS = 8;

function PublishForm({ artwork, onClose, onDone }: { artwork?: Artwork; onClose: () => void; onDone: (where: 'notebook' | 'home') => void }) {
  const me = useMe().data;
  const series = useMySeries();
  const create = useCreateArtwork();
  const update = useUpdateArtwork(artwork?.id ?? '');
  const remove = useDeleteArtwork();
  const editing = !!artwork;
  const [photos, setPhotos] = useState<Photo[]>(
    artwork?.images.map((im, i) => ({ id: `old-${i}`, uri: mediaUrl(im.medium) ?? im.medium, uploading: false })) ?? [],
  );
  const [photosChanged, setPhotosChanged] = useState(false);
  const [newSeries, setNewSeries] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createArtworkSchema),
    defaultValues: artwork
      ? {
          title: artwork.title, technique: artwork.technique, widthCm: artwork.widthCm, heightCm: artwork.heightCm, year: artwork.year,
          status: artwork.status, note: artwork.note ?? '', annotation: artwork.annotation ?? '', themes: artwork.themes,
          seriesId: artwork.series?.id ?? null, imageKeys: [], draft: artwork.draft,
        }
      : { title: '', technique: me?.techniques[0] ?? 'acrilico', year: new Date().getFullYear(), status: 'exposicion', themes: [], note: '', annotation: '', seriesId: null, imageKeys: [], draft: false },
  });
  const values = useWatch({ control: form.control });

  // Recuperar el borrador local de una obra nueva.
  const loaded = useRef(false);
  useEffect(() => {
    if (editing || loaded.current) return;
    loaded.current = true;
    void localStore.getJSON<{ values: FormIn; photos: Photo[] }>(DRAFT_KEY).then((d) => {
      if (!d || (!d.values.title && !d.photos.length)) return;
      form.reset(d.values);
      setPhotos(d.photos.filter((p) => p.key));
      setRestored(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (editing || done) return;
    const id = setTimeout(() => void localStore.setJSON(DRAFT_KEY, { values, photos: photos.filter((p) => p.key) }), 600);
    return () => clearTimeout(id);
  }, [values, photos, editing, done]);

  const addPhotos = async () => {
    try {
      const assets = await pickImages({ multiple: true, limit: MAX_PHOTOS - (photosChanged ? photos.length : 0) });
      if (!assets.length) return;
      setPhotoError(null);
      const base = photosChanged ? photos : [];
      const pending = assets.slice(0, MAX_PHOTOS - base.length).map((a, i) => ({ id: `${Date.now()}-${i}`, uri: a.uri, uploading: true, asset: a }));
      setPhotosChanged(true);
      setPhotos([...base, ...pending.map(({ asset: _a, ...p }) => p)]);
      await Promise.all(
        pending.map(async (p) => {
          try {
            const r = await uploadImage(p.asset, 'obra');
            setPhotos((cur) => cur.map((x) => (x.id === p.id ? { ...x, key: r.key, uploading: false, uri: mediaUrl(r.image?.medium ?? r.url) ?? x.uri } : x)));
          } catch (e) {
            setPhotos((cur) => cur.filter((x) => x.id !== p.id));
            toast.error(e);
          }
        }),
      );
    } catch (e) {
      toast.error(e instanceof PermissionError ? t.publish.permission : e);
    }
  };

  const removePhoto = (id: string) => {
    setPhotosChanged(true);
    setPhotos((cur) => (photosChanged ? cur : []).filter((p) => p.id !== id));
  };

  const busyPhotos = photos.some((p) => p.uploading);
  const submit = (asDraft: boolean) =>
    void form.handleSubmit((v) => {
      const keys = photos.map((p) => p.key).filter((k): k is string => !!k);
      if (!asDraft && !keys.length && !(editing && !photosChanged && photos.length)) {
        setPhotoError(t.publish.needPhoto);
        return;
      }
      const body = {
        ...v,
        draft: asDraft,
        imageKeys: photosChanged || !editing ? keys : undefined,
        newSeriesTitle: newSeries ? v.newSeriesTitle : undefined,
        seriesId: newSeries ? undefined : v.seriesId,
        note: v.note || undefined,
        annotation: v.annotation || undefined,
      };
      const onError = (e: unknown) => Object.entries(fieldErrors(e)).forEach(([k, m]) => form.setError(k as keyof FormIn, { message: m }));
      const onSuccess = async () => {
        if (!editing) await localStore.remove(DRAFT_KEY);
        if (asDraft) {
          toast.ok(t.publish.draftSaved);
          onClose();
        } else if (editing && !artwork.draft) {
          toast.ok(t.publish.updated);
          onClose();
        } else {
          setDone(v.title);
        }
      };
      if (editing) update.mutate(body, { onSuccess, onError });
      else create.mutate(body as FormOut, { onSuccess, onError });
    })();

  const pending = create.isPending || update.isPending;
  const err = create.error ?? update.error;
  const main = photos[0];

  const overlay = done ? (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.verde, alignItems: 'center', justifyContent: 'center', padding: 30, overflow: 'hidden' }}>
      <Blob color={colors.mostaza} size={180} style={{ bottom: 60, right: -40 }} />
      <View style={{ width: 160, height: 190, padding: 8, backgroundColor: colors.blanco, transform: [{ rotate: '4deg' }] }}>
        {main ? <Image source={{ uri: main.uri }} style={{ flex: 1 }} contentFit="cover" accessibilityLabel={t.a11y.artwork(done)} /> : null}
      </View>
      <HandNote size={42} color={colors.mostaza} rotate={-3} style={{ marginTop: 26, textAlign: 'center' }}>{t.publish.doneTitle}</HandNote>
      <Txt size={16} lineHeight={23} color={colors.crema} center style={{ marginTop: 8, marginBottom: 26 }}>{t.publish.doneText(done, me?.counts.connections ?? 0)}</Txt>
      <Button label={t.publish.viewNotebook} variant="cream" style={{ alignSelf: 'stretch' }} onPress={() => onDone('notebook')} />
      <Pressable accessibilityRole="link" onPress={() => onDone('home')} style={{ marginTop: 14, minHeight: 44, justifyContent: 'center' }}>
        <Txt size={15} weight="bold" color={colors.crema} style={{ textDecorationLine: 'underline' }}>{t.publish.backHome}</Txt>
      </Pressable>
    </View>
  ) : null;

  return (
    <Screen
      keyboard
      overlay={overlay}
      footer={
        <>
          <InlineError message={photoError ?? (err && !Object.keys(fieldErrors(err)).length ? errorMessage(err) : null)} style={{ marginBottom: 10 }} />
          <Button label={editing && !artwork.draft ? t.publish.update : t.publish.publish} onPress={() => submit(false)} loading={pending} disabled={busyPhotos} />
          {!editing || artwork.draft ? (
            <HandLink label={t.publish.saveDraft} onPress={() => !pending && !busyPhotos && submit(true)} style={{ alignSelf: 'center', marginTop: 6 }} />
          ) : null}
        </>
      }
    >
      <ScreenHeader
        inline
        closeIcon="close"
        onBack={onClose}
        title={editing ? t.publish.editTitle : t.publish.title}
        right={!editing || artwork.draft ? <HandNote size={20} color={colors.cobalto}>{t.publish.status}</HandNote> : undefined}
      />
      <ScrollBody contentStyle={{ paddingTop: 8 }}>
        {restored ? <HandNote size={20} color={colors.verde}>{t.publish.restored}</HandNote> : null}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={main ? t.publish.addPhoto : t.publish.pickMain}
            onPress={() => void addPhotos()}
            style={{ width: 190, height: 220, padding: 8, backgroundColor: colors.blanco, transform: [{ rotate: '-3deg' }], boxShadow: shadows.polaroid }}
          >
            {main ? (
              <Image source={{ uri: main.uri }} style={{ flex: 1 }} contentFit="cover" accessibilityLabel={t.a11y.artwork(values.title || t.publish.title)} />
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.arena, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="image" size={34} />
                <HandNote size={19} style={{ textAlign: 'center' }}>{t.publish.pickMain}</HandNote>
              </View>
            )}
            {main?.uploading ? <ActivityIndicator color={colors.cobalto} style={{ position: 'absolute', top: 100, left: 85 }} /> : null}
            <Tape width={70} height={20} rotate={5} color={tapeColors.coral} style={{ top: -10, left: 60 }} />
          </Pressable>
          <View style={{ gap: 8, flex: 1 }}>
            {photos.length < MAX_PHOTOS ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.publish.addDetail}
                onPress={() => void addPhotos()}
                style={{ width: 72, height: 72, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tinta, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="plus" size={22} strokeWidth={2.4} />
              </Pressable>
            ) : null}
            <HandNote size={19} lineHeight={19}>{busyPhotos ? t.publish.uploading : t.publish.detailNote}</HandNote>
          </View>
        </View>
        {photos.length > 1 || (photos.length === 1 && photosChanged) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 14 }}>
            {photos.map((p, i) => (
              <View key={p.id} style={{ width: 64, height: 64 }}>
                <Image source={{ uri: p.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} contentFit="cover" />
                {p.uploading ? <ActivityIndicator color={colors.cobalto} style={{ position: 'absolute', top: 22, left: 22 }} /> : null}
                <IconButton icon="close" size={28} variant="white" accessibilityLabel={t.publish.removePhoto(i + 1)} onPress={() => removePhoto(p.id)} style={{ position: 'absolute', top: -8, right: -8 }} />
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ gap: 14, marginTop: 22 }}>
          <FormField control={form.control} name="title" label={t.publish.titleLabel} height={50} maxLength={120} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <FormField control={form.control} name="widthCm" label={t.publish.width} keyboardType="decimal-pad" transform={numberTransform} containerStyle={{ flex: 1 }} height={50} />
            <FormField control={form.control} name="heightCm" label={t.publish.height} keyboardType="decimal-pad" transform={numberTransform} containerStyle={{ flex: 1 }} height={50} />
            <FormField control={form.control} name="year" label={t.publish.year} keyboardType="number-pad" transform={numberTransform} containerStyle={{ flex: 1 }} height={50} maxLength={4} />
          </View>
        </View>

        <Txt size={14} weight="black" style={{ marginTop: 20, marginBottom: 8 }}>{t.publish.technique}</Txt>
        <Controller control={form.control} name="technique" render={({ field }) => (
          <ChoiceChips options={TECHNIQUES} labels={labels.technique} value={field.value ? [field.value] : []} onChange={(v) => v[0] && field.onChange(v[0])} single size="sm" />
        )} />

        <Txt size={14} weight="black" style={{ marginTop: 20, marginBottom: 8 }}>{t.publish.state}</Txt>
        <Controller control={form.control} name="status" render={({ field }) => (
          <View style={{ gap: 8 }}>
            {ARTWORK_STATUS.map((k) => {
              const on = field.value === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => field.onChange(k)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 18, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: on ? colors.tinta : colors.blanco }}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? colors.crema : colors.tinta, backgroundColor: on ? colors.mostaza : 'transparent' }} />
                  <Txt size={15} weight="bold" color={on ? colors.crema : colors.tinta}>{t.publish.states[k]}</Txt>
                </Pressable>
              );
            })}
          </View>
        )} />

        <Txt size={14} weight="black" style={{ marginTop: 20, marginBottom: 8 }}>{t.publish.themes}</Txt>
        <Controller control={form.control} name="themes" render={({ field }) => (
          <ChoiceChips options={THEMES} labels={labels.theme} value={field.value ?? []} onChange={field.onChange} max={5} size="sm" selectedColor={colors.cobalto} selectedTextColor={colors.crema} />
        )} />

        <Txt size={14} weight="black" style={{ marginTop: 20, marginBottom: 8 }}>{t.publish.series}</Txt>
        <Controller control={form.control} name="seriesId" render={({ field }) => (
          <ChipRow>
            <Chip label={t.publish.noSeries} size="sm" radio selected={!newSeries && !field.value} selectedColor={colors.tinta} selectedTextColor={colors.crema} onPress={() => { setNewSeries(false); field.onChange(null); }} />
            {series.data?.map((s) => (
              <Chip key={s.id} label={s.title} size="sm" radio selected={!newSeries && field.value === s.id} selectedColor={colors.tinta} selectedTextColor={colors.crema} onPress={() => { setNewSeries(false); field.onChange(s.id); }} />
            ))}
            <Chip label={t.publish.newSeries} size="sm" radio selected={newSeries} selectedColor={colors.tinta} selectedTextColor={colors.crema} onPress={() => setNewSeries(true)} />
          </ChipRow>
        )} />
        {newSeries ? <FormField control={form.control} name="newSeriesTitle" placeholder={t.publish.newSeriesPlaceholder} accessibilityLabel={t.publish.newSeriesPlaceholder} containerStyle={{ marginTop: 10 }} height={48} /> : null}

        <View style={{ gap: 14, marginTop: 20 }}>
          <FormField control={form.control} name="annotation" label={t.publish.annotation} labelRight={<HandNote size={17} color={colors.cobalto}>{t.common.optional}</HandNote>} placeholder={t.publish.annotationPlaceholder} hand maxLength={40} height={50} />
          <FormField control={form.control} name="note" label={t.publish.note} placeholder={t.publish.notePlaceholder} multiline hand maxLength={600} />
        </View>

        {editing ? (
          <TextLink label={t.publish.deleteArtwork} color={colors.coralTexto} onPress={() => setConfirmDelete(true)} style={{ marginTop: 22, alignSelf: 'flex-start' }} />
        ) : null}
      </ScrollBody>
      {editing ? (
        <ConfirmSheet
          visible={confirmDelete}
          title={t.publish.deleteTitle}
          text={t.publish.deleteText}
          confirmLabel={t.publish.deleteArtwork}
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove.mutateAsync(artwork.id);
            toast.ok(t.publish.deleted);
            onDone('notebook');
          }}
        />
      ) : null}
    </Screen>
  );
}

export function PublishScreen({ navigation, route }: RootScreenProps<'Publish'>) {
  const id = route.params?.artworkId;
  const q = useArtwork(id ?? '');
  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs', { screen: 'Feed' }));
  const done = (where: 'notebook' | 'home') => {
    navigation.goBack();
    navigation.navigate('Tabs', { screen: where === 'notebook' ? 'MyProfile' : 'Feed' });
  };
  if (id && !q.data) return <Screen>{q.isPending ? <LoadingState /> : <InlineError message={errorMessage(q.error)} style={{ margin: 18 }} />}</Screen>;
  return <PublishForm artwork={q.data} onClose={close} onDone={done} />;
}

