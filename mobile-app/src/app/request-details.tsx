import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchRequestById, fetchRequestByTrackingCode, type RequestDetail } from '@/lib/api';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}

const URGENCY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'Critical', bg: '#fef2f2', text: '#dc2626' },
  urgent: { label: 'Urgent', bg: '#fffbeb', text: '#d97706' },
  normal: { label: 'Normal', bg: '#f8fafc', text: '#475569' },
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', matching: 'Finding Donor', donor_found: 'Donor Found',
  donating: 'Donating', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
  expired: 'Expired', active: 'Active',
};

export default function RequestDetailsScreen() {
  const { id, code } = useLocalSearchParams<{ id?: string; code?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data: RequestDetail;
        if (code) {
          data = await fetchRequestByTrackingCode(code);
        } else if (id) {
          data = await fetchRequestById(Number(id));
        } else {
          setError('No request ID or tracking code provided');
          setIsLoading(false);
          return;
        }
        if (cancelled) return;
        setRequest(data);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load request');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, code]);

  const handleCall = () => { if (request?.contactNumber) Linking.openURL(`tel:${request.contactNumber}`); };
  const handleCallAlt = () => { if (request?.alternativeNumber) Linking.openURL(`tel:${request.alternativeNumber}`); };
  const handleWhatsApp = () => {
    if (!request?.whatsappNumber) return;
    const phone = request.whatsappNumber.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent('Hello, I saw your blood request on Trinomul Blood Bank.')}`);
  };
  const handleShare = () => {
    if (!request) return;
    Share.share({ message: `Blood Request ${request.bloodGroup} - ${request.patientName}\nHospital: ${request.hospitalName}\nContact: ${request.contactNumber}${request.trackingCode ? `\nTracking: ${request.trackingCode}` : ''}` });
  };

  const urgency = request ? (URGENCY_CONFIG[request.urgencyLevel] ?? URGENCY_CONFIG.normal) : null;
  const statusLabel = request ? (STATUS_LABELS[request.currentStatus] ?? STATUS_LABELS[request.status] ?? request.status) : '';
  const stillNeed = request ? Math.max(0, request.unitsNeeded - request.donatedUnits) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_left' } as never} size={22} tintColor="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Request Details</Text>
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
      ) : request && urgency ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: insets.bottom + Spacing.six, gap: Spacing.three }}>
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.badgesRow}>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                    <Text style={[styles.urgencyText, { color: urgency.text }]}>{urgency.label}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.patientName}>{request.patientName}</Text>
                {request.trackingCode && <Text style={styles.trackingCode}>#{request.trackingCode}</Text>}
              </View>
              <View style={styles.bloodGroupBadge}>
                <Text style={styles.bloodGroupText}>{request.bloodGroup}</Text>
              </View>
            </View>

            <View style={styles.unitsRow}>
              <View style={styles.unitBox}>
                <Text style={styles.unitValue}>{request.unitsNeeded}</Text>
                <Text style={styles.unitLabel}>Units Needed</Text>
              </View>
              <View style={styles.unitBox}>
                <Text style={[styles.unitValue, { color: '#16a34a' }]}>{request.donatedUnits}</Text>
                <Text style={styles.unitLabel}>Donated</Text>
              </View>
              <View style={styles.unitBox}>
                <Text style={[styles.unitValue, { color: stillNeed > 0 ? Brand.red : '#16a34a' }]}>{stillNeed}</Text>
                <Text style={styles.unitLabel}>Still Need</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hospital & Location</Text>
            <Text style={styles.detailLine}>{request.hospitalName}</Text>
            {request.hospitalAddress && <Text style={styles.detailMuted}>{request.hospitalAddress}</Text>}
            <Text style={styles.detailMuted}>{request.upazila}, {request.district}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>When Needed</Text>
            <Text style={styles.detailLine}>{request.whenNeeded.replace(/_/g, ' ')}</Text>
            {request.neededDate && <Text style={styles.detailMuted}>Date: {formatDateTime(request.neededDate)}</Text>}
            {request.neededTime && <Text style={styles.detailMuted}>Time: {request.neededTime}</Text>}
          </View>

          {request.reason && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Reason</Text>
              <Text style={styles.detailLine}>{request.reason}</Text>
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <Text style={styles.detailLine}>Posted: {formatDateTime(request.createdAt)}</Text>
            {request.donatedAt && <Text style={styles.detailLine}>Donated: {formatDateTime(request.donatedAt)}</Text>}
            {request.fulfilledAt && <Text style={[styles.detailLine, { color: '#16a34a', fontWeight: '700' }]}>Fulfilled: {formatDateTime(request.fulfilledAt)}</Text>}
            <Text style={styles.detailMuted}>Views: {request.viewCount}</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={handleCall} style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never} size={16} tintColor="#fff" />
              <Text style={styles.btnText}>Call</Text>
            </Pressable>
            {request.whatsappNumber && (
              <Pressable onPress={handleWhatsApp} style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'message.fill', android: 'chat', web: 'message_circle' } as never} size={16} tintColor="#fff" />
                <Text style={styles.btnText}>WhatsApp</Text>
              </Pressable>
            )}
            {!request.whatsappNumber && request.alternativeNumber && (
              <Pressable onPress={handleCallAlt} style={({ pressed }) => [styles.altBtn, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never} size={16} tintColor="#fff" />
                <Text style={styles.btnText}>Alt</Text>
              </Pressable>
            )}
            <Pressable onPress={handleShare} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share_2' } as never} size={16} tintColor="#64748b" />
            </Pressable>
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
  mainCard: { backgroundColor: '#fff', borderRadius: 16, padding: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0', gap: Spacing.three },
  cardHeader: { flexDirection: 'row', gap: Spacing.three },
  badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  urgencyText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  patientName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  trackingCode: { fontSize: 12, fontWeight: '600', color: '#94a3b8', fontFamily: 'monospace' },
  bloodGroupBadge: { backgroundColor: Brand.red, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bloodGroupText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  unitsRow: { flexDirection: 'row', gap: Spacing.two },
  unitBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: Spacing.three, alignItems: 'center', gap: 3 },
  unitValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  unitLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  detailLine: { fontSize: 14, color: '#1e293b', lineHeight: 20, fontWeight: '600' },
  detailMuted: { fontSize: 13, color: '#64748b', lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Brand.red, paddingVertical: 14, borderRadius: 14 },
  whatsappBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#25D366', paddingVertical: 14, borderRadius: 14 },
  altBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  shareBtn: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});