import {
  Tabs as RouterTabs,
} from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { PlatformPressable } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/typography';
import { useUiTheme } from '@/components/ui/theme';
import { TEST_IDS } from '@/constants/testIds';
import { PILOT_TAB_ROUTES } from './app-tabs.model';

const [todayTab, planTab, diaryTab, coachTab, progressTab] = PILOT_TAB_ROUTES;

export default function AppTabs() {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, theme.spacing.sm);

  return (
    <RouterTabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.foreground,
        tabBarActiveBackgroundColor: theme.colors.accent,
        tabBarButton: NativeTabButton,
        tabBarHideOnKeyboard: true,
        tabBarInactiveBackgroundColor: theme.colors.transparent,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarItemStyle: [
          styles.tabBarItem,
          {
            borderRadius: theme.radius.lg,
            marginHorizontal: theme.spacing.xs,
            paddingVertical: theme.spacing.xs,
          },
        ],
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            height: tabBarHeight,
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
            paddingTop: theme.spacing.sm,
          },
        ],
      }}>
      <RouterTabs.Screen
        name={todayTab.name}
        options={{
          title: todayTab.label,
          tabBarLabel: ({ color }) => (
            <Typography colorValue={color} variant="caption" weight="700">
              {todayTab.label}
            </Typography>
          ),
          tabBarButtonTestID: TEST_IDS.tabs.todayTab,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <RouterTabs.Screen
        name={planTab.name}
        options={{
          title: planTab.label,
          tabBarLabel: ({ color }) => (
            <Typography colorValue={color} variant="caption" weight="700">
              {planTab.label}
            </Typography>
          ),
          tabBarButtonTestID: TEST_IDS.tabs.planTab,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'list.bullet.clipboard.fill', android: 'list_alt', web: 'list_alt' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <RouterTabs.Screen
        name={diaryTab.name}
        options={{
          title: diaryTab.label,
          tabBarLabel: ({ color }) => (
            <Typography colorValue={color} variant="caption" weight="700">
              {diaryTab.label}
            </Typography>
          ),
          tabBarButtonTestID: TEST_IDS.tabs.diaryTab,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <RouterTabs.Screen
        name={coachTab.name}
        options={{
          title: coachTab.label,
          tabBarLabel: ({ color }) => (
            <Typography colorValue={color} variant="caption" weight="700">
              {coachTab.label}
            </Typography>
          ),
          tabBarButtonTestID: TEST_IDS.tabs.coachTab,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <RouterTabs.Screen
        name={progressTab.name}
        options={{
          title: progressTab.label,
          tabBarLabel: ({ color }) => (
            <Typography colorValue={color} variant="caption" weight="700">
              {progressTab.label}
            </Typography>
          ),
          tabBarButtonTestID: TEST_IDS.tabs.progressTab,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'monitoring', web: 'monitoring' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <RouterTabs.Screen name="components" options={{ href: null }} />
      <RouterTabs.Screen name="profile" options={{ href: null }} />
    </RouterTabs>
  );
}

function NativeTabButton({
  style,
  ...props
}: BottomTabBarButtonProps) {
  const theme = useUiTheme();

  return (
    <PlatformPressable
      {...props}
      pressOpacity={theme.opacity.pressed}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    overflow: 'hidden',
  },
});
