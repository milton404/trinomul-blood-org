import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { BloodDrop } from '@/components/blood-drop';
import { Brand } from '@/constants/brand';
import { MAP_HTML } from '@/constants/map-html';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { fetchDonors, fetchRequests, type FetchedDonor, type FetchedRequest } from '@/lib/api';

type Tab = 'all' | 'donors' | 'requests';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: Strings.mapAll },
  { value: 'donors', label: Strings.mapDonors },
  { value: 'requests', label: Strings.mapRequests },
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [donors, setDonors] = useState<FetchedDonor[]>([]);
  const [requests, setRequests] = useState<FetchedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [webViewReady, setWebViewReady] = useState(false);

  const { location, isLocating, requestLocation } = useUserLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [d, r] = await Promise.all([fetchDonors(), fetchRequests()]);
      if (cancelled) return;
      setDonors(d.data);
      setRequests(r.data);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    requestLocation();
  }, []);

  const markerData = useMemo(() => {
    const donorList = tab === 'requests' ? [] : donors.map((d) => ({
      lat: d.lat,
      lng: d.lng,
      bloodGroup: d.bloodGroup,
      upazila: d.upazilaName,
      district: d.districtName,
      eligibleTypesCount: d.eligibleTypesCount,
    }));

    const requestList = tab === 'donors' ? [] : requests.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      bloodGroup: r.bloodGroup,
      patientName: r.patientName,
      hospitalName: r.hospitalName,
      upazila: r.upazilaName,
      district: r.districtName,
      urgency: r.urgencyLevel,
      unitsNeeded: r.unitsNeeded,
      phone: r.contactNumber,
    }));

    return JSON.stringify({ donors: donorList, requests: requestList });
  }, [donors, requests, tab]);

  useEffect(() => {
    if (!webViewReady) return;
    webViewRef.current?.postMessage(JSON.stringify({ type: 'markers', data: markerData }));
  }, [markerData, webViewReady]);

  useEffect(() => {
    if (!webViewReady || !location) return;
    webViewRef.current?.postMessage(JSON.stringify({ type: 'userLocation', lat: location.lat, lng: location.lng }));
  }, [location, webViewReady]);

  const handleWebViewMessage = (_event: WebViewMessageEvent) => {
  };

  const renderTab = (t: { value: Tab; label: string }) => (
    <Pressable
      key={t.value}
      onPress={() => setTab(t.value)}
      style={[styles.tab, tab === t.value && styles.tabActive]}>
      <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.mapTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{Strings.mapSubtitle}</Text>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map(renderTab)}
        <Pressable
          onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'fit' }))}
          style={styles.fitBtn}>
          <SymbolView
            name={{ ios: 'scope', android: 'my_location', web: 'navigation' } as never}
            size={14}
            tintColor={Brand.red}
          />
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          onLoad={() => setWebViewReady(true)}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={Brand.red} />
            </View>
          )}
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mixedContentMode="compatibility"
          geolocationEnabled
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Brand.red} />
            <Text style={styles.loadingText}>{Strings.loadingDonors}</Text>
          </View>
        )}

        {isLocating && !location && (
          <View style={styles.locatingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.locatingText}>{Strings.locating}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
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
    alignItems: 'center',
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
  fitBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Brand.red,
  },

  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  locatingOverlay: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220,38,38,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  locatingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
