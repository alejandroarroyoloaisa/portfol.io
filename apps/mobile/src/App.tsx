/** Raíz de la app: fuentes, sesión, caché, tiempo real y navegación. */
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { Caveat_700Bold } from '@expo-google-fonts/caveat/700Bold';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMe } from './api/hooks/me';
import { queryClient, setupOfflineCache } from './api/queryClient';
import { RealtimeProvider } from './api/socket';
import { Toaster } from './components/Toast';
import { linking } from './navigation/linking';
import { navigationRef, openLinkFromRoot } from './navigation/links';
import { RootNavigator } from './navigation/RootNavigator';
import { useSession } from './store/session';
import { colors, fonts } from './theme';
import { listenPushTaps, registerForPush } from './utils/push';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.crema, card: colors.crema, text: colors.tinta, primary: colors.cobalto, border: colors.arena },
};

/** Registra el token push si ya hay permiso (sin preguntar al arrancar) y escucha los toques en avisos. */
function PushBridge() {
  const me = useMe().data;
  useEffect(() => {
    if (!me?.onboarded) return;
    void registerForPush(false);
    return listenPushTaps(openLinkFromRoot);
  }, [me?.id, me?.onboarded]);
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    [fonts.body]: BricolageGrotesque_500Medium,
    [fonts.bold]: BricolageGrotesque_700Bold,
    [fonts.display]: BricolageGrotesque_800ExtraBold,
    [fonts.hand]: Caveat_700Bold,
    [fonts.handSemi]: Caveat_600SemiBold,
  });
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    void (async () => {
      await setupOfflineCache();
      await useSession.getState().hydrate();
      setBooted(true);
    })();
  }, []);

  const ready = fontsLoaded && booted;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.crema }}>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking} documentTitle={{ formatter: () => 'Portfol.io' }}>
            <RootNavigator />
            <PushBridge />
          </NavigationContainer>
          <Toaster />
          <StatusBar style="dark" />
        </RealtimeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
