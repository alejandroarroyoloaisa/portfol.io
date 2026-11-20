/** 02 · Registro / acceso: selector entre crear cuenta y entrar (RF-01, RF-02). */
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@portfolio/schemas';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { useLogin, useRegister } from '../../api/hooks/auth';
import { Button, HandLink, IconButton } from '../../components/Button';
import { Segmented } from '../../components/Chip';
import { Blob } from '../../components/Decor';
import { ScrollBody, Screen } from '../../components/Screen';
import { InlineError } from '../../components/States';
import { HandNote, Headline, Txt } from '../../components/Text';
import { FormField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { errorMessage, fieldErrors } from '../../utils/errors';

type Mode = 'registro' | 'acceso';

function RegisterForm() {
  const register = useRegister();
  const { control, handleSubmit, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const submit = () =>
    void handleSubmit((v) =>
      register.mutate(v, {
        onError: (e) => Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k as keyof RegisterInput, { message: m })),
      }),
    )();
  return (
    <>
      <View style={{ gap: 14, marginTop: 22 }}>
        <FormField control={control} name="name" label={t.auth.name} placeholder={t.auth.namePlaceholder} autoComplete="name" textContentType="name" />
        <FormField control={control} name="email" label={t.auth.email} placeholder={t.auth.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <FormField
          control={control} name="password" label={t.auth.password} placeholder={t.auth.passwordPlaceholder} secureTextEntry
          secureToggle={{ show: t.auth.showPassword, hide: t.auth.hidePassword }} autoComplete="new-password" textContentType="newPassword"
          onSubmitEditing={submit} returnKeyType="go"
        />
      </View>
      <InlineError message={register.error ? errorMessage(register.error) : null} style={{ marginTop: 14 }} />
      <Button label={t.auth.continue} onPress={submit} loading={register.isPending} style={{ marginTop: 24 }} />
    </>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const login = useLogin();
  const { control, handleSubmit } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submit = () => void handleSubmit((v) => login.mutate(v))();
  return (
    <>
      <View style={{ gap: 14, marginTop: 22 }}>
        <FormField control={control} name="email" label={t.auth.email} placeholder={t.auth.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <FormField
          control={control} name="password" label={t.auth.password} placeholder={t.auth.passwordPlaceholder} secureTextEntry
          secureToggle={{ show: t.auth.showPassword, hide: t.auth.hidePassword }} autoComplete="current-password" textContentType="password"
          onSubmitEditing={submit} returnKeyType="go"
        />
        <HandLink label={t.auth.forgot} onPress={onForgot} style={{ alignSelf: 'flex-end' }} />
      </View>
      <InlineError message={login.error ? errorMessage(login.error) : null} style={{ marginTop: 14 }} />
      <Button label={t.auth.enter} onPress={submit} loading={login.isPending} style={{ marginTop: 24 }} />
    </>
  );
}

export function AuthScreen({ navigation, route }: RootScreenProps<'Auth'>) {
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'registro');
  const reg = mode === 'registro';
  return (
    <Screen keyboard decor={<Blob color={colors.mostaza} size={220} style={{ top: -50, right: -60 }} />}>
      <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
        <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Splash'))} />
        <HandNote size={26} color={colors.anotacion} rotate={-2} style={{ marginTop: 26 }}>{reg ? t.auth.registerNote : t.auth.loginNote}</HandNote>
        <Headline size={44} em={-0.04}>{reg ? t.auth.registerTitle : t.auth.loginTitle}</Headline>
      </View>
      <ScrollBody contentStyle={{ paddingTop: 20 }}>
        <Segmented
          accessibilityLabel={t.auth.modeLabel}
          value={mode}
          onChange={setMode}
          options={[{ value: 'registro', label: t.auth.tabRegister }, { value: 'acceso', label: t.auth.tabLogin }]}
        />
        {reg ? <RegisterForm /> : <LoginForm onForgot={() => navigation.navigate('ForgotPassword')} />}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 14 }}>
          <View style={{ flex: 1, height: 2, backgroundColor: colors.tinta }} />
          <HandNote size={20}>{t.auth.or}</HandNote>
          <View style={{ flex: 1, height: 2, backgroundColor: colors.tinta }} />
        </View>
        <Button label={t.auth.google} variant="white" size="md" onPress={() => toast.ok(t.auth.oauthUnavailable)} />
        <Button label={t.auth.apple} variant="white" size="md" onPress={() => toast.ok(t.auth.oauthUnavailable)} style={{ marginTop: 10 }} />
        <Txt size={12} lineHeight={18} color={colors.tintaSuave} style={{ marginTop: 18, marginHorizontal: 4 }}>{t.auth.terms}</Txt>
      </ScrollBody>
    </Screen>
  );
}
