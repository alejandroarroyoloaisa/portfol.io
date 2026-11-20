/** 21 · Editar perfil: foto, titular, ubicación, biografía, técnicas, disponibilidad y trayectoria (RF-07). */
import { zodResolver } from '@hookform/resolvers/zod';
import { TECHNIQUES, THEMES, updateMeSchema, type Me } from '@portfolio/schemas';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, View } from 'react-native';
import type { z } from 'zod';
import { useMe, useUpdateMe } from '../../api/hooks/me';
import { uploadImage } from '../../api/hooks/uploads';
import { Avatar } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { ChoiceChips, ToggleRow } from '../../components/Chip';
import { CityPicker } from '../../components/CityPicker';
import { Screen, ScreenHeader, ScrollBody } from '../../components/Screen';
import { InlineError, LoadingState } from '../../components/States';
import { HandNote, Txt } from '../../components/Text';
import { FormField, TextField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { labels, t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors, shadows } from '../../theme';
import { errorMessage, fieldErrors } from '../../utils/errors';
import { pickImages, PermissionError } from '../../utils/media';

type FormIn = z.input<typeof updateMeSchema>;
type FormOut = z.output<typeof updateMeSchema>;
const BIO_MAX = 600;

function EditForm({ me, onDone }: { me: Me; onDone: () => void }) {
  const update = useUpdateMe();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [careerYear, setCareerYear] = useState(String(new Date().getFullYear()));
  const [careerText, setCareerText] = useState('');
  const isArtist = me.role === 'artista';

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(updateMeSchema),
    defaultValues: {
      name: me.name,
      handle: me.handle,
      headline: me.headline ?? '',
      bio: me.bio ?? '',
      location: me.location ?? undefined,
      acceptsCommissions: me.acceptsCommissions,
      openToCalls: me.openToCalls,
      techniques: me.techniques,
      themes: me.themes,
      career: me.career,
      representedBy: me.representedBy ?? '',
    },
  });
  const career = useFieldArray({ control: form.control, name: 'career' });
  const bio = useWatch({ control: form.control, name: 'bio' }) ?? '';

  const changePhoto = async () => {
    try {
      const [asset] = await pickImages({ square: true });
      if (!asset) return;
      setAvatarPreview(asset.uri);
      setUploading(true);
      const r = await uploadImage(asset, 'avatar');
      form.setValue('avatarKey', r.key, { shouldDirty: true });
    } catch (e) {
      setAvatarPreview(null);
      toast.error(e instanceof PermissionError ? t.publish.permission : e);
    } finally {
      setUploading(false);
    }
  };

  const save = () =>
    void form.handleSubmit((v) =>
      update.mutate(
        { ...v, representedBy: v.representedBy ? v.representedBy : null },
        {
          onSuccess: () => {
            toast.ok(t.edit.saved);
            onDone();
          },
          onError: (e) => Object.entries(fieldErrors(e)).forEach(([k, m]) => form.setError(k as keyof FormIn, { message: m })),
        },
      ),
    )();

  const addCareer = () => {
    const year = Number(careerYear);
    if (!careerText.trim() || !year) return;
    career.prepend({ year, text: careerText.trim() });
    setCareerText('');
  };

  return (
    <Screen keyboard>
      <ScreenHeader
        inline
        closeIcon="close"
        title={t.edit.title}
        right={<Button label={t.edit.save} size="sm" onPress={save} loading={update.isPending || uploading} disabled={uploading} />}
      />
      <ScrollBody contentStyle={{ paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 96, height: 112, padding: 6, backgroundColor: colors.blanco, transform: [{ rotate: '-4deg' }], boxShadow: shadows.polaroid }}>
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={{ flex: 1 }} contentFit="cover" accessibilityLabel={t.a11y.avatar(me.name)} />
            ) : (
              <Avatar user={me} square color={colors.cobalto} size={84} fontSize={30} />
            )}
            {uploading ? <ActivityIndicator color={colors.cobalto} style={{ position: 'absolute', top: 40, left: 36 }} /> : null}
          </View>
          <View>
            <Button label={t.edit.photo} variant="white" size="sm" onPress={() => void changePhoto()} disabled={uploading} />
            <HandNote size={19} style={{ marginTop: 4 }}>{uploading ? t.edit.uploading : t.edit.photoNote}</HandNote>
          </View>
        </View>

        <View style={{ gap: 14, marginTop: 20 }}>
          <FormField control={form.control} name="name" label={t.edit.name} height={50} />
          <FormField control={form.control} name="handle" label={t.edit.handle} labelRight={<HandNote size={17} color={colors.cobalto}>{t.edit.handleHint}</HandNote>} autoCapitalize="none" autoCorrect={false} height={50} />
          <FormField control={form.control} name="headline" label={t.edit.headline} placeholder={t.edit.headlinePlaceholder} height={50} />
          <Controller
            control={form.control}
            name="location"
            render={({ field, fieldState }) => (
              <CityPicker label={t.edit.location} value={field.value ? { ...field.value, country: 'ES' } : null} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            label={t.edit.bio}
            labelRight={<HandNote size={18} color={bio.length > BIO_MAX ? colors.coralTexto : colors.cobalto}>{t.edit.bioCount(bio.length, BIO_MAX)}</HandNote>}
            multiline
            maxLength={BIO_MAX}
            style={{ fontSize: 15 }}
          />
          {isArtist ? <FormField control={form.control} name="representedBy" label={t.edit.representedBy} height={50} /> : null}
        </View>

        <Txt size={17} weight="black" style={{ marginTop: 22, marginBottom: 8 }}>{t.edit.techniques}</Txt>
        <Controller control={form.control} name="techniques" render={({ field }) => (
          <ChoiceChips options={TECHNIQUES} labels={labels.technique} value={field.value ?? []} onChange={field.onChange} max={8} size="sm" />
        )} />
        <Txt size={17} weight="black" style={{ marginTop: 18, marginBottom: 8 }}>{t.edit.themes}</Txt>
        <Controller control={form.control} name="themes" render={({ field }) => (
          <ChoiceChips options={THEMES} labels={labels.theme} value={field.value ?? []} onChange={field.onChange} max={8} size="sm" selectedColor={colors.cobalto} selectedTextColor={colors.crema} />
        )} />

        {isArtist ? (
          <>
            <Txt size={17} weight="black" style={{ marginTop: 22, marginBottom: 8 }}>{t.edit.availableFor}</Txt>
            <Controller control={form.control} name="acceptsCommissions" render={({ field }) => <ToggleRow label={t.edit.commissions} value={!!field.value} onChange={field.onChange} />} />
            <Controller control={form.control} name="openToCalls" render={({ field }) => <ToggleRow label={t.edit.calls} value={!!field.value} onChange={field.onChange} />} />
          </>
        ) : null}

        <Txt size={17} weight="black" style={{ marginTop: 18, marginBottom: 8 }}>{t.edit.career}</Txt>
        <View style={{ gap: 8 }}>
          {career.fields.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.blanco }}>
              <View style={{ flex: 1 }}>
                <HandNote size={19}>{c.year}</HandNote>
                <Txt size={15} weight="black">{c.text}</Txt>
              </View>
              <IconButton icon="close" size={36} accessibilityLabel={t.edit.removeCareer(c.text)} onPress={() => career.remove(i)} />
            </View>
          ))}
        </View>
        <View style={{ marginTop: 8, padding: 12, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.tinta, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextField label={t.edit.careerYear} value={careerYear} onChangeText={setCareerYear} keyboardType="number-pad" maxLength={4} containerStyle={{ width: 96 }} height={46} />
            <TextField label={t.edit.careerText} value={careerText} onChangeText={setCareerText} placeholder={t.edit.careerTextPlaceholder} containerStyle={{ flex: 1 }} height={46} maxLength={160} />
          </View>
          <Button label={t.edit.addCareer} variant="outline" size="sm" onPress={addCareer} disabled={!careerText.trim()} />
        </View>
        <InlineError message={update.error && !Object.keys(fieldErrors(update.error)).length ? errorMessage(update.error) : null} style={{ marginTop: 14 }} />
      </ScrollBody>
    </Screen>
  );
}

export function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const me = useMe().data;
  if (!me) return <Screen><LoadingState /></Screen>;
  return <EditForm me={me} onDone={() => navigation.goBack()} />;
}
