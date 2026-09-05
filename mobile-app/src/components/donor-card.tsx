import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { QRShareButton } from '@/components/qr-share-button';
import { Strings } from '@/constants/strings';
import { API_BASE_URL } from '@/constants/config';
import { Spacing } from '@/constants/theme';
import { formatDistance } from '@/utils/geo';

export interface DonorCardData {
  id: number;
  fullName: string;
  bloodGroup: string;
  districtName: string;
  upazilaName: string;
  phone: string;
  totalDonations: number;
  isActive: boolean;
  isVerified: boolean;
  eligibleTypesCount: number;
  nextEligibleDate: string | null;
  createdAt: string;
  distanceKm?: number | null;
  eligibleWholeBlood?: boolean;
  eligiblePlatelets?: boolean;
  eligiblePlasma?: boolean;
  badges?: string[];
  totalReferrals?: number;
  totalUnits?: number;
  hbStatus?: 'eligible' | 'low_hb' | 'not_tested' | null;
  lastActiveAt?: string | null;
  isAnonymous?: boolean;
  avatarUrl?: string | null;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getSinceYear(createdAt: string): string | null {
  try {
    return new Date(createdAt).getFullYear().toString();
  } catch {
    return null;
  }
}

function getPresence(lastActiveAt: string | null | undefined): { label: string; color: string } | null {
  if (!lastActiveAt) return null;
  try {
    const last = new Date(lastActiveAt.includes('T') ? lastActiveAt : lastActiveAt.replace(' ', 'T') + 'Z').getTime();
    const diffMs = Date.now() - last;
    if (diffMs < 0) return null;
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(diffMs / 3600000);
    const day = Math.floor(diffMs / 86400000);
    if (min < 5) return { label: 'Active now', color: '#22c55e' };
    if (min < 60) return { label: `${min}m ago`, color: '#22c55e' };
    if (hr < 24) return { label: `${hr}h ago`, color: '#f59e0b' };
    if (day < 7) return { label: `${day}d ago`, color: '#94a3b8' };
    return { label: 'Offline', color: '#cbd5e1' };
  } catch {
    return null;
  }
}

function typeBadgeStyle(eligible: boolean | undefined): { bg: string; text: string; strike: boolean } {
  return eligible
    ? { bg: '#f0fdf4', text: '#15803d', strike: false }
    : { bg: '#f1f5f9', text: '#94a3b8', strike: true };
}

export function DonorCard({ donor }: { donor: DonorCardData }) {
  const displayName = donor.isAnonymous ? 'Anonymous Donor' : donor.fullName;
  const initials = getInitials(donor.fullName);
  const sinceYear = getSinceYear(donor.createdAt);
  const isAvailable = donor.eligibleTypesCount > 0;
  const isCoolingDown = !isAvailable && donor.nextEligibleDate;
  const presence = getPresence(donor.lastActiveAt);
  const typeCount = donor.eligibleTypesCount ?? 0;

  const wb = typeBadgeStyle(donor.eligibleWholeBlood);
  const pl = typeBadgeStyle(donor.eligiblePlatelets);
  const pm = typeBadgeStyle(donor.eligiblePlasma);

  const handleCall = () => {
    if (!donor.isAnonymous) Linking.openURL(`tel:${donor.phone}`);
  };

  const handleWhatsApp = () => {
    if (donor.isAnonymous) return;
    const phone = donor.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      'Hello, I found your profile on Trinomul Blood Bank and I need blood donation assistance.',
    );
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          {donor.avatarUrl && !donor.isAnonymous ? (
            <Image
              source={donor.avatarUrl}
              style={styles.avatar}
              contentFit="cover"
              placeholder={undefined}
              transition={150}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {presence && (
            <View style={[styles.presenceDot, { backgroundColor: presence.color }]} />
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.bloodGroupRow}>
            <Text style={styles.bloodGroup}>{donor.bloodGroup}</Text>
            <View style={[styles.statusBadge, isAvailable ? styles.statusAvailable : styles.statusUnavailable]}>
              <SymbolView
                name={isAvailable
                  ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never
                  : { ios: 'clock.fill', android: 'schedule', web: 'clock' } as never}
                size={9}
                tintColor={isAvailable ? '#16a34a' : '#d97706'}
              />
              <Text style={[styles.statusText, isAvailable ? styles.textAvailable : styles.textCooling]}>
                {isAvailable ? `${Strings.available}${typeCount < 3 ? ` ${typeCount}/3` : ''}` : isCoolingDown ? Strings.coolingDown : Strings.unavailable}
              </Text>
            </View>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {donor.isVerified && (
              <SymbolView
                name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as never}
                size={13}
                tintColor="#16a34a"
              />
            )}
            {presence && (
              <Text style={styles.presenceText}>{presence.label}</Text>
            )}
          </View>
          <View style={styles.locationRow}>
            <SymbolView
              name={{ ios: 'mappin', android: 'place', web: 'map_pin' } as never}
              size={10}
              tintColor="#94a3b8"
            />
            <Text style={styles.location} numberOfLines={1}>
              {donor.upazilaName}, {donor.districtName}
            </Text>
            {typeof donor.distanceKm === 'number' && (
              <View style={styles.distanceBadge}>
                <SymbolView
                  name={{ ios: 'location.fill', android: 'navigation', web: 'navigation' } as never}
                  size={8}
                  tintColor="#16a34a"
                />
                <Text style={styles.distanceText}>{formatDistance(donor.distanceKm)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.typeBadgesRow}>
        <View style={[styles.typeBadge, { backgroundColor: wb.bg }]}>
          <Text style={[styles.typeBadgeText, { color: wb.text, textDecorationLine: wb.strike ? 'line-through' : 'none' }]}>
            Whole Blood
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: pl.bg }]}>
          <Text style={[styles.typeBadgeText, { color: pl.text, textDecorationLine: pl.strike ? 'line-through' : 'none' }]}>
            Platelets
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: pm.bg }]}>
          <Text style={[styles.typeBadgeText, { color: pm.text, textDecorationLine: pm.strike ? 'line-through' : 'none' }]}>
            Plasma
          </Text>
        </View>
        {donor.hbStatus && (
          <View style={[styles.typeBadge, {
            backgroundColor: donor.hbStatus === 'eligible' ? '#f0fdf4' : donor.hbStatus === 'low_hb' ? '#fef2f2' : '#fefce8',
          }]}>
            <Text style={[styles.typeBadgeText, {
              color: donor.hbStatus === 'eligible' ? '#15803d' : donor.hbStatus === 'low_hb' ? '#dc2626' : '#ca8a04',
            }]}>
              {donor.hbStatus === 'eligible' ? 'Hb OK' : donor.hbStatus === 'low_hb' ? 'Low Hb' : 'Hb?'}
            </Text>
          </View>
        )}
      </View>

      {donor.badges && donor.badges.length > 0 && (
        <View style={styles.achievementBadges}>
          {donor.badges.slice(0, 4).map((badge, i) => (
            <View key={i} style={styles.achievementBadge}>
              <Text style={styles.achievementText}>{badge}</Text>
            </View>
          ))}
        </View>
      )}

      {isCoolingDown && donor.nextEligibleDate && (
        <View style={styles.cooldownBanner}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'alert_triangle' } as never}
            size={12}
            tintColor="#d97706"
          />
          <Text style={styles.cooldownText}>
            {Strings.eligibleFrom}: {new Date(donor.nextEligibleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          {donor.totalDonations > 0 && (
            <View style={styles.statItem}>
              <SymbolView
                name={{ ios: 'heart.fill', android: 'favorite', web: 'heart' } as never}
                size={11}
                tintColor={Brand.red}
              />
              <Text style={styles.statText}>{donor.totalDonations}</Text>
            </View>
          )}
          {(donor.totalReferrals ?? 0) > 0 && (
            <View style={styles.statItem}>
              <SymbolView
                name={{ ios: 'hand.raised.fill', android: 'handshake', web: 'handshake' } as never}
                size={11}
                tintColor="#6366f1"
              />
              <Text style={styles.statText}>{donor.totalReferrals}</Text>
            </View>
          )}
          {(donor.totalUnits ?? 0) > 0 && (
            <View style={styles.statItem}>
              <SymbolView
                name={{ ios: 'person.2.fill', android: 'groups', web: 'users' } as never}
                size={11}
                tintColor="#0ea5e9"
              />
              <Text style={styles.statText}>{donor.totalUnits} lives</Text>
            </View>
          )}
          {sinceYear && (
            <Text style={styles.sinceText}>{Strings.donorSince} {sinceYear}</Text>
          )}
        </View>
        {!donor.isAnonymous && (
          <View style={styles.actionButtons}>
            <Pressable onPress={handleCall} style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never}
                size={12}
                tintColor={Brand.red}
              />
              <Text style={styles.callBtnText}>{Strings.contact}</Text>
            </Pressable>
            <Pressable onPress={handleWhatsApp} style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]} hitSlop={6}>
              <SymbolView
                name={{ ios: 'message.fill', android: 'chat', web: 'message_circle' } as never}
                size={14}
                tintColor="#25D366"
              />
            </Pressable>
            <QRShareButton
              title={displayName}
              subtitle={`${donor.bloodGroup} • ${donor.districtName}`}
              url={`${API_BASE_URL}/donors?donor=${donor.id}`}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerRight: {
    flex: 1,
    gap: 3,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodGroup: {
    fontSize: 20,
    fontWeight: '900',
    color: Brand.red,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  statusAvailable: {
    backgroundColor: '#f0fdf4',
  },
  statusUnavailable: {
    backgroundColor: '#fffbeb',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textAvailable: {
    color: '#16a34a',
  },
  textCooling: {
    color: '#d97706',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  presenceText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  location: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
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

  typeBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  achievementBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  achievementBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  achievementText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cooldownText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  sinceText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: Brand.red,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.red,
  },
  whatsappBtn: {
    borderWidth: 1.5,
    borderColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
