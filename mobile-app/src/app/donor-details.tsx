import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QRShareButton } from '@/components/qr-share-button';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchDonorById, type DonorDetail } from '@/lib/api';
import { API_BASE_URL } from '@/constants/config';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

export default function DonorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [donor, setDonor] = useState<DonorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) { setError('No donor ID provided'); setIsLoading(false); return; }
      try {
        const data = await fetchDonorById(Number(id));
        if (cancelled) return;
        setDonor(data);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load donor');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleCall = () => { if (donor?.phone) Linking.openURL(`tel:${donor.phone}`); };
  const handleWhatsApp = () => {
    if (!donor?.phone) return;
    const phone = donor.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent('Hello, I found your profile on Trinomul Blood Bank.')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_left' } as never} size={22} tintColor="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Donor Profile</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={Brand.red} /></View>
      ) : error ? (
        <View style={styles.centerState}>
          <SymbolView name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'alert_triangle' } as never} size={48} tintColor="#dc2626" />
          <Text style={styles.errorTitle}>{error}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}>
            <Text style={styles.ctaBtnText}>Go Back</Text>
          </Pressable>
        </View>
      ) : donor ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: insets.bottom + Spacing.six, gap: Spacing.three }}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {donor.avatarUrl ? (
                <Image source={donor.avatarUrl} style={styles.avatar} contentFit="cover" placeholder={undefined} transition={150} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{donor.fullName.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{donor.fullName}</Text>
                  {donor.isVerified && (
                    <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as never} size={16} tintColor="#16a34a" />
                  )}
                </View>
                <Text style={styles.location}>{donor.upazila}, {donor.district}</Text>
              </View>
              <View style={styles.bloodGroupBadge}>
                <Text style={styles.bloodGroupText}>{donor.bloodGroup}</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusPill, donor.isActive ? styles.statusActive : styles.statusInactive]}>
                <Text style={[styles.statusPillText, donor.isActive ? { color: '#16a34a' } : { color: '#64748b' }]}>
                  {donor.isActive ? 'Available' : 'Unavailable'}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={[styles.statusPillText, { color: '#475569' }]}>
                  {donor.verificationStatus || (donor.isVerified ? 'Verified' : 'Unverified')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Eligibility</Text>
            <View style={styles.eligibilityRow}>
              {[
                { label: 'Whole Blood', eligible: donor.eligibleWholeBlood },
                { label: 'Platelets', eligible: donor.eligiblePlatelets },
                { label: 'Plasma', eligible: donor.eligiblePlasma },
              ].map((item) => (
                <View key={item.label} style={[styles.eligBadge, item.eligible ? styles.eligBadgeOn : styles.eligBadgeOff]}>
                  <SymbolView
                    name={item.eligible ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never : { ios: 'xmark.circle', android: 'cancel', web: 'x_circle' } as never}
                    size={14}
                    tintColor={item.eligible ? '#16a34a' : '#94a3b8'}
                  />
                  <Text style={[styles.eligText, item.eligible ? { color: '#15803d' } : { color: '#94a3b8' }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            {donor.nextEligibleDate && (
              <Text style={styles.eligNote}>Next eligible: {formatDate(donor.nextEligibleDate)}</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Donation Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{donor.totalDonations}</Text>
                <Text style={styles.statLabel}>Donations</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{donor.totalUnits}</Text>
                <Text style={styles.statLabel}>Lives Saved</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{donor.totalReferrals}</Text>
                <Text style={styles.statLabel}>Referrals</Text>
              </View>
            </View>
            <Text style={styles.detailLine}>Last donation: {formatDate(donor.lastDonationDate)}</Text>
            {donor.lastDonationType && <Text style={styles.detailLine}>Last type: {donor.lastDonationType}</Text>}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Health Info</Text>
            <Text style={styles.detailLine}>Hb Level: {donor.hbLevel ? `${donor.hbLevel} g/dL` : 'Not tested'}</Text>
            <Text style={styles.detailLine}>Last Hb test: {formatDate(donor.lastHbTestDate)}</Text>
            <Text style={styles.detailLine}>Weight: {donor.weightKg ? `${donor.weightKg} kg` : '—'}</Text>
            <Text style={styles.detailLine}>Chronic disease: {donor.hasChronicDisease ? (donor.diseaseDetails || 'Yes') : 'No'}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            <Text style={styles.detailLine}>Sex: {donor.sex ? donor.sex.charAt(0).toUpperCase() + donor.sex.slice(1) : '—'}</Text>
            <Text style={styles.detailLine}>Date of birth: {formatDate(donor.dateOfBirth)}</Text>
            <Text style={styles.detailLine}>Occupation: {donor.occupation || '—'}</Text>
            <Text style={styles.detailLine}>Preferred contact: {donor.preferredContact || '—'}</Text>
            <Text style={styles.detailLine}>Donor since: {formatDate(donor.createdAt)}</Text>
          </View>

          {donor.badges.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.badgesRow}>
                {donor.badges.map((badge, i) => (
                  <View key={i} style={styles.achievementBadge}>
                    <Text style={styles.achievementText}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable onPress={handleCall} style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never} size={16} tintColor="#fff" />
              <Text style={styles.callBtnText}>Call</Text>
            </Pressable>
            <Pressable onPress={handleWhatsApp} style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'message.fill', android: 'chat', web: 'message_circle' } as never} size={16} tintColor="#fff" />
              <Text style={styles.callBtnText}>WhatsApp</Text>
            </Pressable>
            <QRShareButton
              title={donor.fullName}
              subtitle={`${donor.bloodGroup} • ${donor.district}`}
              url={`${API_BASE_URL}/donors?donor=${donor.id}`}
            />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Brand.red, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.six },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#dc2626', textAlign: 'center' },
  ctaBtn: { marginTop: Spacing.two, backgroundColor: Brand.red, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0', gap: Spacing.three },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1 },
  location: { fontSize: 13, color: '#64748b' },
  bloodGroupBadge: { backgroundColor: Brand.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  bloodGroupText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statusRow: { flexDirection: 'row', gap: Spacing.two },
  statusPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  statusActive: { backgroundColor: '#f0fdf4' },
  statusInactive: { backgroundColor: '#f1f5f9' },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0', gap: Spacing.two },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  eligibilityRow: { flexDirection: 'row', gap: Spacing.two },
  eligBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center' },
  eligBadgeOn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  eligBadgeOff: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  eligText: { fontSize: 11, fontWeight: '700' },
  eligNote: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: Spacing.three, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 22, fontWeight: '900', color: Brand.red },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  detailLine: { fontSize: 13, color: '#334155', lineHeight: 20 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  achievementBadge: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  achievementText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  actionRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Brand.red, paddingVertical: 14, borderRadius: 14 },
  whatsappBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#25D366', paddingVertical: 14, borderRadius: 14 },
  callBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});