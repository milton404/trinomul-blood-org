import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { SelectDropdown } from '@/components/select-dropdown';
import { Brand } from '@/constants/brand';
import { BLOOD_GROUPS, DISTRICTS, getUpazilasByDistrict } from '@/constants/data';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { submitRequest } from '@/lib/api';

const BG_OPTIONS = BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }));
const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d.id, label: d.name }));

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'critical', label: Strings.critical },
  { value: 'urgent', label: Strings.urgent },
  { value: 'normal', label: Strings.normal },
];

const WHEN_OPTIONS: { value: string; label: string }[] = [
  { value: 'now', label: Strings.neededNow },
  { value: 'today', label: Strings.neededToday },
  { value: 'tomorrow', label: Strings.neededTomorrow },
  { value: 'day_after', label: Strings.neededDayAfter },
  { value: 'specific_date', label: Strings.neededScheduled },
];

export default function RequestFormScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState('1');
  const [urgencyLevel, setUrgencyLevel] = useState('urgent');
  const [whenNeeded, setWhenNeeded] = useState('today');
  const [districtId, setDistrictId] = useState('');
  const [upazilaId, setUpazilaId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [reason, setReason] = useState('');

  const upazilaOptions = districtId
    ? getUpazilasByDistrict(districtId).map((u) => ({ value: u.id, label: u.name }))
    : [];

  const canSubmit =
    patientName.trim().length >= 2 &&
    bloodGroup !== '' &&
    parseInt(unitsNeeded, 10) >= 1 &&
    districtId !== '' &&
    upazilaId !== '' &&
    hospitalName.trim().length >= 2 &&
    hospitalAddress.trim().length >= 5 &&
    contactNumber.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const result = await submitRequest({
        patientName: patientName.trim(),
        bloodGroup,
        unitsNeeded: parseInt(unitsNeeded, 10),
        urgencyLevel,
        whenNeeded,
        districtId,
        upazilaId,
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        contactNumber: contactNumber.trim(),
        whatsappNumber: whatsappNumber.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setTrackingCode(result.trackingCode);
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPatientName('');
    setBloodGroup('');
    setUnitsNeeded('1');
    setUrgencyLevel('urgent');
    setWhenNeeded('today');
    setDistrictId('');
    setUpazilaId('');
    setHospitalName('');
    setHospitalAddress('');
    setContactNumber('');
    setWhatsappNumber('');
    setReason('');
    setSubmitted(false);
    setSubmitError(false);
    setTrackingCode(null);
  };

  if (submitted) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: Spacing.three,
          paddingHorizontal: Spacing.four,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + Spacing.five,
        }}>
        <View style={styles.successIcon}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never}
            size={56}
            tintColor="#fff"
          />
        </View>
        <Text style={styles.successTitle}>{Strings.requestSubmitted}</Text>
        <Text style={styles.successHint}>{Strings.requestSubmittedHint}</Text>
        {trackingCode && (
          <View style={styles.trackingCodeBox}>
            <Text style={styles.trackingCodeLabel}>{Strings.trackingCode}</Text>
            <Text style={styles.trackingCodeValue}>{trackingCode}</Text>
            <Text style={styles.trackingCodeHint}>{Strings.trackingCodeHint}</Text>
          </View>
        )}
        <Pressable
          onPress={resetForm}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'plus' } as never}
            size={18}
            tintColor="#fff"
          />
          <Text style={styles.primaryBtnText}>{Strings.postAnother}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/requests' as never)}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
          <Text style={styles.secondaryBtnText}>{Strings.backToRequests}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const renderUrgencyChip = (opt: { value: string; label: string }) => {
    const isActive = opt.value === urgencyLevel;
    return (
      <Pressable
        key={opt.value}
        onPress={() => setUrgencyLevel(opt.value)}
        style={[styles.formChip, isActive && styles.formChipActive]}
        hitSlop={4}>
        <Text style={[styles.formChipText, isActive && styles.formChipTextActive]}>{opt.label}</Text>
      </Pressable>
    );
  };

  const renderWhenChip = (opt: { value: string; label: string }) => {
    const isActive = opt.value === whenNeeded;
    return (
      <Pressable
        key={opt.value}
        onPress={() => setWhenNeeded(opt.value)}
        style={[styles.formChip, isActive && styles.formChipActive]}
        hitSlop={4}>
        <Text style={[styles.formChipText, isActive && styles.formChipTextActive]}>{opt.label}</Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_left' } as never}
              size={22}
              tintColor="#fff"
            />
          </Pressable>
          <Text style={styles.headerTitle}>{Strings.postRequest}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: Spacing.four,
          paddingBottom: insets.bottom + Spacing.six,
          gap: Spacing.four,
        }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{Strings.patientName}</Text>
          <TextInput
            value={patientName}
            onChangeText={setPatientName}
            placeholder="e.g. Abdul Karim"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <SelectDropdown
              value={bloodGroup}
              options={BG_OPTIONS}
              onChange={setBloodGroup}
              placeholder={Strings.selectBloodGroup}
              label={Strings.bloodGroupRequired}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{Strings.unitsNeeded}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setUnitsNeeded(String(Math.max(1, parseInt(unitsNeeded, 10) - 1)))}
                style={styles.stepperBtn}
                hitSlop={8}>
                <SymbolView
                  name={{ ios: 'minus', android: 'remove', web: 'minus' } as never}
                  size={18}
                  tintColor="#475569"
                />
              </Pressable>
              <Text style={styles.stepperValue}>{unitsNeeded}</Text>
              <Pressable
                onPress={() => setUnitsNeeded(String(Math.min(10, parseInt(unitsNeeded, 10) + 1)))}
                style={styles.stepperBtn}
                hitSlop={8}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'plus' } as never}
                  size={18}
                  tintColor="#475569"
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.urgencyLevel}</Text>
          <View style={styles.chipsContainer}>
            {URGENCY_OPTIONS.map(renderUrgencyChip)}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.whenNeeded}</Text>
          <View style={styles.chipsContainer}>
            {WHEN_OPTIONS.map(renderWhenChip)}
          </View>
        </View>

        <View style={styles.field}>
          <SelectDropdown
            value={districtId}
            options={DISTRICT_OPTIONS}
            onChange={(v) => { setDistrictId(v); setUpazilaId(''); }}
            placeholder={Strings.selectDistrict}
            label={Strings.district}
            searchable
            searchPlaceholder="Search district…"
          />
        </View>

        <View style={styles.field}>
          <SelectDropdown
            value={upazilaId}
            options={upazilaOptions}
            onChange={setUpazilaId}
            placeholder={districtId ? Strings.selectUpazila : Strings.selectDistrict}
            label="Upazila"
            disabled={!districtId}
            searchable={upazilaOptions.length > 0}
            searchPlaceholder="Search upazila…"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.hospitalName}</Text>
          <TextInput
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="e.g. Rangpur Medical College Hospital"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.hospitalAddress}</Text>
          <TextInput
            value={hospitalAddress}
            onChangeText={setHospitalAddress}
            placeholder="e.g. Medical College Rd, Rangpur"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.contactNumber}</Text>
          <TextInput
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="e.g. 01711-123456"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.whatsappNumber}</Text>
          <TextInput
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder="e.g. 01711-123456"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{Strings.reasonOptional}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={Strings.reasonPlaceholder}
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.multilineInput]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            (!canSubmit || submitting) && styles.submitBtnDisabled,
            pressed && styles.pressed,
          ]}>
          {submitting ? (
            <Text style={styles.submitBtnText}>{Strings.submitting}</Text>
          ) : (
            <>
              <SymbolView
                name={{ ios: 'paperplane.fill', android: 'send', web: 'send' } as never}
                size={18}
                tintColor="#fff"
              />
              <Text style={styles.submitBtnText}>{Strings.submitRequest}</Text>
            </>
          )}
        </Pressable>

        {submitError && (
          <View style={styles.errorBox}>
            <SymbolView
              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'alert_triangle' } as never}
              size={16}
              tintColor="#dc2626"
            />
            <Text style={styles.errorText}>{Strings.submitError}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
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
    minHeight: 80,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 8,
    height: 44,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  formChipActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  formChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  formChipTextActive: {
    color: '#fff',
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.red,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: Spacing.two,
    shadowColor: Brand.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  successHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.four,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.red,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: Spacing.three,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  trackingCodeBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  trackingCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackingCodeValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 1,
  },
  trackingCodeHint: {
    fontSize: 11,
    color: '#65a30d',
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});