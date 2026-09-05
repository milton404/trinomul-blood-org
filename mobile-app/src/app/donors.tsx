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
import { DonorCard, type DonorCardData } from '@/components/donor-card';
import { SelectDropdown } from '@/components/select-dropdown';
import { Brand } from '@/constants/brand';
import { BLOOD_GROUPS, DISTRICTS } from '@/constants/data';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { fetchDonors, type FetchedDonor } from '@/lib/api';
import { haversineKm } from '@/utils/geo';

const ALL_CHIP = 'All';
const CHIPS = [ALL_CHIP, ...BLOOD_GROUPS];
const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d.id, label: d.name }));

export default function DonorsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [selectedGroup, setSelectedGroup] = useState<string>(ALL_CHIP);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByProximity, setSortByProximity] = useState(false);

  const [allDonors, setAllDonors] = useState<FetchedDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const { location, isLocating, error: locationError, requestLocation } = useUserLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchDonors();
      if (cancelled) return;
      setAllDonors(result.data);
      setIsMock(result.source !== 'api');
      setIsCached(result.source === 'cache');
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleNearMe = () => {
    if (sortByProximity) {
      setSortByProximity(false);
      return;
    }
    setSortByProximity(true);
    requestLocation();
  };

  const filteredDonors = useMemo<DonorCardData[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const useProximity = sortByProximity && !!location;

    const results: DonorCardData[] = allDonors.filter((d) => {
      const matchesGroup = selectedGroup === ALL_CHIP || d.bloodGroup === selectedGroup;
      const matchesDistrict = !selectedDistrict || d.districtId === selectedDistrict;

      let matchesSearch = true;
      if (q) {
        const name = d.fullName.toLowerCase();
        const phone = d.phone.replace(/[\s-]/g, '');
        const area = `${d.upazilaName} ${d.districtName}`.toLowerCase();
        const qDigits = q.replace(/\D/g, '');
        matchesSearch =
          name.includes(q) ||
          area.includes(q) ||
          (qDigits.length >= 3 && phone.includes(qDigits));
      }

      return matchesGroup && matchesDistrict && matchesSearch;
    }).map((d) => {
      let distanceKm: number | null = null;
      if (useProximity && location && d.lat != null && d.lng != null) {
        distanceKm = haversineKm(location.lat, location.lng, d.lat, d.lng);
      }
      return {
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        districtName: d.districtName,
        upazilaName: d.upazilaName,
        phone: d.phone,
        totalDonations: d.totalDonations,
        isActive: d.isActive,
        isVerified: d.isVerified,
        eligibleTypesCount: d.eligibleTypesCount,
        nextEligibleDate: d.nextEligibleDate,
        createdAt: d.createdAt,
        distanceKm,
        eligibleWholeBlood: d.eligibleWholeBlood,
        eligiblePlatelets: d.eligiblePlatelets,
        eligiblePlasma: d.eligiblePlasma,
        badges: d.badges,
        totalReferrals: d.totalReferrals,
        totalUnits: d.totalUnits,
        hbStatus: d.hbStatus,
        lastActiveAt: d.lastActiveAt,
        isAnonymous: d.isAnonymous,
        avatarUrl: d.avatarUrl,
      };
    });

    if (useProximity) {
      results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    return results;
  }, [allDonors, selectedGroup, selectedDistrict, searchQuery, sortByProximity, location]);

  const renderChip = (chip: string) => {
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

  const renderDonor = ({ item }: { item: DonorCardData }) => (
    <DonorCard donor={item} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.findDonors}</Text>
          {!isMock && !isLoading && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{Strings.liveMode}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {CHIPS.map(renderChip)}
        </ScrollView>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectDropdown
              value={selectedDistrict}
              options={DISTRICT_OPTIONS}
              onChange={setSelectedDistrict}
              placeholder={Strings.filterByDistrict}
              label={Strings.district}
              searchable
              searchPlaceholder="Search district…"
            />
          </View>
          <Pressable
            onPress={handleNearMe}
            style={({ pressed }) => [
              styles.nearMeBtn,
              sortByProximity && styles.nearMeBtnActive,
              pressed && styles.pressed,
            ]}>
            {isLocating ? (
              <ActivityIndicator size="small" color={sortByProximity ? '#fff' : Brand.red} />
            ) : (
              <SymbolView
                name={{ ios: 'location.fill', android: 'my_location', web: 'navigation' } as never}
                size={16}
                tintColor={sortByProximity ? '#fff' : Brand.red}
              />
            )}
            <Text style={[styles.nearMeText, sortByProximity && styles.nearMeTextActive]}>
              {isLocating ? Strings.locating : sortByProximity ? Strings.nearMeActive : Strings.nearMe}
            </Text>
          </Pressable>
        </View>

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
            placeholder={Strings.searchDonors}
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

        {locationError && sortByProximity && (
          <Text style={styles.errorText}>{Strings.locationDenied}</Text>
        )}
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
          {isLoading ? '…' : `${filteredDonors.length} ${Strings.resultsCount}`}
        </Text>
        {sortByProximity && location && (
          <View style={styles.sortIndicator}>
            <SymbolView
              name={{ ios: 'arrow.up.arrow.down', android: 'sort', web: 'arrow_up_down' } as never}
              size={12}
              tintColor={Brand.red}
            />
            <Text style={styles.sortText}>{Strings.sortByDistance}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Brand.red} />
          <Text style={styles.loadingText}>{Strings.loadingDonors}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDonors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDonor}
          contentContainerStyle={{
            paddingHorizontal: Spacing.four,
            paddingBottom: BottomTabInset + Spacing.five,
            gap: Spacing.three,
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <SymbolView
                name={{ ios: 'person.2.slash', android: 'person_off', web: 'user_x' } as never}
                size={48}
                tintColor="#cbd5e1"
              />
              <Text style={styles.emptyTitle}>{Strings.noDonorsFound}</Text>
              <Text style={styles.emptyHint}>{Strings.noDonorsHint}</Text>
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

  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
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

  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  nearMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: Brand.red,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
  },
  nearMeBtnActive: {
    backgroundColor: Brand.red,
  },
  nearMeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.red,
  },
  nearMeTextActive: {
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

  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
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
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.red,
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
  },
  pressed: {
    opacity: 0.85,
  },
});
