import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleScan = (code: string) => {
    if (scanned) return;
    setScanned(true);
    setScanResult(code);

    // Parse QR code content
    // Format: /donors?donor=123 or /track/REQ-AB12CD
    if (code.includes('/donors?donor=')) {
      const donorId = code.split('donor=')[1]?.split('&')[0];
      if (donorId) {
        router.push('/donors' as never);
      }
    } else if (code.includes('/track/')) {
      const trackingCode = code.split('/track/')[1]?.split('?')[0];
      if (trackingCode) {
        router.push('/requests' as never);
      }
    } else if (code.startsWith('http')) {
      // Handle any URL
      Alert.alert('QR Code Scanned', code, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    } else {
      Alert.alert('QR Code Scanned', code, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
  };

  const hasPermission = permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.scannerTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{Strings.scannerSubtitle}</Text>
      </View>

      {hasPermission === false && (
        <View style={styles.permissionSection}>
          <View style={styles.permissionCard}>
            <SymbolView
              name={{ ios: 'camera.badge.slash', android: 'camera_off', web: 'camera_off' } as never}
              size={48}
              tintColor="#94a3b8"
            />
            <Text style={styles.permissionTitle}>Camera permission needed</Text>
            <Text style={styles.permissionHint}>Allow camera access to scan QR codes</Text>
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      )}

      {hasPermission && !scanned && (
        <View style={styles.cameraSection}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={(result: { data: string }) => handleScan(result.data)}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={styles.scanCornerTL} />
              <View style={styles.scanCornerTR} />
              <View style={styles.scanCornerBL} />
              <View style={styles.scanCornerBR} />
            </View>
            <Text style={styles.scanHint}>{Strings.scanHint}</Text>
          </View>
        </View>
      )}

      {scanned && scanResult && (
        <View style={styles.resultSection}>
          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <SymbolView
                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never}
                size={48}
                tintColor="#16a34a"
              />
            </View>
            <Text style={styles.resultTitle}>Code Scanned!</Text>
            <Text style={styles.resultCode} numberOfLines={2}>{scanResult}</Text>
            <Pressable
              onPress={resetScanner}
              style={({ pressed }) => [styles.scanAgainBtn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'rotate.right', android: 'refresh', web: 'refresh' } as never}
                size={16}
                tintColor="#fff"
              />
              <Text style={styles.scanAgainText}>Scan Another</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.manualSection}>
        <Text style={styles.sectionTitle}>Enter Code Manually</Text>
        <View style={styles.manualRow}>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Paste QR code or tracking code"
            placeholderTextColor="#94a3b8"
            style={styles.manualInput}
            autoCapitalize="none"
          />
          <Pressable
            onPress={handleManualSubmit}
            disabled={!manualCode.trim()}
            style={({ pressed }) => [
              styles.manualSubmit,
              !manualCode.trim() && styles.manualSubmitDisabled,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_right' } as never}
              size={18}
              tintColor="#fff"
            />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingBottom: BottomTabInset + Spacing.six }} />
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

  permissionSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 320,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  permissionHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: Brand.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  cameraSection: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: Brand.red,
    borderRadius: 16,
    position: 'relative',
  },
  scanCornerTL: {
    position: 'absolute',
    top: -3, left: -3,
    width: 30, height: 30,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderTopLeftRadius: 16,
    borderColor: Brand.red,
  },
  scanCornerTR: {
    position: 'absolute',
    top: -3, right: -3,
    width: 30, height: 30,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopRightRadius: 16,
    borderColor: Brand.red,
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: -3, left: -3,
    width: 30, height: 30,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
    borderColor: Brand.red,
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: -3, right: -3,
    width: 30, height: 30,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderBottomRightRadius: 16,
    borderColor: Brand.red,
  },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.four,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  resultSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 320,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  resultCode: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  manualSection: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  manualRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  manualSubmit: {
    width: 48,
    backgroundColor: Brand.red,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitDisabled: {
    backgroundColor: '#cbd5e1',
  },

  pressed: {
    opacity: 0.85,
  },
});