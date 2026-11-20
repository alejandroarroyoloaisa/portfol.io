/** Recuperar la contraseña: pedir el código por correo y elegir una nueva (RF-02). */
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, resetPasswordSchema } from '@portfolio/schemas';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';
import { useForgotPassword, useResetPassword } from '../../api/hooks/auth';
import { Button, HandLink } from '../../components/Button';
import { Blob } from '../../components/Decor';
import { Screen, ScreenHeader, ScrollBody } from '../../components/Screen';
import { InlineError } from '../../components/States';
import { Txt } from '../../components/Text';
import { FormField } from '../../components/TextField';
import { toast } from '../../components/Toast';
import { t } from '../../i18n';
import type { RootScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { errorMessage } from '../../utils/errors';

export function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const emailForm = useForm<z.infer<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const codeForm = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: '', password: '' } });

  const sendEmail = () => void emailForm.handleSubmit(({ email }) => forgot.mutate(email, { onSuccess: () => setStep('code') }))();
  const sendCode = () =>
    void codeForm.handleSubmit((v) =>
      reset.mutate(v, {
        onSuccess: () => {
          toast.ok(t.forgot.done);
          navigation.navigate('Auth', { mode: 'acceso' });
        },
      }),
    )();

  return (
    <Screen keyboard decor={<Blob color={colors.coral} size={200} style={{ top: -60, right: -60 }} />}>
      <ScreenHeader title={t.forgot.title} note={t.forgot.note} noteColor={colors.anotacion} titleSize={40} />
      <ScrollBody contentStyle={{ paddingTop: 12 }}>
        <Txt size={15}>{t.forgot.intro}</Txt>
        {step === 'email' ? (
          <View style={{ marginTop: 18, gap: 14 }}>
            <FormField control={emailForm.control} name="email" label={t.auth.email} placeholder={t.auth.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" onSubmitEditing={sendEmail} />
            <InlineError message={forgot.error ? errorMessage(forgot.error) : null} />
            <Button label={t.forgot.send} onPress={sendEmail} loading={forgot.isPending} />
            <HandLink label={t.forgot.haveCode} onPress={() => setStep('code')} style={{ alignSelf: 'center' }} />
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 14 }}>
            {forgot.isSuccess ? <Txt size={14} weight="bold" color={colors.verde}>{t.forgot.sent}</Txt> : null}
            <FormField control={codeForm.control} name="token" label={t.forgot.code} placeholder={t.forgot.codePlaceholder} autoCapitalize="none" autoCorrect={false} />
            <FormField
              control={codeForm.control} name="password" label={t.forgot.newPassword} placeholder={t.auth.passwordPlaceholder} secureTextEntry
              secureToggle={{ show: t.auth.showPassword, hide: t.auth.hidePassword }} onSubmitEditing={sendCode}
            />
            <InlineError message={reset.error ? errorMessage(reset.error) : null} />
            <Button label={t.forgot.reset} variant="dark" onPress={sendCode} loading={reset.isPending} />
          </View>
        )}
      </ScrollBody>
    </Screen>
  );
}
