import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/api';

function timeAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return 'just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

function iconForType(type: string): { ios: string; android: string; web: string; color: string } {
  if (type.includes('like')) return { ios: 'heart.fill', android: 'favorite', web: 'thumb_up', color: Brand.red };
  if (type.includes('comment')) return { ios: 'bubble.left.fill', android: 'comment', web: 'chat_bubble', color: '#0ea5e9' };
  if (type.includes('request')) return { ios: 'drop.fill', android: 'bloodtype', web: 'bloodtype', color: Brand.red };
  return { ios: 'bell.fill', android: 'notifications', web: 'notifications', color: '#64748b' };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyNotifications();
      setItems(data);
      setNeedsAuth(false);
    } catch (err: any) {
      if (err?.message === 'Unauthorized' || err?.message === 'HTTP 401') {
        setNeedsAuth(true);
      } else {
        setError(err?.message || Strings.submitError);
      }
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkOne = async (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      // optimistic; next refresh will reconcile
    }
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // optimistic; next refresh will reconcile
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = iconForType(item.type);
    return (
      <Pressable
        onPress={() => !item.isRead && handleMarkOne(item.id)}
        style={({ pressed }) => [styles.card, !item.isRead && styles.cardUnread, pressed && styles.pressed]}>
        <View style={[styles.iconBox, { backgroundColor: `${icon.color}1a` }]}>
          <SymbolView name={icon as never} size={18} tintColor={icon.color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardText} numberOfLines={3}>
            {item.content || item.type}
          </Text>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

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
          <Text style={styles.headerTitle}>{Strings.notificationsNav}</Text>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAll} hitSlop={8} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>{Strings.markAllRead}</Text>
            </Pressable>
          )}
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
          <Pressable onPress={() => load()} style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}>
            <Text style={styles.ctaBtnText}>{Strings.retry}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <SymbolView
            name={{ ios: 'bell', android: 'notifications_none', web: 'notifications' } as never}
            size={48}
            tintColor="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>{Strings.noNotificationsTitle}</Text>
          <Text style={styles.emptyHint}>{Strings.noNotificationsHint}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Brand.red} />
          }
          contentContainerStyle={{
            paddingHorizontal: Spacing.four,
            paddingTop: Spacing.four,
            paddingBottom: BottomTabInset + Spacing.four,
            gap: Spacing.two,
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
    flex: 1,
  },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: Spacing.two,
  },
  cardUnread: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardText: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 19,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Brand.red,
  },
  pressed: { opacity: 0.7 },
});