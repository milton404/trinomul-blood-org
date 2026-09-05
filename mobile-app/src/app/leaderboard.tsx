import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/api';

const MEDAL_COLORS = ['#facc15', '#cbd5e1', '#f97316'];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchLeaderboard();
      if (cancelled) return;
      setEntries(result.data);
      setIsMock(result.source !== 'api');
      setIsCached(result.source === 'cache');
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;

    return (
      <View style={[styles.card, isTop3 && styles.cardTop3]}>
        <View style={[styles.rankBadge, isTop3 && { backgroundColor: MEDAL_COLORS[rank - 1] }]}>
          {isTop3 ? (
            <SymbolView
              name={{ ios: 'medal.fill', android: 'military_tech', web: 'award' } as never}
              size={18}
              tintColor="#fff"
            />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>
        <View style={styles.entryInfo}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryName} numberOfLines={1}>{item.fullName}</Text>
            <View style={styles.bloodGroupBox}>
              <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
            </View>
          </View>
          <View style={styles.entryStats}>
            <View style={styles.statItem}>
              <SymbolView
                name={{ ios: 'heart.fill', android: 'favorite', web: 'heart' } as never}
                size={11}
                tintColor={Brand.red}
              />
              <Text style={styles.statValue}>{item.totalDonations}</Text>
              <Text style={styles.statLabel}>{Strings.donationCount}</Text>
            </View>
            {item.totalUnits > 0 && (
              <View style={styles.statItem}>
                <SymbolView
                  name={{ ios: 'person.2.fill', android: 'groups', web: 'users' } as never}
                  size={11}
                  tintColor="#0ea5e9"
                />
                <Text style={styles.statValue}>{item.totalUnits}</Text>
                <Text style={styles.statLabel}>{Strings.livesSaved}</Text>
              </View>
            )}
            {item.district && (
              <View style={styles.statItem}>
                <SymbolView
                  name={{ ios: 'mappin', android: 'place', web: 'map_pin' } as never}
                  size={10}
                  tintColor="#94a3b8"
                />
                <Text style={styles.statLabel} numberOfLines={1}>{item.district}</Text>
              </View>
            )}
          </View>
          {item.badges && item.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {item.badges.slice(0, 3).map((badge, i) => (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.leaderboardTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{Strings.leaderboardSubtitle}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Brand.red} />
          <Text style={styles.loadingText}>{Strings.loadingLeaderboard}</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView
            name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' } as never}
            size={48}
            tintColor="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>{Strings.noLeaderboard}</Text>
          <Text style={styles.emptyHint}>{Strings.noDonorsHint}</Text>
        </View>
      ) : (
        <>
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
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderEntry}
            contentContainerStyle={{
              paddingHorizontal: Spacing.four,
              paddingTop: Spacing.three,
              paddingBottom: BottomTabInset + Spacing.five,
              gap: Spacing.three,
            }}
          />
        </>
      )}
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

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop3: {
    borderWidth: 2,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  entryInfo: {
    flex: 1,
    gap: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  bloodGroupBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bloodGroupText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.red,
  },
  entryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
