import type { PropsWithChildren } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';

type SymbolName = { ios: string; android: string; web: string };
type TabConfig = { name: string; href: string; label: string; icon: SymbolName };

const TABS: TabConfig[] = [
  { name: 'home', href: '/', label: Strings.home, icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { name: 'donors', href: '/donors', label: Strings.donors, icon: { ios: 'person.2.fill', android: 'groups', web: 'users' } },
  { name: 'requests', href: '/requests', label: Strings.requests, icon: { ios: 'drop.fill', android: 'bloodtype', web: 'bloodtype' } },
  { name: 'community', href: '/community', label: Strings.community, icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' } },
  { name: 'scanner', href: '/scanner', label: Strings.scanner, icon: { ios: 'viewfinder', android: 'qr_code_scanner', web: 'qr_code' } },
  { name: 'profile', href: '/profile', label: Strings.profile, icon: { ios: 'person.fill', android: 'person', web: 'user' } },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as never} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ label, icon, isFocused, ...props }: TabTriggerSlotProps & { label: string; icon: SymbolName }) {
  const color = isFocused ? Brand.red : '#9ca3af';
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.tabButton}>
        <SymbolView name={icon as never} size={24} tintColor={color} />
        <ThemedText type="small" style={{ color }}>{label}</ThemedText>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: PropsWithChildren<TabListProps>) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  return (
    <View {...props} style={[styles.tabList, { backgroundColor: colors.background, borderTopColor: colors.backgroundElement }]} />
  );
}

const styles = StyleSheet.create({
  tabList: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  pressed: { opacity: 0.7 },
});