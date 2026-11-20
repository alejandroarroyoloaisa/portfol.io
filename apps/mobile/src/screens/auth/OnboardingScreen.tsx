/** 04 · Tu obra: técnicas, temas, ubicación del taller y disponibilidad (RF-04, HU-01). */
import { ORG_ROLES, TECHNIQUES, THEMES, type Technique, type Theme } from '@portfolio/schemas';
import { useState } from 'react';
import { View } from 'react-native';
import { useOnboarding } from '../../api/hooks/auth';
import { Button, IconButton } from '../../components/Button';
import { ChoiceChips, ToggleRow } from '../../components/Chip';
import { CityPicker } from '../../components/CityPicker';
import { Screen, ScrollBody } from '../../components/Screen';
import { InlineError } from '../../components/States';
import { StepBars } from '../../components/Status';
import { HandNote, Headline, Txt } from '../../components/Text';
import { labels, t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import type { City } from '../../utils/cities';
import { errorMessage } from '../../utils/errors';

export function OnboardingScreen({ navigation, route }: RootScreenProps<'Onboarding'>) {
  const { role } = route.params;
  const isOrg = ORG_ROLES.includes(role);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [commissions, setCommissions] = useState(role === 'artista');
  const [openToCalls, setOpenToCalls] = useState(true);
  const onboarding = useOnboarding();

  const submit = () =>
    onboarding.mutate({
      role,
      techniques,
      themes,
      location: city ?? undefined,
      acceptsCommissions: role === 'artista' ? commissions : undefined,
      openToCalls: role === 'artista' ? openToCalls : undefined,
    });

  return (
    <Screen
      footerBg={colors.crema}
      footer={
        <>
          <InlineError message={onboarding.error ? errorMessage(onboarding.error) : null} style={{ marginBottom: 10 }} />
          <Button label={t.onboarding.enter} onPress={submit} loading={onboarding.isPending} />
        </>
      }
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => navigation.goBack()} />
          <HandNote size={22}>{t.role.step(2, 2)}</HandNote>
        </View>
        <View style={{ marginTop: 14 }}><StepBars total={2} done={2} /></View>
        <Headline size={38} em={-0.04} style={{ marginTop: 22, marginBottom: 4 }}>{isOrg ? t.onboarding.titleOrg : t.onboarding.title}</Headline>
        <Txt size={15}>{t.onboarding.intro}</Txt>
      </View>
      <ScrollBody contentStyle={{ paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <Txt size={17} weight="black">{t.onboarding.techniques}</Txt>
          <HandNote size={20} color={colors.cobalto}>{t.onboarding.techniquesChosen(techniques.length)}</HandNote>
        </View>
        <ChoiceChips options={TECHNIQUES} labels={labels.technique} value={techniques} onChange={setTechniques} max={8} />

        <Txt size={17} weight="black" style={{ marginTop: 24, marginBottom: 10 }}>{isOrg ? t.onboarding.themesOrg : t.onboarding.themes}</Txt>
        <ChoiceChips options={THEMES} labels={labels.theme} value={themes} onChange={setThemes} max={8} selectedColor={colors.cobalto} selectedTextColor={colors.crema} />

        <View style={{ marginTop: 24 }}>
          <CityPicker label={isOrg ? t.onboarding.whereOrg : t.onboarding.where} value={city} onChange={setCity} />
        </View>

        {role === 'artista' ? (
          <View style={{ marginTop: 18 }}>
            <ToggleRow label={t.onboarding.commissions} sub={t.onboarding.commissionsSub} value={commissions} onChange={setCommissions} />
            <ToggleRow label={t.onboarding.openToCalls} sub={t.onboarding.openToCallsSub} value={openToCalls} onChange={setOpenToCalls} />
          </View>
        ) : null}
      </ScrollBody>
    </Screen>
  );
}
