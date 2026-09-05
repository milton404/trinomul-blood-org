import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { RequestCard, type RequestCardData } from '@/components/request-card';
import { Brand } from '@/constants/brand';
import { BLOOD_GROUPS } from '@/constants/data';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchRequests, type FetchedRequest } from '@/lib/api';

const ALL_CHIP = 'All';
const BG_CHIPS = [ALL_CHIP, ...BLOOD_GROUPS];
const URGENCY_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: Strings.allUrgency },
  { value: 'critical', label: Strings.critical },
  { value: 'urgent', label: Strings.urgent },
  { value: 'normal', label: Strings.normal },
];

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [selectedGroup, setSelectedGroup] = useState<string>(ALL_CHIP);
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [allRequests, setAllRequests] = useState<FetchedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchRequests();
      if (cancelled) return;
      setAllRequests(result.data);
      setIsMock(result.source !== 'api');
      setIsCached(result.source === 'cache');
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredRequests = useMemo<RequestCardData[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    return allRequests.filter((r) => {
      const matchesGroup = selectedGroup === ALL_CHIP || r.bloodGroup === selectedGroup;
      const matchesUrgency = selectedUrgency === 'all' || r.urgencyLevel === selectedUrgency;

      let matchesSearch = true;
      if (q) {
        const patient = r.patientName.toLowerCase();
        const hospital = r.hospitalName.toLowerCase();
        const area = `${r.upazilaName} ${r.districtName}`.toLowerCase();
        matchesSearch = patient.includes(q) || hospital.includes(q) || area.includes(q);
      }

      return matchesGroup && matchesUrgency && matchesSearch;
    }).map((r) => ({
      id: r.id,
      patientName: r.patientName,
      bloodGroup: r.bloodGroup,
      hospitalName: r.hospitalName,
      hospitalAddress: r.hospitalAddress,
      districtName: r.districtName,
      upazilaName: r.upazilaName,
      urgencyLevel: r.urgencyLevel,
      whenNeeded: r.whenNeeded,
      neededDate: r.neededDate,
      unitsNeeded: r.unitsNeeded,
      reason: r.reason,
      contactNumber: r.contactNumber,
      whatsappNumber: r.whatsappNumber,
      status: r.status,
      createdAt: r.createdAt,
      trackingCode: r.trackingCode,
      neededTime: r.neededTime,
      alternativeNumber: r.alternativeNumber,
      isLastChance: r.isLastChance,
    }));
  }, [allRequests, selectedGroup, selectedUrgency, searchQuery]);

  const renderBgChip = (chip: string) => {
    const isActive = chip === selectedGroup;
    return (
      <Pressable
        key={chip}
        onPress={() => setSelectedGroup(chip)}
        style={[styles.chip, isActive && styles.chipActive]}
        hitSlop={4}>
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip}</Text>
      </Pressable>
    );
  };

  const renderUrgencyChip = (chip: { value: string; label: string }) => {
    const isActive = chip.value === selectedUrgency;
    return (
      <Pressable
        key={chip.value}
        onPress={() => setSelectedUrgency(chip.value)}
        style={[styles.urgChip, isActive && styles.urgChipActive]}
        hitSlop={4}>
        <Text style={[styles.urgChipText, isActive && styles.urgChipTextActive]}>{chip.label}</Text>
      </Pressable>
    );
  };

  const renderRequest = ({ item }: { item: RequestCardData }) => (
    <RequestCard request={item} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.bloodRequests}</Text>
          {!isMock && !isLoading && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{Strings.liveMode}</Text>
            </View>
          )}
          <Pressable
            onPress={() => router.push('/request' as never)}
            style={({ pressed }) => [styles.postBtn, pressed && styles.pressed]}
            hitSlop={8}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'plus' } as never}
              size={16}
              tintColor="#fff"
            />
            <Text style={styles.postBtnText}>{Strings.postRequest}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {BG_CHIPS.map(renderBgChip)}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {URGENCY_CHIPS.map(renderUrgencyChip)}
        </ScrollView>

        <View style={styles.searchInputWrap}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as never}
            size={16}
            tintColor="#94a3b8"
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={Strings.searchRequests}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'x' } as never}
                size={16}
                tintColor="#cbd5e1"
              />
            </Pressable>
          )}
        </View>
      </View>

      {isMock && !isLoading && (
        <View style={styles.offlineBanner}>
          <SymbolView
            name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } as never}
            size={13}
            tintColor="#92400e"
          />
          <Text style={styles.offlineText}>{isCached ? Strings.offlineCached : Strings.offlineMode}</Text>
        </View>
      )}

      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {isLoading ? '…' : `${filteredRequests.length} ${Strings.resultsCount}`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Brand.red} />
          <Text style={styles.loadingText}>{Strings.loadingRequests}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRequest}
          contentContainerStyle={{
            paddingHorizontal: Spacing.four,
            paddingBottom: BottomTabInset + Spacing.five,
            gap: Spacing.three,
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <SymbolView
                name={{ ios: 'drop.slash', android: 'bloodtype', web: 'droplet' } as never}
                size={48}
                tintColor="#cbd5e1"
              />
              <Text style={styles.emptyTitle}>{Strings.noRequestsFound}</Text>
              <Text style={styles.emptyHint}>{Strings.noRequestsHint}</Text>
              <Pressable
                onPress={() => router.push('/request' as never)}
                style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'plus' } as never}
                  size={16}
                  tintColor="#fff"
                />
                <Text style={styles.emptyCtaText}>{Strings.postRequest}</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chipsRow: {
    gap: 8,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#fff',
  },
  urgChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urgChipActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  urgChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  urgChipTextActive: {
    color: '#fff',
  },

  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    paddingVertical: 0,
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.red,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: Spacing.two,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
