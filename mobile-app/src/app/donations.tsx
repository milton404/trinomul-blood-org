import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMyDonations, type DonationRecord } from '@/lib/api';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

function donationTypeLabel(type: string): string {
  if (type === 'platelets') return Strings.platelets;
  if (type === 'plasma') return Strings.plasma;
  return Strings.wholeBlood;
}

export default function DonationsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyDonations();
      setDonations(data);
      setNeedsAuth(false);
    } catch (err: any) {
      if (err?.message === 'Unauthorized' || err?.message === 'HTTP 401') {
        setNeedsAuth(true);
      } else {
        setError(err?.message || Strings.submitError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderDonation = ({ item }: { item: DonationRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.bloodGroupBox}>
          <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.donationDate)}</Text>
      </View>
      <Text style={styles.hospitalText} numberOfLines={1}>
        {item.hospitalName || '—'}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{donationTypeLabel(item.donationType)}</Text>
        </View>
        <Text style={styles.unitsText}>
          {item.units} {item.units === 1 ? 'unit' : 'units'}
        </Text>
      </View>
      {item.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_left' } as never}
              size={22}
              tintColor="#fff"
            />
          </Pressable>
          <Text style={styles.headerTitle}>{Strings.donationHistory}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Brand.red} />
        </View>
      ) : needsAuth ? (
        <View style={styles.centerState}>
          <SymbolView
            name={{ ios: 'lock.circle', android: 'lock', web: 'lock' } as never}
            size={48}
            tintColor="#94a3b8"
          />
          <Text style={styles.emptyTitle}>{Strings.signInRequired}</Text>
          <Text style={styles.emptyHint}>{Strings.signInRequiredHint}</Text>
          <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}>
            <Text style={styles.ctaBtnText}>{Strings.login}</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>{Strings.submitError}</Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}>
            <Text style={styles.ctaBtnText}>{Strings.retry}</Text>
          </Pressable>
        </View>
      ) : donations.length === 0 ? (
        <View style={styles.centerState}>
          <SymbolView
            name={{ ios: 'drop', android: 'opacity', web: 'water_drop' } as never}
            size={48}
            tintColor="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>{Strings.noDonationsTitle}</Text>
          <Text style={styles.emptyHint}>{Strings.noDonationsHint}</Text>
        </View>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDonation}
          contentContainerStyle={{
            paddingHorizontal: Spacing.four,
            paddingTop: Spacing.four,
            paddingBottom: BottomTabInset + Spacing.four,
            gap: Spacing.three,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
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
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  ctaBtn: {
    marginTop: Spacing.two,
    backgroundColor: Brand.red,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodGroupBox: {
    backgroundColor: Brand.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bloodGroupText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  hospitalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  unitsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  pressed: { opacity: 0.7 },
});