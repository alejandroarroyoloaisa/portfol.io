/**
 * Navegación raíz (React Navigation, sin Expo Router):
 *  - Sin sesión: Bienvenida → Registro/Acceso → Recuperar contraseña.
 *  - Con sesión sin onboarding: Rol → Onboarding.
 *  - Con sesión: pestañas + pantallas de detalle apiladas encima; Filtros y Publicar como modales.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useMe } from '../api/hooks/me';
import { signOut } from '../api/hooks/auth';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/States';
import { t } from '../i18n';
import { useSession } from '../store/session';
import { colors } from '../theme';
import { ArtworkScreen } from '../screens/artwork/ArtworkScreen';
import { CommentsScreen } from '../screens/artwork/CommentsScreen';
import { ExhibitionScreen } from '../screens/artwork/ExhibitionScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { RoleScreen } from '../screens/auth/RoleScreen';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { ApplicationsScreen } from '../screens/calls/ApplicationsScreen';
import { ApplyScreen } from '../screens/calls/ApplyScreen';
import { CallDetailScreen } from '../screens/calls/CallDetailScreen';
import { CallsScreen } from '../screens/calls/CallsScreen';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { FiltersScreen } from '../screens/explore/FiltersScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { EditProfileScreen } from '../screens/me/EditProfileScreen';
import { MyProfileScreen } from '../screens/me/MyProfileScreen';
import { PublishScreen } from '../screens/me/PublishScreen';
import { SavedScreen } from '../screens/me/SavedScreen';
import { SettingsScreen } from '../screens/me/SettingsScreen';
import { StatsScreen } from '../screens/me/StatsScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { InboxScreen } from '../screens/messages/InboxScreen';
import { NetworkScreen } from '../screens/network/NetworkScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** La pestaña «+» no tiene pantalla propia: abre el modal Publicar. */
const NoScreen = () => null;

function Tabs() {
  const me = useMe().data;
  return (
    <Tab.Navigator
      tabBar={(p) => <TabBar {...p} canPublish={me?.role === 'artista'} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.crema } }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="PublishTab" component={NoScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="MyProfile" component={MyProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const status = useSession((s) => s.status);
  const me = useMe();

  if (status === 'loading' || (status === 'signedIn' && me.data === undefined && me.isPending)) {
    return <LoadingState style={{ backgroundColor: colors.crema }} />;
  }
  if (status === 'signedIn' && me.data === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.crema, padding: 24 }}>
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
        <Button label={t.settings.logout} variant="danger" onPress={() => void signOut()} />
      </View>
    );
  }

  const onboarded = !!me.data?.onboarded;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.crema }, animation: 'slide_from_right' }}>
      {status !== 'signedIn' ? (
        <Stack.Group>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Group>
      ) : !onboarded ? (
        <Stack.Group>
          <Stack.Screen name="Role" component={RoleScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Group>
      ) : (
        <>
          <Stack.Group>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Artwork" component={ArtworkScreen} />
            <Stack.Screen name="Comments" component={CommentsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Exhibition" component={ExhibitionScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="CallDetail" component={CallDetailScreen} />
            <Stack.Screen name="Apply" component={ApplyScreen} />
            <Stack.Screen name="Applications" component={ApplicationsScreen} />
            <Stack.Screen name="Network" component={NetworkScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Saved" component={SavedScreen} />
          </Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="Filters" component={FiltersScreen} />
          </Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}>
            <Stack.Screen name="Publish" component={PublishScreen} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}
