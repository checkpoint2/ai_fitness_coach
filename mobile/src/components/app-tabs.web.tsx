import {
  TabList,
  TabSlot,
  Tabs,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomNavigationItem,
  NavigationRail,
  NavigationRailItem,
  NAVIGATION_RAIL_WIDTH,
  dashboardNavigationMode,
} from '@/components/dashboard';
import { useUiTheme } from '@/components/ui/theme';
import { TEST_IDS } from '@/constants/testIds';
import { PILOT_TAB_ROUTES } from './app-tabs.model';

const [todayTab, planTab, diaryTab, coachTab, progressTab] = PILOT_TAB_ROUTES;

export default function AppTabs() {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigationMode = dashboardNavigationMode(width);
  const usesRail = navigationMode === 'rail';
  const bottomPadding = Math.max(insets.bottom, theme.spacing.sm);
  const slotStyle = StyleSheet.flatten([
    styles.slot,
    usesRail
      ? styles.slotWithRail
      : { paddingBottom: 56 + bottomPadding },
  ]);
  const tabBarStyle = StyleSheet.flatten([
    styles.tabBar,
    {
      backgroundColor: theme.colors.background,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
      paddingBottom: bottomPadding,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
  ]);

  return (
    <Tabs style={styles.root}>
      <TabSlot style={slotStyle} />
      <TabList asChild>
        {usesRail ? (
          <RailTabList>
            <TabTrigger name={todayTab.name} href={todayTab.href as Href} asChild>
              <RailTabButton
                icon={{
                  ios: 'house.fill',
                  android: 'home',
                  web: 'home',
                }}
                testID={TEST_IDS.tabs.todayTab}>
                {todayTab.label}
              </RailTabButton>
            </TabTrigger>
            <TabTrigger name={planTab.name} href={planTab.href as Href} asChild>
              <RailTabButton
                icon={{
                  ios: 'list.bullet.clipboard.fill',
                  android: 'list_alt',
                  web: 'list_alt',
                }}
                testID={TEST_IDS.tabs.planTab}>
                {planTab.label}
              </RailTabButton>
            </TabTrigger>
            <TabTrigger name={diaryTab.name} href={diaryTab.href as Href} asChild>
              <RailTabButton
                icon={{
                  ios: 'book.closed.fill',
                  android: 'menu_book',
                  web: 'menu_book',
                }}
                testID={TEST_IDS.tabs.diaryTab}>
                {diaryTab.label}
              </RailTabButton>
            </TabTrigger>
            <TabTrigger name={coachTab.name} href={coachTab.href as Href} asChild>
              <RailTabButton
                icon={{
                  ios: 'bubble.left.and.bubble.right.fill',
                  android: 'forum',
                  web: 'forum',
                }}
                testID={TEST_IDS.tabs.coachTab}>
                {coachTab.label}
              </RailTabButton>
            </TabTrigger>
            <TabTrigger name={progressTab.name} href={progressTab.href as Href} asChild>
              <RailTabButton
                icon={{
                  ios: 'chart.line.uptrend.xyaxis',
                  android: 'monitoring',
                  web: 'monitoring',
                }}
                testID={TEST_IDS.tabs.progressTab}>
                {progressTab.label}
              </RailTabButton>
            </TabTrigger>
          </RailTabList>
        ) : (
          <BottomTabList style={tabBarStyle}>
            <TabTrigger name={todayTab.name} href={todayTab.href as Href} asChild>
              <TabButton
                icon={{
                  ios: 'house.fill',
                  android: 'home',
                  web: 'home',
                }}
                testID={TEST_IDS.tabs.todayTab}>
                {todayTab.label}
              </TabButton>
            </TabTrigger>
            <TabTrigger name={planTab.name} href={planTab.href as Href} asChild>
              <TabButton
                icon={{
                  ios: 'list.bullet.clipboard.fill',
                  android: 'list_alt',
                  web: 'list_alt',
                }}
                testID={TEST_IDS.tabs.planTab}>
                {planTab.label}
              </TabButton>
            </TabTrigger>
            <TabTrigger name={diaryTab.name} href={diaryTab.href as Href} asChild>
              <TabButton
                icon={{
                  ios: 'book.closed.fill',
                  android: 'menu_book',
                  web: 'menu_book',
                }}
                testID={TEST_IDS.tabs.diaryTab}>
                {diaryTab.label}
              </TabButton>
            </TabTrigger>
            <TabTrigger name={coachTab.name} href={coachTab.href as Href} asChild>
              <TabButton
                icon={{
                  ios: 'bubble.left.and.bubble.right.fill',
                  android: 'forum',
                  web: 'forum',
                }}
                testID={TEST_IDS.tabs.coachTab}>
                {coachTab.label}
              </TabButton>
            </TabTrigger>
            <TabTrigger name={progressTab.name} href={progressTab.href as Href} asChild>
              <TabButton
                icon={{
                  ios: 'chart.line.uptrend.xyaxis',
                  android: 'monitoring',
                  web: 'monitoring',
                }}
                testID={TEST_IDS.tabs.progressTab}>
                {progressTab.label}
              </TabButton>
            </TabTrigger>
          </BottomTabList>
        )}
      </TabList>
    </Tabs>
  );
}

function BottomTabList(props: TabListProps) {
  return <View {...props} />;
}

function RailTabList({ children }: TabListProps) {
  return <NavigationRail title="AI Fitness Coach">{children}</NavigationRail>;
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: SymbolViewProps['name'];
};

function TabButton({ children, icon, isFocused, ...props }: TabButtonProps) {
  return (
    <BottomNavigationItem
      {...props}
      icon={icon}
      isActive={isFocused}
      label={typeof children === 'string' ? children : 'Navigation item'}
    />
  );
}

function RailTabButton({ children, icon, isFocused, ...props }: TabButtonProps) {
  return (
    <NavigationRailItem
      {...props}
      icon={icon}
      isActive={isFocused}
      label={typeof children === 'string' ? children : 'Navigation item'}
    />
  );
}

const styles = {
  root: {
    flex: 1,
    minHeight: '100vh' as unknown as ViewStyle['minHeight'],
  },
  slot: {
    minHeight: '100vh' as unknown as ViewStyle['minHeight'],
  },
  slotWithRail: {
    paddingLeft: NAVIGATION_RAIL_WIDTH,
  },
  tabBar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    left: 0,
    position: 'fixed' as ViewStyle['position'],
    right: 0,
  },
} satisfies Record<string, ViewStyle>;
