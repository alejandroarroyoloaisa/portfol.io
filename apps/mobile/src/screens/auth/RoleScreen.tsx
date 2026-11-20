/** 03 · Elegir perfil: cuatro tarjetas recortadas; la nota explica qué cambia (RF-03). */
import { SIGNUP_ROLES } from '@portfolio/schemas';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { signOut } from '../../api/hooks/auth';
import { Button, IconButton } from '../../components/Button';
import { Screen, ScrollBody } from '../../components/Screen';
import { StepBars } from '../../components/Status';
import { HandNote, Headline, Txt } from '../../components/Text';
import { t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors, shapeRadii, stroke, type Shape } from '../../theme';

type SignupRole = (typeof SIGNUP_ROLES)[number];

const LOOK: Record<SignupRole, { color: string; shape: Shape; rot: number }> = {
  artista: { color: colors.coral, shape: 'blob', rot: -1 },
  galeria: { color: colors.cobalto, shape: 'square', rot: 0.8 },
  coleccionista: { color: colors.mostaza, shape: 'circle', rot: -0.6 },
  institucion: { color: colors.verde, shape: 'leaf', rot: 1 },
};

export function RoleScreen({ navigation }: RootScreenProps<'Role'>) {
  const [role, setRole] = useState<SignupRole>('artista');
  return (
    <Screen
      footerBg={colors.crema}
      footer={
        <>
          <HandNote size={21} color={colors.cobalto} style={{ textAlign: 'center', marginBottom: 8 }}>{t.role.options[role].hint}</HandNote>
          <Button label={t.role.continue} variant="dark" onPress={() => navigation.navigate('Onboarding', { role })} />
        </>
      }
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Volver desde aquí = salir de la cuenta recién creada sin completar el registro */}
          <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => void signOut()} />
          <HandNote size={22}>{t.role.step(1, 2)}</HandNote>
        </View>
        <View style={{ marginTop: 14 }}><StepBars total={2} done={1} /></View>
        <Headline size={38} em={-0.04} style={{ marginTop: 22, marginBottom: 4 }}>{t.role.title}</Headline>
        <Txt size={15}>{t.role.intro}</Txt>
      </View>
      <ScrollBody contentStyle={{ paddingTop: 18, gap: 12 }}>
        {SIGNUP_ROLES.map((r) => {
          const on = r === role;
          const look = LOOK[r];
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${t.role.options[r].name}. ${t.role.options[r].desc}`}
              onPress={() => setRole(r)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22,
                borderWidth: on ? 3 : stroke, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? colors.tinta : colors.gris,
                backgroundColor: on ? colors.blanco : 'transparent', transform: [{ rotate: `${look.rot}deg` }],
              }}
            >
              <View style={[{ width: 56, height: 56, backgroundColor: look.color }, shapeRadii(look.shape, 56)]} />
              <View style={{ flex: 1 }}>
                <Txt size={19} weight="black">{t.role.options[r].name}</Txt>
                <Txt size={14} lineHeight={19} style={{ marginTop: 2 }}>{t.role.options[r].desc}</Txt>
              </View>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: stroke, borderColor: colors.tinta, backgroundColor: on ? colors.tinta : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollBody>
    </Screen>
  );
}
