/** Barra inferior de tinta con cinco iconos redondos; la pestaña activa lleva un círculo coral. */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountBadge } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { t } from '../i18n';
import { colors } from '../theme';
import type { TabParamList } from './types';

const TABS: Record<keyof TabParamList, { icon: IconName; label: string }> = {
  Feed: { icon: 'home', label: t.tabs.home },
  Explore: { icon: 'search', label: t.tabs.explore },
  PublishTab: { icon: 'plus', label: t.tabs.publish },
  Calls: { icon: 'briefcase', label: t.tabs.calls },
  MyProfile: { icon: 'user', label: t.tabs.me },
};

export function TabBar({ state, navigation, badges, canPublish }: BottomTabBarProps & { badges?: Partial<Record<keyof TabParamList, number>>; canPublish: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t.tabs.nav}
      style={{
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        paddingTop: 10, paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 12) + 10, backgroundColor: colors.tinta,
      }}
    >
      {state.routes.map((route, index) => {
        const name = route.name as keyof TabParamList;
        if (name === 'PublishTab' && !canPublish) return null;
        const def = TABS[name];
        const focused = state.index === index;
        const isPublish = name === 'PublishTab';
        const badge = badges?.[name];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={badge ? `${def.label}, ${t.a11y.unread(badge)}` : def.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              if (isPublish) {
                navigation.getParent()?.navigate('Publish');
                return;
              }
              const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !ev.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={({ pressed }) => ({
              width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
              backgroundColor: focused ? colors.coral : 'transparent', opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon
              name={def.icon}
              size={isPublish ? 26 : 21}
              color={focused ? colors.tinta : isPublish ? colors.mostaza : colors.crema}
              strokeWidth={isPublish || focused ? 2.2 : 2}
            />
            {badge ? <CountBadge n={badge} style={{ position: 'absolute', top: 2, right: 2 }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
