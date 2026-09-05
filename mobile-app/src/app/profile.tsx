import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  login,
  signup,
  fetchCurrentUser,
  logout,
  submitDonorRegistration,
  type AuthUser,
} from '@/lib/api';

type Tab = 'login' | 'signup' | 'register' | 'profile';

const BG_OPTIONS = BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }));
const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d.id, label: d.name }));
const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'male', label: Strings.male },
  { value: 'female', label: Strings.female },
  { value: 'other', label: Strings.other },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [fullNameEn, setFullNameEn] = useState('');
  const [fullNameBn, setFullNameBn] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [upazilaId, setUpazilaId] = useState('');
  const [sex, setSex] = useState('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [preferredContact, setPreferredContact] = useState('call');
  const [hbLevel, setHbLevel] = useState('');
  const [lastHbTestDate, setLastHbTestDate] = useState('');
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [hasChronicDisease, setHasChronicDisease] = useState(false);
  const [diseaseDetails, setDiseaseDetails] = useState('');

  const upazilaOptions = districtId
    ? getUpazilasByDistrict(districtId).map((u) => ({ value: u.id, label: u.name }))
    : [];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    const result = await fetchCurrentUser();
    if (result.user) {
      setUser(result.user);
      setTab('profile');
    } else {
      setUser(null);
      setTab('login');
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const result = await login({
        identifier: loginEmail.trim(),
        password: loginPassword,
      });
      setUser(result.user);
      setTab('profile');
    } catch (err: any) {
      setLoginError(err?.message || Strings.loginError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupEmail.trim().includes('@') || !signupPassword.trim()) {
      setSignupError('Please enter a valid email and password');
      return;
    }
    if (signupName.trim().length < 2) {
      setSignupError('Please enter your full name');
      return;
    }
    if (signupPhone.trim().length < 10) {
      setSignupError('Please enter a valid phone number');
      return;
    }
    setSignupLoading(true);
    setSignupError(null);
    try {
      const result = await signup({
        email: signupEmail.trim(),
        password: signupPassword,
        fullNameEn: signupName.trim(),
        phone: signupPhone.trim(),
      });
      setUser(result.user);
      setTab('profile');
    } catch (err: any) {
      setSignupError(err?.message || Strings.signupError);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setTab('login');
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleBecomeDonor = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitDonorRegistration({
        email: user?.email || '',
        fullNameEn: fullNameEn.trim(),
        fullNameBn: fullNameBn.trim() || undefined,
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || undefined,
        bloodGroup,
        districtId,
        upazilaId: upazilaId || undefined,
        address: address.trim() || undefined,
        sex,
        dateOfBirth: dateOfBirth.trim(),
        weightKg: parseFloat(weightKg) || undefined,
        occupation: occupation.trim() || undefined,
        preferredContact: preferredContact as 'call' | 'whatsapp' | 'either',
        hbLevel: hbLevel.trim() ? parseFloat(hbLevel) : undefined,
        lastHbTestDate: lastHbTestDate.trim() || undefined,
        lastDonationDate: lastDonationDate.trim() || undefined,
        hasChronicDisease,
        diseaseDetails: diseaseDetails.trim() || undefined,
      });
      setSubmitted(true);
      const result = await fetchCurrentUser();
      if (result.user) setUser(result.user);
    } catch (err: any) {
      setSubmitError(err?.message || Strings.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPhone = async () => {
    if (user?.phone) {
      await Clipboard.setStringAsync(user.phone);
    }
  };

  const canSubmit =
    fullNameEn.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    bloodGroup !== '' &&
    districtId !== '' &&
    dateOfBirth.trim().length >= 4 &&
    weightKg.trim() !== '' &&
    consent;

  const resetDonorForm = () => {
    setFullNameEn('');
    setFullNameBn('');
    setPhone('');
    setWhatsappNumber('');
    setBloodGroup('');
    setDistrictId('');
    setUpazilaId('');
    setSex('male');
    setDateOfBirth('');
    setWeightKg('');
    setOccupation('');
    setAddress('');
    setPreferredContact('call');
    setHbLevel('');
    setLastHbTestDate('');
    setLastDonationDate('');
    setHasChronicDisease(false);
    setDiseaseDetails('');
    setConsent(false);
    setSubmitted(false);
    setSubmitError(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingState, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.red} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.profile}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {user && (
          <Pressable onPress={() => setTab('profile')} style={[styles.tabBtn, tab === 'profile' && styles.tabBtnActive]}>
            <SymbolView
              name={{ ios: 'person.fill', android: 'person', web: 'person' } as never}
              size={14}
              tintColor={tab === 'profile' ? '#fff' : '#475569'}
            />
            <Text style={[styles.tabBtnText, tab === 'profile' && styles.tabBtnTextActive]}>Profile</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setTab(user ? 'register' : 'login')} style={[styles.tabBtn, (tab === 'login' || tab === 'register') && styles.tabBtnActive]}>
          <SymbolView
            name={{ ios: 'heart.fill', android: 'favorite', web: 'heart' } as never}
            size={14}
            tintColor={(tab === 'login' || tab === 'register') ? '#fff' : '#475569'}
          />
          <Text style={[styles.tabBtnText, (tab === 'login' || tab === 'register') && styles.tabBtnTextActive]}>
            {user ? 'Become Donor' : Strings.login}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: Spacing.three,
          paddingBottom: insets.bottom + Spacing.six,
          gap: Spacing.three,
        }}
        keyboardShouldPersistTaps="handled">

        {tab === 'profile' && user && (
          <ProfileView user={user} onLogout={handleLogout} onCopyPhone={copyPhone} />
        )}

        {tab === 'login' && !user && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{Strings.loginTitle}</Text>
            <Text style={styles.formSubtitle}>{Strings.loginSubtitle}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.email}</Text>
              <TextInput
                value={loginEmail}
                onChangeText={setLoginEmail}
                placeholder="e.g. abdul@email.com"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.password}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={8}>
                  <SymbolView
                    name={{ ios: showPassword ? 'eye.slash' : 'eye', android: showPassword ? 'visibility_off' : 'visibility', web: showPassword ? 'eye_off' : 'eye' } as never}
                    size={18}
                    tintColor="#94a3b8"
                  />
                </Pressable>
              </View>
            </View>

            {loginError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loginLoading}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
              {loginLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{Strings.login}</Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{Strings.dontHaveAccount}</Text>
              <Pressable onPress={() => setTab('signup')}>
                <Text style={styles.switchLink}>{Strings.signup}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === 'signup' && !user && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{Strings.signupTitle}</Text>
            <Text style={styles.formSubtitle}>{Strings.signupSubtitle}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.fullName}</Text>
              <TextInput
                value={signupName}
                onChangeText={setSignupName}
                placeholder="e.g. Abdul Karim"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.email}</Text>
              <TextInput
                value={signupEmail}
                onChangeText={setSignupEmail}
                placeholder="e.g. abdul@email.com"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.phone}</Text>
              <TextInput
                value={signupPhone}
                onChangeText={setSignupPhone}
                placeholder="e.g. 01711-123456"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{Strings.password}</Text>
              <TextInput
                value={signupPassword}
                onChangeText={setSignupPassword}
                placeholder="Create a password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
              />
            </View>

            {signupError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{signupError}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSignup}
              disabled={signupLoading}
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
              {signupLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{Strings.signup}</Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{Strings.haveAccount}</Text>
              <Pressable onPress={() => setTab('login')}>
                <Text style={styles.switchLink}>{Strings.login}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === 'register' && (
          <DonorForm
            fullNameEn={fullNameEn}
            setFullNameEn={setFullNameEn}
            fullNameBn={fullNameBn}
            setFullNameBn={setFullNameBn}
            phone={phone}
            setPhone={setPhone}
            whatsappNumber={whatsappNumber}
            setWhatsappNumber={setWhatsappNumber}
            bloodGroup={bloodGroup}
            setBloodGroup={setBloodGroup}
            districtId={districtId}
            setDistrictId={setDistrictId}
            upazilaId={upazilaId}
            setUpazilaId={setUpazilaId}
            upazilaOptions={upazilaOptions}
            sex={sex}
            setSex={setSex}
            dateOfBirth={dateOfBirth}
            setDateOfBirth={setDateOfBirth}
            weightKg={weightKg}
            setWeightKg={setWeightKg}
            occupation={occupation}
            setOccupation={setOccupation}
            address={address}
            setAddress={setAddress}
            preferredContact={preferredContact}
            setPreferredContact={setPreferredContact}
            hbLevel={hbLevel}
            setHbLevel={setHbLevel}
            lastHbTestDate={lastHbTestDate}
            setLastHbTestDate={setLastHbTestDate}
            lastDonationDate={lastDonationDate}
            setLastDonationDate={setLastDonationDate}
            hasChronicDisease={hasChronicDisease}
            setHasChronicDisease={setHasChronicDisease}
            diseaseDetails={diseaseDetails}
            setDiseaseDetails={setDiseaseDetails}
            consent={consent}
            setConsent={setConsent}
            canSubmit={canSubmit}
            submitting={submitting}
            submitted={submitted}
            submitError={submitError}
            onSubmit={handleBecomeDonor}
            onReset={resetDonorForm}
            isRegistered={!!user?.blood_group}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileView({ user, onLogout, onCopyPhone }: { user: AuthUser; onLogout: () => void; onCopyPhone: () => void }) {
  const initials = (user.full_name_en || user.email).split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  const infoRows = [
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || 'Not set', isPhone: true },
    { label: 'Blood Group', value: user.blood_group || 'Not set' },
    { label: 'District', value: user.district || 'Not set' },
    { label: 'Upazila', value: user.upazila || 'Not set' },
    { label: 'Date of Birth', value: user.date_of_birth || 'Not set' },
    { label: 'Gender', value: user.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : 'Not set' },
    { label: 'Weight', value: user.weight_kg ? `${user.weight_kg} kg` : 'Not set' },
    { label: 'Occupation', value: user.occupation || 'Not set' },
    { label: 'Preferred Contact', value: user.preferred_contact || 'Not set' },
    { label: 'HB Level', value: user.hb_level ? `${user.hb_level} g/dL` : 'Not tested' },
    { label: 'Last HB Test', value: user.last_hb_test_date || 'Not set' },
    { label: 'Last Donation', value: user.last_donation_date || 'Never' },
    { label: 'Chronic Disease', value: user.has_chronic_disease ? (user.disease_details || 'Yes') : 'No' },
    { label: 'Status', value: user.is_verified ? 'Verified' : (user.verification_status || 'Pending') },
  ];

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{initials}</Text>
      </View>
      <Text style={styles.profileName}>{user.full_name_en || 'User'}</Text>
      <Text style={styles.profileEmail}>{user.email}</Text>

      {user.blood_group && (
        <View style={styles.bloodGroupBadge}>
          <Text style={styles.bloodGroupBadgeText}>{user.blood_group}</Text>
        </View>
      )}

      <View style={styles.infoGrid}>
        {infoRows.map((row, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            {row.isPhone ? (
              <View style={styles.phoneRow}>
                <Text style={styles.infoValue}>{row.value}</Text>
                {row.value !== 'Not set' && (
                  <Pressable onPress={onCopyPhone} hitSlop={6}>
                    <Text style={styles.copyBtn}>{Strings.copyPhone}</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.infoValue}>{row.value}</Text>
            )}
          </View>
        ))}
      </View>

      <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'power.circle.fill', android: 'power_settings_new', web: 'log_out' } as never}
          size={18}
          tintColor="#dc2626"
        />
        <Text style={styles.logoutText}>{Strings.logout}</Text>
      </Pressable>
    </View>
  );
}

