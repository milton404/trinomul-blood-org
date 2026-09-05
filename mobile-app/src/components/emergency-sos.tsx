import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '@/constants/brand';
import { BLOOD_GROUPS } from '@/constants/data';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { submitRequest } from '@/lib/api';

type SosState = 'idle' | 'countdown' | 'form' | 'submitting' | 'success';

export function EmergencySOSButton() {
  const [state, setState] = useState<SosState>('idle');
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bloodGroup, setBloodGroup] = useState('');
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { location: gps, isLocating, requestLocation } = useUserLocation();

  const startSOS = () => {
    setState('countdown');
    setCountdown(5);
  };

  const cancelSOS = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('idle');
    setCountdown(5);
  };

  useEffect(() => {
    if (state !== 'countdown') return;
    if (countdown <= 0) {
      setState('form');
      requestLocation();
      return;
    }
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, countdown]);

  const canSubmit =
    bloodGroup !== '' &&
    patientName.trim().length >= 2 &&
    contactNumber.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || state === 'submitting') return;
    setState('submitting');
    setSubmitError(null);
    try {
      await submitRequest({
        patientName: patientName.trim(),
        bloodGroup,
        unitsNeeded: 1,
        urgencyLevel: 'critical',
        whenNeeded: 'now',
        districtId: 'rangpur',
        upazilaId: 'rangpur_sadar',
        hospitalName: location.trim() || 'Emergency SOS',
        hospitalAddress: gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'Emergency location',
        contactNumber: contactNumber.trim(),
        reason: `🚨 EMERGENCY SOS: ${reason.trim() || 'Critical emergency'}`,
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
      });
      setState('success');
    } catch (err: any) {
      setSubmitError(err?.message || Strings.submitError);
      setState('form');
    }
  };

  const resetSOS = () => {
    setState('idle');
    setBloodGroup('');
    setPatientName('');
    setLocation('');
    setContactNumber('');
    setReason('');
    setSubmitError(null);
  };

  const call999 = () => Linking.openURL('tel:999');

  return (
    <>
      <Pressable onPress={startSOS} style={({ pressed }) => [styles.sosBtn, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'alert_triangle' } as never}
          size={16}
          tintColor="#fff"
        />
        <Text style={styles.sosBtnText}>{Strings.sos}</Text>
      </Pressable>

      <Modal visible={state !== 'idle'} animationType="slide" transparent={false} onRequestClose={cancelSOS}>
        {state === 'countdown' && (
          <View style={styles.countdownScreen}>
            <Text style={styles.countdownLabel}>{Strings.sosStarting}</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownWarning}>{Strings.sosWarning}</Text>
            <Pressable onPress={cancelSOS} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <Text style={styles.cancelBtnText}>{Strings.sosCancel}</Text>
            </Pressable>
          </View>
        )}

        {state === 'success' && (
          <View style={styles.successScreen}>
            <View style={styles.successIcon}>
              <SymbolView
                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never}
                size={56}
                tintColor="#fff"
              />
            </View>
            <Text style={styles.successTitle}>{Strings.sosSuccess}</Text>
            <Text style={styles.successHint}>{Strings.sosSuccessHint}</Text>
            <Pressable onPress={call999} style={({ pressed }) => [styles.call999Btn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never}
                size={18}
                tintColor="#fff"
              />
              <Text style={styles.call999Text}>{Strings.sos999}</Text>
            </Pressable>
            <Pressable onPress={resetSOS} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        )}

        {(state === 'form' || state === 'submitting') && (
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sosHeader}>
              <View style={styles.sosHeaderTop}>
                <Pressable onPress={cancelSOS} hitSlop={12}>
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'x' } as never}
                    size={22}
                    tintColor="#fff"
                  />
                </Pressable>
                <Text style={styles.sosHeaderText}>{Strings.sosActivated}</Text>
              </View>
            </View>

            <View style={styles.sosWarningBar}>
              <SymbolView
                name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'alert_triangle' } as never}
                size={14}
                tintColor="#991b1b"
              />
              <Text style={styles.sosWarningText}>{Strings.sosWarning}</Text>
            </View>

            <View style={styles.sosContent}>
              <Pressable onPress={call999} style={({ pressed }) => [styles.call999Bar, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'phone.fill', android: 'call', web: 'phone' } as never}
                  size={18}
                  tintColor="#fff"
                />
                <Text style={styles.call999BarText}>{Strings.sos999}</Text>
              </Pressable>

              <View style={styles.sosField}>
                <Text style={styles.sosLabel}>{Strings.sosBloodGroup}</Text>
                <View style={styles.bgGrid}>
                  {BLOOD_GROUPS.map((bg) => (
                    <Pressable
                      key={bg}
                      onPress={() => setBloodGroup(bg)}
                      style={[styles.bgBtn, bloodGroup === bg && styles.bgBtnActive]}>
                      <Text style={[styles.bgBtnText, bloodGroup === bg && styles.bgBtnTextActive]}>{bg}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.sosField}>
                <Text style={styles.sosLabel}>{Strings.sosPatientName}</Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="e.g. Abdul Karim"
                  placeholderTextColor="#94a3b8"
                  style={styles.sosInput}
                />
              </View>

              <View style={styles.sosField}>
                <Text style={styles.sosLabel}>{Strings.sosLocation}</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. RMCH, Rangpur"
                  placeholderTextColor="#94a3b8"
                  style={styles.sosInput}
                />
                {isLocating && <Text style={styles.gpsText}>{Strings.locating}</Text>}
                {gps && !location && (
                  <Text style={styles.gpsText}>GPS: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</Text>
                )}
              </View>

              <View style={styles.sosField}>
                <Text style={styles.sosLabel}>{Strings.sosContact}</Text>
                <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="e.g. 01711-123456"
                  placeholderTextColor="#94a3b8"
                  style={styles.sosInput}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.sosField}>
                <Text style={styles.sosLabel}>{Strings.sosReason}</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder={Strings.sosReasonPlaceholder}
                  placeholderTextColor="#94a3b8"
                  style={[styles.sosInput, styles.multilineInput]}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              {submitError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit || state === 'submitting'}
                style={({ pressed }) => [
                  styles.sosSubmitBtn,
                  (!canSubmit || state === 'submitting') && styles.sosSubmitDisabled,
                  pressed && styles.pressed,
                ]}>
                {state === 'submitting' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <SymbolView
                      name={{ ios: 'paperplane.fill', android: 'send', web: 'send' } as never}
                      size={18}
                      tintColor="#fff"
                    />
                    <Text style={styles.sosSubmitBtnText}>{Strings.sosSubmit}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#991b1b',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#dc2626',
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sosBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  countdownScreen: {
    flex: 1,
    backgroundColor: '#991b1b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: '600',
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '900',
  },
  countdownWarning: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.six,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  successScreen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  successHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  call999Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#991b1b',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: Spacing.three,
  },
  call999Text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },

  sosHeader: {
    backgroundColor: '#991b1b',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  sosHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sosHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },

  sosWarningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  sosWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
    flex: 1,
  },

  sosContent: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  call999Bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#991b1b',
    paddingVertical: 12,
    borderRadius: 14,
  },
  call999BarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  sosField: {
    gap: 6,
  },
  sosLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sosInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  multilineInput: {
    minHeight: 60,
  },
  gpsText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bgBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgBtnActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  bgBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  bgBtnTextActive: {
    color: '#fff',
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },

  sosSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#991b1b',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: Spacing.two,
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosSubmitDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sosSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});