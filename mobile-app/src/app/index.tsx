import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { EmergencySOSButton } from '@/components/emergency-sos';
import { SelectDropdown } from '@/components/select-dropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BLOOD_GROUPS, DISTRICTS, getUpazilasByDistrict } from '@/constants/data';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = { ios: string; android: string; web: string };
type QuickAction = { key: string; label: string; icon: SymbolName; href: string };

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'find', label: Strings.findDonors, icon: { ios: 'magnifyingglass', android: 'search', web: 'search' }, href: '/donors' },
  { key: 'request', label: Strings.requestBlood, icon: { ios: 'drop.fill', android: 'bloodtype', web: 'bloodtype' }, href: '/requests' },
  { key: 'map', label: Strings.bloodMap, icon: { ios: 'map.fill', android: 'map', web: 'map' }, href: '/map' },
  { key: 'leader', label: Strings.leaderboard, icon: { ios: 'chart.bar.fill', android: 'leaderboard', web: 'leaderboard' }, href: '/leaderboard' },
];

const BG_OPTIONS = BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }));
const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d.id, label: d.name }));

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');

  const upazilaOptions = selectedDistrict
    ? getUpazilasByDistrict(selectedDistrict).map((u) => ({ value: u.id, label: u.name }))
    : [];

  const renderQuickAction = (action: QuickAction) => (
    <Pressable key={action.key} onPress={() => router.push(action.href as never)} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.actionCard}>
        <SymbolView name={action.icon as never} size={26} tintColor={Brand.red} />
        <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>{action.label}</ThemedText>
      </ThemedView>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}>
      <View style={styles.hero}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.heroGlow, { top: -60, left: -60, width: 200, height: 200, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
          <View style={[styles.heroGlow, { bottom: -80, right: -50, width: 250, height: 250, backgroundColor: 'rgba(0,0,0,0.15)' }]} />
          <View style={[styles.heroGlow, { top: 180, right: -30, width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        </View>

        <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.five }]}>
          <View style={styles.heroBranding}>
            <BloodDrop size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroAppName}>{Strings.appName}</Text>
              <Text style={styles.heroAppNameSub}>{Strings.tagline}</Text>
            </View>
          </View>


          <Text style={styles.heroTitle}>{Strings.heroTitle}</Text>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push('/request' as never)}
              style={({ pressed }) => [styles.heroActionBtn, styles.heroActionPrimary, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'drop.fill', android: 'bloodtype', web: 'bloodtype' } as never}
                size={16}
                tintColor="#fff"
              />
              <Text style={styles.heroActionPrimaryText}>{Strings.requestBlood}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile' as never)}
              style={({ pressed }) => [styles.heroActionBtn, styles.heroActionOutline, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'heart.fill', android: 'favorite', web: 'heart' } as never}
                size={16}
                tintColor={Brand.red}
              />
              <Text style={styles.heroActionOutlineText}>{Strings.becomeDonor}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchCardHeader}>
            <View style={styles.searchCardIcon}>
              <SymbolView name={{ ios: 'drop.fill', android: 'bloodtype', web: 'bloodtype' } as never} size={14} tintColor="#fff" />
            </View>
            <Text style={styles.searchCardTitle}>{Strings.findDonorTitle}</Text>
            <View style={styles.aiBadge}>
              <SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'sparkles' } as never} size={12} tintColor={Brand.red} />
              <Text style={styles.aiBadgeText}>{Strings.aiSearch}</Text>
            </View>
          </View>

          <View style={styles.dropdownGrid}>
            <SelectDropdown value={selectedBloodGroup} options={BG_OPTIONS} onChange={setSelectedBloodGroup} placeholder="A+, B+, O+..." label={Strings.bloodGroup} />
            <SelectDropdown value={selectedDistrict} options={DISTRICT_OPTIONS} onChange={(v) => { setSelectedDistrict(v); setSelectedUpazila(''); }} placeholder={Strings.district} label={Strings.district} searchable searchPlaceholder="Search district…" />
            <SelectDropdown value={selectedUpazila} options={upazilaOptions} onChange={setSelectedUpazila} placeholder={selectedDistrict ? 'Select upazila' : 'Select district first'} label="Upazila" disabled={!selectedDistrict} searchable={upazilaOptions.length > 0} searchPlaceholder="Search upazila…" />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as never} size={16} tintColor="#94a3b8" style={styles.searchIcon} />
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={Strings.searchPlaceholder} placeholderTextColor="#94a3b8" style={styles.searchInput} autoComplete="off" spellCheck={false} enterKeyHint="search" />
              {searchQuery !== '' && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'x' } as never} size={16} tintColor="#cbd5e1" />
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => router.push('/donors' as never)} style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as never} size={16} tintColor="#fff" />
              <Text style={styles.searchBtnText}>{Strings.searchBtn}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.contentBelowHero}>
        <EmergencySOSButton />

        <View style={styles.grid}>
          <View style={styles.row}>{QUICK_ACTIONS.slice(0, 2).map(renderQuickAction)}</View>
          <View style={styles.row}>{QUICK_ACTIONS.slice(2, 4).map(renderQuickAction)}</View>
        </View>

        <Pressable onPress={() => router.push('/profile' as never)} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{Strings.becomeDonor}</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  heroGlow: {
    position: 'absolute',
    borderRadius: 9999,
  },
  heroContent: {
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  heroBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  heroAppName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  heroAppNameSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,

  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  heroActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  heroActionPrimary: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heroActionPrimaryText: {
    color: Brand.red,
    fontSize: 14,
    fontWeight: '800',
  },
  heroActionOutline: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroActionOutlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.one,
  },

  searchCard: {
    backgroundColor: '#fff',
    borderRadius: Spacing.five,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  searchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCardTitle: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f3ff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  aiBadgeText: {
    color: Brand.red,
    fontSize: 10,
    fontWeight: '700',
  },

  dropdownGrid: {
    gap: 8,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    paddingVertical: 0,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.red,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: Brand.red,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  contentBelowHero: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.five,
  },
  grid: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionCard: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  cta: {
    backgroundColor: Brand.red,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
    shadowColor: Brand.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});