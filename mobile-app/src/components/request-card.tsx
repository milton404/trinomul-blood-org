import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { formatDistance } from '@/utils/geo';

export interface RequestCardData {
  id: number;
  patientName: string;
  bloodGroup: string;
  hospitalName: string;
  hospitalAddress: string;
  districtName: string;
  upazilaName: string;
  urgencyLevel: string;
  whenNeeded: string;
  neededDate: string | null;
  unitsNeeded: number;
  reason: string | null;
  contactNumber: string;
  whatsappNumber: string | null;
  status: string;
  createdAt: string;
  distanceKm?: number | null;
  trackingCode?: string | null;
  neededTime?: string | null;
  alternativeNumber?: string | null;
  isLastChance?: boolean;
}

const URGENCY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; bar: string }> = {
  critical: { label: 'Critical', bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', bar: '#ef4444' },
  urgent: { label: 'Urgent', bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', bar: '#f59e0b' },
  normal: { label: 'Normal', bg: '#f8fafc', text: '#475569', dot: '#94a3b8', bar: '#cbd5e1' },
};

const WHEN_NEEDED_LABELS: Record<string, string> = {
  now: 'Now',
  today: 'Today',
  tomorrow: 'Tomorrow',
  day_after: 'Day After',
  specific_date: 'Scheduled',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  matching: 'Finding Donor',
  donor_found: 'Donor Found',
  donating: 'Donating',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  expired: 'Expired',
  active: 'Active',
};

function formatPostedAt(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatNeededTime(time: string | null | undefined): string {
  if (!time) return '';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

export function RequestCard({ request }: { request: RequestCardData }) {
  const urgency = URGENCY_CONFIG[request.urgencyLevel] ?? URGENCY_CONFIG.normal;
  const whenLabel = WHEN_NEEDED_LABELS[request.whenNeeded] ?? request.whenNeeded;
  const statusLabel = STATUS_LABELS[request.status] ?? request.status;
  const postedAt = formatPostedAt(request.createdAt);
  const neededTimeStr = formatNeededTime(request.neededTime);
  const unitsLabel = `${request.unitsNeeded} ${request.unitsNeeded > 1 ? 'units' : 'unit'}`;
  const isFulfilled = request.status === 'fulfilled';
  const isExpired = request.status === 'expired';
  const isLastChance = request.isLastChance && !isFulfilled && !isExpired;

  const barColor = isFulfilled ? '#22c55e' : isExpired ? '#f43f5e' : isLastChance ? '#f59e0b' : urgency.bar;

  const handleCall = () => {
    Linking.openURL(`tel:${request.contactNumber}`);
  };

  const handleCallAlt = () => {
    if (request.alternativeNumber) Linking.openURL(`tel:${request.alternativeNumber}`);
  };

  const handleWhatsApp = () => {
    if (!request.whatsappNumber) return;
    const phone = request.whatsappNumber.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      'Hello, I saw your blood request on Trinomul Blood Bank and I would like to help.',
    );
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  return (
    <View style={styles.card}>
      <View style={[styles.urgencyBar, { backgroundColor: barColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badgesRow}>
              <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                <View style={[styles.urgencyDot, { backgroundColor: urgency.dot }]} />
                <Text style={[styles.urgencyText, { color: urgency.text }]}>{urgency.label}</Text>
              </View>
              {isLastChance && (
                <View style={styles.lastChanceBadge}>
                  <SymbolView
                    name={{ ios: 'clock.fill', android: 'schedule', web: 'clock' } as never}
                    size={8}
                    tintColor="#92400e"
                  />
                  <Text style={styles.lastChanceText}>Last Chance</Text>
                </View>
              )}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{statusLabel}</Text>
                <Text style={styles.statusDot}>·</Text>
                <Text style={styles.statusText}>{unitsLabel}</Text>
              </View>
            </View>
            <Text style={styles.patientName} numberOfLines={2}>{request.patientName}</Text>
            {request.trackingCode && (
              <Text style={styles.trackingCode}>#{request.trackingCode}</Text>
            )}
          </View>
          <View style={styles.bloodGroupBox}>
            <Text style={styles.bloodGroup}>{request.bloodGroup}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <SymbolView
              name={{ ios: 'cross.fill', android: 'local_hospital', web: 'plus_square' } as never}
              size={11}
              tintColor="#64748b"
            />
            <Text style={styles.infoText} numberOfLines={2}>{request.hospitalName}</Text>
          </View>
          <View style={styles.infoItem}>
            <SymbolView
              name={{ ios: 'mappin', android: 'place', web: 'map_pin' } as never}
              size={11}
              tintColor="#64748b"
            />
            <Text style={styles.infoText} numberOfLines={2}>
              {request.upazilaName}, {request.districtName}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <SymbolView
              name={{ ios: 'calendar', android: 'event', web: 'calendar' } as never}
              size={11}
              tintColor="#64748b"
            />
            <Text style={styles.infoText}>
              Needed: <Text style={styles.infoTextBold}>{whenLabel}{request.neededDate ? ` · ${new Date(request.neededDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}{neededTimeStr ? ` ${neededTimeStr}` : ''}</Text>
            </Text>
          </View>
          <View style={styles.infoItem}>
            <SymbolView
              name={{ ios: 'clock.fill', android: 'schedule', web: 'clock' } as never}
              size={11}
              tintColor="#94a3b8"
            />
            <Text style={styles.infoTextMuted}>{postedAt}</Text>
            {typeof request.distanceKm === 'number' && (
              <View style={styles.distanceBadge}>
                <SymbolView
                  name={{ ios: 'location.fill', android: 'navigation', web: 'navigation' } as never}
                  size={8}
                  tintColor="#16a34a"
                />
                <Text style={styles.distanceText}>{formatDistance(request.distanceKm)}</Text>
              </View>
            )}
          </View>
        </View>

        {request.reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText} numberOfLines={2}>{request.reason}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Pressable onPress={handleCall} style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never}
              size={13}
              tintColor="#fff"
            />
            <Text style={styles.callBtnText}>{Strings.contact}</Text>
          </Pressable>
          {request.whatsappNumber && (
            <Pressable onPress={handleWhatsApp} style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'message.fill', android: 'chat', web: 'message_circle' } as never}
                size={13}
                tintColor="#fff"
              />
              <Text style={styles.whatsappBtnText}>WhatsApp</Text>
            </Pressable>
          )}
          {!request.whatsappNumber && request.alternativeNumber && (
            <Pressable onPress={handleCallAlt} style={({ pressed }) => [styles.altBtn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never}
                size={13}
                tintColor="#fff"
              />
              <Text style={styles.altBtnText}>Alt</Text>
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]} hitSlop={6}>
            <SymbolView
              name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share_2' } as never}
              size={13}
              tintColor="#64748b"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  urgencyBar: {
    height: 3,
    width: '100%',
  },
  cardBody: {
    padding: 12,
    gap: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lastChanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lastChanceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  statusDot: {
    fontSize: 9,
    color: '#94a3b8',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
  },
  trackingCode: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  bloodGroupBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodGroup: {
    fontSize: 17,
    fontWeight: '900',
    color: Brand.red,
  },

  infoGrid: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  infoTextBold: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoTextMuted: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  distanceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
  },

  reasonBox: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Brand.red,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  whatsappBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  altBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
