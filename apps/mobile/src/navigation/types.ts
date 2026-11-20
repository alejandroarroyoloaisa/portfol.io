import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Role } from '@portfolio/schemas';

export type TabParamList = {
  Feed: undefined;
  Explore: undefined;
  PublishTab: undefined;
  Calls: undefined;
  MyProfile: undefined;
};

export type RootStackParamList = {
  // Acceso
  Splash: undefined;
  Auth: { mode?: 'registro' | 'acceso' } | undefined;
  ForgotPassword: undefined;
  Role: undefined;
  Onboarding: { role: Exclude<Role, 'admin'> };
  // App
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Artwork: { id: string };
  Comments: { artworkId: string; title: string };
  Profile: { handle: string };
  Exhibition: { seriesId?: string; exhibitionId?: string; startId?: string };
  CallDetail: { id: string };
  Apply: { callId: string };
  Applications: undefined;
  Network: undefined;
  Inbox: undefined;
  Chat: { conversationId: string; attachArtworkId?: string };
  Notifications: undefined;
  EditProfile: undefined;
  Stats: undefined;
  Settings: undefined;
  Saved: undefined;
  // Modales
  Filters: undefined;
  Publish: { artworkId?: string } | undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