function DonorForm(props: any) {
  const {
    fullNameEn, setFullNameEn,
    fullNameBn, setFullNameBn,
    phone, setPhone,
    whatsappNumber, setWhatsappNumber,
    bloodGroup, setBloodGroup,
    districtId, setDistrictId,
    upazilaId, setUpazilaId,
    upazilaOptions,
    sex, setSex,
    dateOfBirth, setDateOfBirth,
    weightKg, setWeightKg,
    occupation, setOccupation,
    address, setAddress,
    preferredContact, setPreferredContact,
    hbLevel, setHbLevel,
    lastHbTestDate, setLastHbTestDate,
    lastDonationDate, setLastDonationDate,
    hasChronicDisease, setHasChronicDisease,
    diseaseDetails, setDiseaseDetails,
    consent, setConsent,
    canSubmit, submitting, submitted, submitError,
    onSubmit, onReset, isRegistered,
  } = props;

  const renderGenderChip = (opt: { value: string; label: string }) => {
    const isActive = opt.value === sex;
    return (
      <Pressable
        key={opt.value}
        onPress={() => setSex(opt.value)}
        style={[styles.formChip, isActive && styles.formChipActive]}
        hitSlop={4}>
        <Text style={[styles.formChipText, isActive && styles.formChipTextActive]}>{opt.label}</Text>
      </Pressable>
    );
  };

  if (submitted) {
    return (
      <View style={styles.formCard}>
        <View style={styles.successIcon}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as never}
            size={56}
            tintColor="#fff"
          />
        </View>
        <Text style={styles.successTitle}>{Strings.registrationSuccess}</Text>
        <Text style={styles.successHint}>{Strings.registrationSuccessHint}</Text>
        <Pressable onPress={onReset} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
          <Text style={styles.secondaryBtnText}>{isRegistered ? 'Back to Profile' : 'Register Another'}</Text>
        </Pressable>
      </View>
    );
  }

  if (isRegistered) {
    return (
      <View style={styles.formCard}>
        <View style={styles.alreadyRegistered}>
          <SymbolView
            name={{ ios: 'info.circle.fill', android: 'info', web: 'info' } as never}
            size={32}
            tintColor="#0ea5e9"
          />
          <Text style={styles.alreadyTitle}>You are already a registered donor</Text>
          <Text style={styles.alreadyHint}>Your profile shows your donor information and status.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{Strings.becomeDonorTitle}</Text>
      <Text style={styles.formSubtitle}>{Strings.becomeDonorSubtitle}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.fullName}</Text>
        <TextInput
          value={fullNameEn}
          onChangeText={setFullNameEn}
          placeholder="e.g. Abdul Karim"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.fullNameBn}</Text>
        <TextInput
          value={fullNameBn}
          onChangeText={setFullNameBn}
          placeholder="e.g. আব্দুল করিম"
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
          <Text style={styles.label}>{Strings.phone}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 01711-123456"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.whatsappNumberField}</Text>
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
        <SelectDropdown
          value={districtId}
          options={DISTRICT_OPTIONS}
          onChange={(v: string) => { setDistrictId(v); setUpazilaId(''); }}
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
        <Text style={styles.label}>{Strings.gender}</Text>
        <View style={styles.chipsContainer}>
          {GENDER_OPTIONS.map(renderGenderChip)}
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{Strings.dateOfBirth}</Text>
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{Strings.weightKg}</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="e.g. 65"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.occupation}</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          placeholder="e.g. Student, Teacher…"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.preferredContact}</Text>
        <View style={styles.chipsContainer}>
          <Pressable onPress={() => setPreferredContact('call')} style={[styles.formChip, preferredContact === 'call' && styles.formChipActive]}>
            <Text style={[styles.formChipText, preferredContact === 'call' && styles.formChipTextActive]}>{Strings.call}</Text>
          </Pressable>
          <Pressable onPress={() => setPreferredContact('whatsapp')} style={[styles.formChip, preferredContact === 'whatsapp' && styles.formChipActive]}>
            <Text style={[styles.formChipText, preferredContact === 'whatsapp' && styles.formChipTextActive]}>{Strings.whatsapp}</Text>
          </Pressable>
          <Pressable onPress={() => setPreferredContact('either')} style={[styles.formChip, preferredContact === 'either' && styles.formChipActive]}>
            <Text style={[styles.formChipText, preferredContact === 'either' && styles.formChipTextActive]}>{Strings.either}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.address}</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. House 12, Road 5, Rangpur"
          placeholderTextColor="#94a3b8"
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{Strings.hbLevel}</Text>
          <TextInput
            value={hbLevel}
            onChangeText={setHbLevel}
            placeholder="e.g. 13.5"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{Strings.lastHbTestDate}</Text>
          <TextInput
            value={lastHbTestDate}
            onChangeText={setLastHbTestDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{Strings.lastDonationDate}</Text>
        <TextInput
          value={lastDonationDate}
          onChangeText={setLastDonationDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Pressable
          onPress={() => setHasChronicDisease(!hasChronicDisease)}
          style={styles.consentRow}
          hitSlop={8}>
          <View style={[styles.checkbox, hasChronicDisease && styles.checkboxActive]}>
            {hasChronicDisease && (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' } as never}
                size={14}
                tintColor="#fff"
              />
            )}
          </View>
          <Text style={styles.consentText}>{Strings.hasChronicDisease}</Text>
        </Pressable>
      </View>

      {hasChronicDisease && (
        <View style={styles.field}>
          <Text style={styles.label}>{Strings.diseaseDetails}</Text>
          <TextInput
            value={diseaseDetails}
            onChangeText={setDiseaseDetails}
            placeholder="e.g. Diabetes, hypertension…"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.multilineInput]}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      )}

      <Pressable
        onPress={() => setConsent(!consent)}
        style={styles.consentRow}
        hitSlop={8}>
        <View style={[styles.checkbox, consent && styles.checkboxActive]}>
          {consent && (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' } as never}
              size={14}
              tintColor="#fff"
            />
          )}
        </View>
        <Text style={styles.consentText}>{Strings.consent}</Text>
      </Pressable>

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit || submitting}
        style={({ pressed }) => [
          styles.submitBtn,
          (!canSubmit || submitting) && styles.submitBtnDisabled,
          pressed && styles.pressed,
        ]}>
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>{Strings.registerDonor}</Text>
        )}
      </Pressable>

      {submitError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: Brand.red,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#fff',
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -8,
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
    minHeight: 60,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  eyeBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: '#e2e8f0',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
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

  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Brand.red,
    borderColor: Brand.red,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
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

  errorBox: {
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
    textAlign: 'center',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.two,
  },
  switchText: {
    fontSize: 13,
    color: '#64748b',
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.red,
  },
  pressed: {
    opacity: 0.85,
  },

  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  secondaryBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignSelf: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  bloodGroupBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  bloodGroupBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.red,
  },
  infoGrid: {
    width: '100%',
    gap: 8,
    marginTop: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'right',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  copyBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.red,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 14,
    marginTop: Spacing.two,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },

  alreadyRegistered: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  alreadyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  alreadyHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
