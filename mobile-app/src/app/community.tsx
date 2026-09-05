import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { DonorCard, type DonorCardData } from '@/components/donor-card';
import { RequestCard, type RequestCardData } from '@/components/request-card';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchDonors, fetchRequests, type FetchedDonor, type FetchedRequest } from '@/lib/api';

type FeedTab = 'all' | 'donors' | 'requests';

const FEED_TABS: { value: FeedTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'donors', label: Strings.donors },
  { value: 'requests', label: Strings.requests },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [tab, setTab] = useState<FeedTab>('all');
  const [donors, setDonors] = useState<FetchedDonor[]>([]);
  const [requests, setRequests] = useState<FetchedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [d, r] = await Promise.all([fetchDonors(), fetchRequests()]);
    setDonors(d.data);
    setRequests(r.data);
    setIsMock(d.source !== 'api' || r.source !== 'api');
    setIsCached(d.source === 'cache' || r.source === 'cache');
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const recentDonors = donors.slice(0, 5);
  const urgentRequests = requests
    .filter((r) => r.urgencyLevel === 'critical' || r.urgencyLevel === 'urgent')
    .slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.communityTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{Strings.communitySubtitle}</Text>
      </View>

      <View style={styles.tabsRow}>
        {FEED_TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            style={[styles.tab, tab === t.value && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isMock && (
        <View style={styles.offlineBanner}>
          <SymbolView
            name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } as never}
            size={13}
            tintColor="#92400e"
          />
          <Text style={styles.offlineText}>{isCached ? Strings.offlineCached : Strings.offlineMode}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: Spacing.three,
          paddingBottom: BottomTabInset + Spacing.five,
          gap: Spacing.four,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={Brand.red} />
        }>

        {(tab === 'all' || tab === 'donors') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Donors</Text>
              <Pressable onPress={() => router.push('/donors' as never)} hitSlop={6}>
                <Text style={styles.sectionLink}>View All</Text>
              </Pressable>
            </View>
            {isLoading && donors.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Brand.red} />
              </View>
            ) : recentDonors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{Strings.noDonorsFound}</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {recentDonors.map((d) => (
                  <DonorCard
                    key={d.id}
                    donor={{
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
                      distanceKm: d.distanceKm,
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
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {(tab === 'all' || tab === 'requests') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Urgent Requests</Text>
              <Pressable onPress={() => router.push('/requests' as never)} hitSlop={6}>
                <Text style={styles.sectionLink}>View All</Text>
              </Pressable>
            </View>
            {isLoading && requests.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Brand.red} />
              </View>
            ) : urgentRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{Strings.noRequestsFound}</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {urgentRequests.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={{
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
                      distanceKm: r.distanceKm,
                      trackingCode: r.trackingCode,
                      neededTime: r.neededTime,
                      alternativeNumber: r.alternativeNumber,
                      isLastChance: r.isLastChance,
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {tab === 'all' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Community Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{donors.length}</Text>
                <Text style={styles.statLabel}>Donors</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{requests.length}</Text>
                <Text style={styles.statLabel}>Requests</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {requests.filter((r) => r.urgencyLevel === 'critical').length}
                </Text>
                <Text style={styles.statLabel}>Critical</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {donors.filter((d) => d.isVerified).length}
                </Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: 4,
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
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: Brand.red,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: '#fff',
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

  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.red,
  },

  cardList: {
    gap: Spacing.two,
  },

  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  statsSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Brand.red,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});