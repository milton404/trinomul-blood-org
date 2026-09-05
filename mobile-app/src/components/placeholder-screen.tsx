import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { BloodDrop } from './blood-drop';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = { ios: string; android: string; web: string };

export function PlaceholderScreen({
  title,
  icon,
  showBack = false,
}: {
  title: string;
  icon: SymbolName;
  showBack?: boolean;
}) {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.five,
        maxWidth: MaxContentWidth,
        alignSelf: 'center',
      }}>
      <BloodDrop size={80} />
      <SymbolView name={icon as never} size={36} tintColor={Brand.red} style={{ marginTop: Spacing.two }} />
      <ThemedText type="title" style={{ textAlign: 'center' }}>{title}</ThemedText>
      <ThemedView
        type="backgroundElement"
        style={{
          paddingVertical: Spacing.two,
          paddingHorizontal: Spacing.four,
          borderRadius: Spacing.three,
          marginTop: Spacing.two,
        }}>
        <ThemedText type="small" themeColor="textSecondary">{Strings.comingSoon}</ThemedText>
      </ThemedView>
      {showBack && (
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.backBtn}>
            <ThemedText type="smallBold">← {Strings.home}</ThemedText>
          </ThemedView>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  backBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
    marginTop: Spacing.three,
  },
});