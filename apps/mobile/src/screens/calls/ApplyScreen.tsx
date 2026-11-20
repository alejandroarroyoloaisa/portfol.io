/**
 * 14 · Enviar solicitud (RF-24, RF-25, CU-07): obras del cuaderno (hasta N), carta precargada (≤ 300 palabras)
 * y documentos en PDF. Se puede guardar como borrador; lo escrito se guarda también en el móvil (RNF-12).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { countWords, createApplicationSchema, type ApplicationDocument, type Artwork, type CallDetail } from '@portfolio/schemas';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { z } from 'zod';
import { useApplication, useCall, useSubmitApplication } from '../../api/hooks/calls';
import { useMe, useMyArtworks } from '../../api/hooks/me';
import { uploadFile } from '../../api/hooks/uploads';
import { ArtworkImage } from '../../components/ArtworkImage';
import { Button, HandLink, IconButton } from '../../components/Button';
import { Blob } from '../../components/Decor';
import { Icon } from '../../components/Icon';
import { Screen, ScrollBody } from '../../components/Screen';
import { ScreenQuery } from '../../components/ScreenQuery';
import { EmptyState, InlineError, LoadingState } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import type { RootScreenProps } from '../../navigation/types';
import { colors, shadows } from '../../theme';
import { errorMessage } from '../../utils/errors';
import { formatBytes } from '../../utils/format';
import { pickPdf } from '../../utils/media';
import { localStore } from '../../utils/storage';

type FormIn = z.input<typeof createApplicationSchema>;
type FormOut = z.output<typeof createApplicationSchema>;
type Doc = Omit<ApplicationDocument, 'url'>;
type DocKind = Doc['kind'];

const LAST_DOCS = 'portfolio.lastDocs';
const localKey = (callId: string) => `portfolio.applyDraft.${callId}`;

function ArtworkPick({ a, selected, index, onPress }: { a: Artwork; selected: boolean; index: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={t.a11y.artwork(a.title)}
      onPress={onPress}
      style={{
        width: '48%', padding: 6, backgroundColor: colors.blanco, borderWidth: 3, borderColor: selected ? colors.cobalto : 'transparent',
        transform: [{ rotate: `${[-1.5, 1.5, 1, -1][index % 4]}deg` }], boxShadow: shadows.soft,
      }}
    >
      <ArtworkImage image={a.images[0]} title={a.title} variant="thumb" style={{ aspectRatio: 1 }} />
      <Txt size={13} weight="bold" numberOfLines={1} style={{ marginTop: 4 }}>{a.title}</Txt>
      {selected ? (
        <View style={{ position: 'absolute', top: -8, right: -8, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cobalto, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={16} color={colors.crema} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function DocRow({ kind, label, doc, required, onPick, onRemove, busy, fromBefore }: {
  kind: DocKind; label: string; doc?: Doc; required?: boolean; onPick: () => void; onRemove: () => void; busy: boolean; fromBefore?: boolean;
}) {
  if (!doc) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.apply.upload(label)}
        onPress={onPick}
        disabled={busy}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tinta }}
      >
        {busy ? <ActivityIndicator color={colors.cobalto} /> : <Icon name="file" size={20} />}
        <Txt size={15} weight="bold" style={{ flex: 1 }}>{busy ? t.apply.uploading : t.apply.upload(label)}</Txt>
        {required ? <HandNote size={18} color={colors.anotacion}>{t.apply.required}</HandNote> : null}
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.blanco }}>
      <Icon name="check" size={20} color={colors.verde} strokeWidth={2.6} />
      <View style={{ flex: 1 }}>
        <Txt size={15} weight="bold" numberOfLines={1}>{doc.name}</Txt>
        <HandNote size={17}>{[kind === 'otro' ? null : label, fromBefore ? t.apply.fromBefore : formatBytes(doc.sizeBytes)].filter(Boolean).join(' · ')}</HandNote>
      </View>
      <HandLink label={t.apply.replace} size={18} onPress={onPick} accessibilityLabel={`${t.apply.replace} ${label}`} />
      <IconButton icon="close" size={36} variant="outline" accessibilityLabel={`${t.apply.remove} ${doc.name}`} onPress={onRemove} />
    </View>
  );
}

function ApplyForm({ call, artworks, draft }: { call: CallDetail; artworks: Artwork[]; draft?: { id: string; artworkIds: string[]; letter: string; documents: Doc[] } }) {
  const { nav } = useAppNavigation();
  const me = useMe().data;
  const submit = useSubmitApplication(call.id);
  const [sent, setSent] = useState<{ n: number; first?: Artwork } | null>(null);
  const [uploading, setUploading] = useState<DocKind | null>(null);
  const [restored, setRestored] = useState(false);
  const [prefilledDocs, setPrefilledDocs] = useState<string[]>([]);
  const max = call.maxArtworks;

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { artworkIds: draft?.artworkIds ?? [], letter: draft?.letter || me?.bio || '', documents: draft?.documents ?? [], submit: true },
  });
  const values = useWatch({ control: form.control });
  const ids = values.artworkIds ?? [];
  const docs = (values.documents ?? []) as Doc[];
  const words = countWords(values.letter ?? '');

  // Sin borrador en el servidor: se recupera lo escrito en el móvil o se precargan los últimos documentos usados.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || draft) return;
    loaded.current = true;
    void (async () => {
      const local = await localStore.getJSON<FormIn>(localKey(call.id));
      if (local && ((local.artworkIds?.length ?? 0) > 0 || (local.documents?.length ?? 0) > 0)) {
        form.reset({ ...local, submit: true });
        setRestored(true);
        return;
      }
      const last = await localStore.getJSON<Doc[]>(LAST_DOCS);
      const wanted = (last ?? []).filter((d) => (d.kind === 'cv' && call.requiresCv) || (d.kind === 'dossier' && call.requiresDossier));
      if (wanted.length) {
        form.setValue('documents', wanted);
        setPrefilledDocs(wanted.map((d) => d.key));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoguardado local (RNF-12)
  useEffect(() => {
    if (sent) return;
    const id = setTimeout(() => void localStore.setJSON(localKey(call.id), { artworkIds: ids, letter: values.letter, documents: docs }), 600);
    return () => clearTimeout(id);
  }, [ids, values.letter, docs, call.id, sent]);

  const toggle = (id: string) => {
    if (ids.includes(id)) form.setValue('artworkIds', ids.filter((x) => x !== id));
    else if (ids.length < max) form.setValue('artworkIds', [...ids, id]);
    else toast.error(t.apply.maxReached(max)); // CU-07 4a: la selección no cambia
  };

  const setDoc = (kind: DocKind, doc: Doc | null, replaceKey?: string) => {
    const rest = docs.filter((d) => (kind === 'otro' ? d.key !== replaceKey : d.kind !== kind));
    form.setValue('documents', doc ? [...rest, doc] : rest);
  };

  const pick = async (kind: DocKind, replaceKey?: string) => {
    try {
      const file = await pickPdf();
      if (!file) return;
      setUploading(kind);
      const r = await uploadFile(file, 'documento');
      const doc: Doc = { kind, key: r.key, name: r.name || file.name, sizeBytes: r.sizeBytes ?? file.size ?? 0 };
      setDoc(kind, doc, replaceKey);
      if (kind !== 'otro') {
        const last = (await localStore.getJSON<Doc[]>(LAST_DOCS)) ?? [];
        await localStore.setJSON(LAST_DOCS, [...last.filter((d) => d.kind !== kind), doc]);
      }
    } catch (e) {
      toast.error(e);
    } finally {
      setUploading(null);
    }
  };

  const send = (asDraft: boolean) =>
    void form.handleSubmit((v) =>
      submit.mutate(
        { draftId: draft?.id, body: { ...v, submit: !asDraft } },
        {
          onSuccess: async () => {
            await localStore.remove(localKey(call.id));
            if (asDraft) {
              toast.ok(t.apply.draftSaved);
              nav.goBack();
            } else {
              setSent({ n: v.artworkIds.length, first: artworks.find((a) => a.id === v.artworkIds[0]) });
            }
          },
        },
      ),
    )();

  const cv = docs.find((d) => d.kind === 'cv');
  const dossier = docs.find((d) => d.kind === 'dossier');
  const others = docs.filter((d) => d.kind === 'otro');
  const letterError = form.formState.errors.letter?.message;

  const overlay = sent ? (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.cobalto, alignItems: 'center', justifyContent: 'center', padding: 30, overflow: 'hidden' }}>
      <Blob color={colors.coral} size={180} style={{ top: 40, left: -40 }} />
      <View style={{ width: 150, height: 170, padding: 8, backgroundColor: colors.blanco, transform: [{ rotate: '-4deg' }] }}>
        <ArtworkImage image={sent.first?.images[0]} title={sent.first?.title ?? call.title} style={{ flex: 1 }} />
      </View>
      <HandNote size={40} color={colors.mostaza} rotate={-3} style={{ marginTop: 26, textAlign: 'center' }}>{t.apply.sentTitle}</HandNote>
      <Txt size={16} lineHeight={23} color={colors.crema} center style={{ marginTop: 8, marginBottom: 26 }}>{t.apply.sentText(call.organization.name, sent.n)}</Txt>
      <Button label={t.apply.viewApplications} variant="coral" style={{ alignSelf: 'stretch' }} onPress={() => nav.navigate('Applications')} />
      <Pressable accessibilityRole="link" onPress={() => nav.navigate('Tabs', { screen: 'Calls' })} style={{ marginTop: 14, minHeight: 44, justifyContent: 'center' }}>
        <Txt size={15} weight="bold" color={colors.crema} style={{ textDecorationLine: 'underline' }}>{t.apply.backToCalls}</Txt>
      </Pressable>
    </View>
  ) : null;

  return (
    <Screen
      keyboard
      overlay={overlay}
      footer={
        <>
          <InlineError message={submit.error ? errorMessage(submit.error) : null} style={{ marginBottom: 10 }} />
          <Button label={t.apply.send} variant="dark" onPress={() => send(false)} loading={submit.isPending} disabled={ids.length === 0 || words > 300} />
          <HandLink label={t.apply.saveDraft} onPress={() => send(true)} style={{ alignSelf: 'center', marginTop: 6 }} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
        <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => nav.goBack()} />
        <View style={{ flex: 1 }}>
          <Txt size={13} weight="bold" numberOfLines={1}>{call.title}</Txt>
          <Headline size={26} em={-0.04} lineHeight={28}>{t.apply.title}</Headline>
        </View>
      </View>
      <ScrollBody contentStyle={{ paddingTop: 8 }}>
        {restored ? <HandNote size={20} color={colors.verde}>{t.apply.localDraft}</HandNote> : null}
        <Txt size={18} weight="black" style={{ marginTop: 6 }}>{t.apply.step1(max)}</Txt>
        <HandNote size={21} color={colors.cobalto}>{t.apply.selected(ids.length, max)}</HandNote>
        {artworks.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 10 }}>
            {artworks.map((a, i) => <ArtworkPick key={a.id} a={a} index={i} selected={ids.includes(a.id)} onPress={() => toggle(a.id)} />)}
          </View>
        ) : (
          <EmptyState title={t.apply.publishFirst} text={t.apply.noArtworks} action={t.apply.publishFirst} onAction={() => nav.navigate('Publish')} />
        )}

        <Controller
          control={form.control}
          name="letter"
          render={({ field }) => (
            <TextField
              label={t.apply.step2}
              labelRight={<HandNote size={18} color={words > 300 ? colors.coralTexto : colors.cobalto}>{t.apply.words(words)}</HandNote>}
              accessibilityLabel={t.apply.letterA11y}
              multiline
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={letterError}
              containerStyle={{ marginTop: 22 }}
              style={{ minHeight: 150, fontSize: 15 }}
            />
          )}
        />

        <Txt size={18} weight="black" style={{ marginTop: 20, marginBottom: 8 }}>{t.apply.step3}</Txt>
        <View style={{ gap: 8 }}>
          {call.requiresCv || cv ? (
            <DocRow kind="cv" label={t.apply.cv} doc={cv} required={call.requiresCv} busy={uploading === 'cv'} fromBefore={!!cv && prefilledDocs.includes(cv.key)} onPick={() => void pick('cv')} onRemove={() => setDoc('cv', null)} />
          ) : null}
          {call.requiresDossier || dossier ? (
            <DocRow kind="dossier" label={t.apply.dossier} doc={dossier} required={call.requiresDossier} busy={uploading === 'dossier'} fromBefore={!!dossier && prefilledDocs.includes(dossier.key)} onPick={() => void pick('dossier')} onRemove={() => setDoc('dossier', null)} />
          ) : null}
          {others.map((d) => (
            <DocRow key={d.key} kind="otro" label={t.apply.other} doc={d} busy={false} onPick={() => void pick('otro', d.key)} onRemove={() => setDoc('otro', null, d.key)} />
          ))}
          {docs.length < 5 ? <DocRow kind="otro" label={t.apply.other} busy={uploading === 'otro'} onPick={() => void pick('otro')} onRemove={() => undefined} /> : null}
        </View>
      </ScrollBody>
    </Screen>
  );
}

export function ApplyScreen({ route }: RootScreenProps<'Apply'>) {
  const call = useCall(route.params.callId);
  const mine = useMyArtworks();
  const draftId = call.data?.myApplication?.status === 'borrador' ? call.data.myApplication.id : undefined;
  const draft = useApplication(draftId);
  return (
    <ScreenQuery query={call}>
      {(c) =>
        mine.data === undefined || (draftId && draft.data === undefined && !draft.error) ? (
          <Screen><LoadingState /></Screen>
        ) : (
          <ApplyForm
            call={c}
            artworks={mine.data.filter((a) => !a.draft)}
            draft={draft.data ? { id: draft.data.id, artworkIds: draft.data.artworks.map((a) => a.id), letter: draft.data.letter, documents: draft.data.documents } : undefined}
          />
        )
      }
    </ScreenQuery>
  );
}
