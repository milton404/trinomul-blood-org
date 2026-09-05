'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { serverAdminCreateBloodRequest } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { X, Loader2, Plus, MapPin, Navigation, ClipboardPaste, ArrowDown, Search, Crosshair, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { RANGPUR_DISTRICTS, RANGPUR_UPAZILAS } from '@/lib/constants/rangpur';
import { reverseGeocode } from '@/lib/reverse-geocode';
import { type PlaceSearchResult } from '@/lib/forward-geocode';
import { serverSearchMedicalPlace } from '@/lib/forward-geocode-server';

const LocationPickerMap = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-2xl bg-slate-100 animate-pulse" />,
  },
);

interface CreateRequestModalProps {
  onClose: () => void;
  onDone: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const WHEN_NEEDED_OPTIONS = [
  { value: 'now', en: 'Now', bn: 'এখনই' },
  { value: 'today', en: 'Today', bn: 'আজ' },
  { value: 'tomorrow', en: 'Tomorrow', bn: 'আগামীকাল' },
  { value: 'day_after', en: 'Day After Tomorrow', bn: 'পরশু' },
  { value: 'within_3_days', en: 'Within 3 Days', bn: '৩ দিনের মধ্যে' },
  { value: 'within_week', en: 'Within a Week', bn: 'এক সপ্তাহের মধ্যে' },
  { value: 'specific_date', en: 'Specific Date', bn: 'নির্দিষ্ট তারিখ' },
];

function placeTypeLabel(place: PlaceSearchResult, isBn: boolean): string | null {
  const t = (place.type || '').toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || '';
  const healthcare = place.address?.healthcare?.toLowerCase() || '';

  if (t === 'hospital' || amenity === 'hospital' || healthcare === 'hospital' || /hospital/.test(t)) {
    return isBn ? 'হাসপাতাল' : 'Hospital';
  }
  if (t === 'clinic' || amenity === 'clinic' || healthcare === 'clinic') {
    return isBn ? 'ক্লিনিক' : 'Clinic';
  }
  if (amenity === 'doctors' || healthcare === 'doctor') {
    return isBn ? 'ডাক্তার' : 'Doctors';
  }
  if (t === 'city' || t === 'town') {
    return isBn ? 'শহর' : 'City';
  }
  if (t === 'village') {
    return isBn ? 'গ্রাম' : 'Village';
  }
  if (t === 'administrative' || t === 'suburb') {
    return isBn ? 'এলাকা' : 'Area';
  }
  return null;
}

function placeTypeColor(place: PlaceSearchResult): string {
  const t = (place.type || '').toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || '';

  if (t === 'hospital' || amenity === 'hospital' || /hospital/.test(t)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (t === 'clinic' || amenity === 'clinic') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (amenity === 'doctors') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (t === 'city' || t === 'town') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (t === 'village') {
    return 'bg-green-50 text-green-700 border-green-200';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

/**
 * Admin-posted blood request. Uses the same underlying create flow as the
 * public form but stamps requester_type='admin' and skips guest-only
 * fields. The request appears on the public feed immediately.
 */
export default function CreateRequestModal({ onClose, onDone }: CreateRequestModalProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    patient_name: '',
    patient_age: '',
    blood_group: 'A+',
    units_needed: 1,
    urgency_level: 'normal',
    when_needed: 'now',
    needed_date: '',
    needed_time: '',
    district: RANGPUR_DISTRICTS[0]?.name_en || 'Rangpur',
    upazila: '',
    hospital_name: '',
    hospital_address: '',
    contact_number: '',
    alternative_number: '',
    patient_hb_level: '',
    reason: '',
  });

  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pickedLocationName, setPickedLocationName] = useState<string | null>(null);
  const [hospitalAddressTouched, setHospitalAddressTouched] = useState(false);
  const [hospitalNameTouched, setHospitalNameTouched] = useState(false);

  // Location search state
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeAbortRef = useRef<AbortController | null>(null);
  const placeContainerRef = useRef<HTMLDivElement>(null);

  const handlePlaceSearch = useCallback(async (rawQuery?: string) => {
    const q = (rawQuery ?? placeQuery).trim();
    if (!q) {
      setPlaceResults([]);
      setPlaceError(null);
      setShowPlaceResults(false);
      return;
    }

    // Cancel any prior in-flight request
    if (placeAbortRef.current) placeAbortRef.current.abort();
    const controller = new AbortController();
    placeAbortRef.current = controller;

    setPlaceSearching(true);
    setPlaceError(null);
    setShowPlaceResults(true);
    setPlaceResults([]);
    setSelectedIdx(-1);

    try {
      const results = await serverSearchMedicalPlace(q);

      if (controller.signal.aborted) return;

      setPlaceResults(results);

      if (results.length === 0) {
        setPlaceError(
          isBn
            ? 'কোনো হাসপাতাল বা স্থান পাওয়া যায়নি। অন্য নাম দিয়ে চেষ্টা করুন।'
            : 'No hospital or place found. Try a different name.',
        );
      } else {
        // If the result came from the AI/local fallback, surface a toast
        const usedFallback = results.some(
          (r) => typeof r.placeId === 'number' && r.placeId < 0,
        );
        if (usedFallback) {
          toast.success(
            isBn
              ? `AI আপনার লেখা বুঝেছে: "${results[0].shortName}"`
              : `AI understood your text: "${results[0].shortName}"`,
          );
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setPlaceError(err?.message || 'Search failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPlaceSearching(false);
    }
  }, [placeQuery, isBn]);

  const handlePlaceInput = useCallback((value: string) => {
    setPlaceQuery(value);
    setSelectedIdx(-1);

    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      setPlaceError(null);
      setShowPlaceResults(false);
      if (placeAbortRef.current) placeAbortRef.current.abort();
      return;
    }

    placeDebounceRef.current = setTimeout(() => {
      handlePlaceSearch(value);
    }, 350);
  }, [handlePlaceSearch]);

  const handlePlaceKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlaceResults || placeResults.length === 0) {
      if (e.key === 'Enter' && placeQuery.trim().length >= 2) {
        e.preventDefault();
        if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
        handlePlaceSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < placeResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : placeResults.length - 1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handlePickPlace(placeResults[selectedIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPlaceResults(false);
      setSelectedIdx(-1);
    }
  }, [showPlaceResults, placeResults, selectedIdx, placeQuery, handlePlaceSearch]);

  const handlePickPlace = (place: PlaceSearchResult) => {
    setMapLat(place.lat);
    setMapLng(place.lng);
    setPickedLocationName(place.shortName || null);
    setPlaceQuery(place.shortName);
    setShowPlaceResults(false);
    // Auto-expand the map so the user can see the pin fly to the picked location
    setMapExpanded(true);
    setFlyTrigger((n) => n + 1);

    // Auto-fill district/upazila from address
    const addr = place.address;
    if (addr?.state_district || addr?.county) {
      if (addr.state_district) {
        const cleanDistrict = addr.state_district.replace(/\s*District$/i, '').trim();
        const matchedDistrict = RANGPUR_DISTRICTS.find(
          (d) => d.name_en.toLowerCase() === cleanDistrict.toLowerCase(),
        );
        if (matchedDistrict) {
          setFormData((prev) => ({ ...prev, district: matchedDistrict.name_en, upazila: '' }));
          if (addr.county) {
            const cleanUpazila = addr.county.replace(/\s*Upazila$/i, '').trim();
            const matchedUpazila = RANGPUR_UPAZILAS.find(
              (u) => u.district_id === matchedDistrict.id && u.name_en.toLowerCase() === cleanUpazila.toLowerCase(),
            );
            if (matchedUpazila) {
              setTimeout(() => setFormData((prev) => ({ ...prev, upazila: matchedUpazila.name_en })), 50);
            }
          }
        }
      }
    }

    // Auto-fill hospitalName and hospitalAddress
    let filledFromSearch = false;
    if (!hospitalAddressTouched) {
      setFormData((prev) => ({ ...prev, hospital_address: place.displayName }));
      filledFromSearch = true;
    }
    if (!hospitalNameTouched) {
      const medicalKeywordRe = /(hospital|clinic|medical|health|diagnostic|college|center|centre|sadar|complex|nursing|dental|eye|shishu|cardiac|kidney|cancer|pharmacy|হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|কলেজ|সদর|কমপ্লেক্স)/i;
      const isMedicalType =
        place.type === 'hospital' ||
        place.type === 'clinic' ||
        addr?.amenity === 'hospital' ||
        addr?.amenity === 'clinic' ||
        !!addr?.hospital;

      let candidate = '';
      // 1) If the result is typed as a hospital/clinic, use its shortName
      if (isMedicalType && place.shortName) {
        candidate = place.shortName;
      }
      // 2) Otherwise, check if shortName contains a medical keyword
      if (!candidate && place.shortName && medicalKeywordRe.test(place.shortName)) {
        candidate = place.shortName;
      }
      // 3) Otherwise, check the first chunk of displayName
      if (!candidate && place.displayName) {
        const firstChunk = place.displayName.split(',')[0]?.trim();
        if (firstChunk && medicalKeywordRe.test(firstChunk)) {
          candidate = firstChunk;
        }
      }
      if (candidate) {
        setFormData((prev) => ({ ...prev, hospital_name: candidate }));
      }
    }
  };

  const handleMapPin = async (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        const detailParts: string[] = [];
        if (result.town || result.village) detailParts.push(result.town || result.village || '');
        if (result.upazila) detailParts.push(result.upazila);
        if (result.district) detailParts.push(result.district);
        const label = detailParts.length > 0 ? detailParts.join(', ') : result.shortName;
        const mapName = result.displayName?.split(',')[0]?.trim() || label;
        setPickedLocationName(mapName);

        // Auto-select district/upazila
        if (result.district) {
          const cleanDistrict = result.district.replace(/\s*District$/i, '').trim();
          const matchedDistrict = RANGPUR_DISTRICTS.find(
            (d) => d.name_en.toLowerCase() === cleanDistrict.toLowerCase(),
          );
          if (matchedDistrict) {
            setFormData((prev) => ({ ...prev, district: matchedDistrict.name_en, upazila: '' }));
            if (result.upazila) {
              const cleanUpazila = result.upazila.replace(/\s*Upazila$/i, '').trim();
              const matchedUpazila = RANGPUR_UPAZILAS.find(
                (u) =>
                  u.district_id === matchedDistrict.id &&
                  u.name_en.toLowerCase() === cleanUpazila.toLowerCase(),
              );
              if (matchedUpazila) {
                setTimeout(() => setFormData((prev) => ({ ...prev, upazila: matchedUpazila.name_en })), 50);
              }
            }
          }
        }

        // Auto-paste address if user hasn't typed
        if (!hospitalAddressTouched) {
          const addressLabel = result.displayName || label;
          setFormData((prev) => ({ ...prev, hospital_address: addressLabel }));
        }
        // Auto-fill hospital name if it looks medical
        if (!hospitalNameTouched && result.displayName) {
          const firstChunk = result.displayName.split(',')[0]?.trim();
          if (
            firstChunk &&
            /(hospital|clinic|medical|health|diagnostic|college|center|centre|sadar|complex|hospotal|nursing|dental|eye|shishu|cardiac|কমপ্লেক্স|হাসপাতাল|মেডিকেল|ক্লিনিক|স্বাস্থ্য|কলেজ|সদর)/i.test(firstChunk)
          ) {
            setFormData((prev) => ({ ...prev, hospital_name: firstChunk }));
          }
        }
      }
    } catch {
      // keep coordinates
    }
  };

  const pasteToAddress = () => {
    if (pickedLocationName) {
      setFormData((prev) => ({ ...prev, hospital_address: pickedLocationName }));
      setHospitalAddressTouched(true);
      toast.success(isBn ? 'হাসপাতালের ঠিকানা ম্যাপ থেকে সেট করা হয়েছে' : 'Hospital address set from map');
    }
  };

  /**
   * Dedicated "Use My Location" handler — same system as the public request
   * form. Acquires GPS, drops a pin, recenters the map, reverse-geocodes and
   * fills district/upazila/address. Shows a spinner while acquiring and
   * surfaces an error toast if the browser denies permission.
   */
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(
        isBn
          ? 'আপনার ব্রাউজারে লোকেশন সুবিধা নেই। ম্যাপে ক্লিক করুন।'
          : 'Geolocation is not supported in your browser. Click the map instead.',
      );
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapLat(latitude);
        setMapLng(longitude);
        setFlyTrigger((n) => n + 1);
        // Reset guards so GPS can overwrite any previous search/manual entry.
        setHospitalNameTouched(false);
        setHospitalAddressTouched(false);
        handleMapPin(latitude, longitude).finally(() => setGpsLoading(false));
      },
      () => {
        setGpsLoading(false);
        toast.error(
          isBn
            ? 'লোকেশন পাওয়া যায়নি। পারমিশন দিন বা ম্যাপে ক্লিক করুন।'
            : 'Could not get your location. Allow permission or click the map.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [isBn, handleMapPin]);

  const selectedDistrict = RANGPUR_DISTRICTS.find(
    (d) => d.name_en === formData.district || d.name_bn === formData.district,
  );
  const upazilas = selectedDistrict
    ? RANGPUR_UPAZILAS.filter((u) => u.district_id === selectedDistrict.id)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name.trim() || !formData.contact_number.trim() || !formData.hospital_name.trim()) {
      toast.error(t('create_request_required') || 'Patient name, hospital and contact number are required');
      return;
    }
    setIsLoading(true);
    try {
      await serverAdminCreateBloodRequest({
        requesterId: null,
        patientName: formData.patient_name.trim(),
        patientAge: parseInt(formData.patient_age) || null,
        bloodGroup: formData.blood_group,
        unitsNeeded: formData.units_needed || 1,
        urgencyLevel: formData.urgency_level,
        whenNeeded: formData.when_needed,
        neededDate: formData.when_needed === 'specific_date' && formData.needed_date ? formData.needed_date : null,
        neededTime: formData.needed_time || null,
        district: formData.district,
        upazila: formData.upazila || null,
        lat: mapLat,
        lng: mapLng,
        hospitalName: formData.hospital_name.trim(),
        hospitalAddress: formData.hospital_address.trim() || null,
        contactNumber: formData.contact_number.trim(),
        alternativeNumber: formData.alternative_number.trim() || null,
        reason: formData.reason.trim() || null,
        patientHbLevel: formData.patient_hb_level ? parseFloat(formData.patient_hb_level) : null,
        ipAddress: null,
        userAgent: 'admin-panel',
      });
      toast.success(t('request_created') || 'Request created');
      onDone();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-red-600" />
            {t('create_request') || 'Create Request'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 relative">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patient_name')} *</label>
              <input
                type="text"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patient_age')}</label>
              <input
                type="number"
                min="0"
                value={formData.patient_age}
                onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('blood_group')}</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className={inputCls}
              >
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('units_needed')}</label>
              <input
                type="number"
                min="1"
                value={formData.units_needed}
                onChange={(e) => setFormData({ ...formData, units_needed: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patient_hb_level')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                placeholder="12.5"
                value={formData.patient_hb_level}
                onChange={(e) => setFormData({ ...formData, patient_hb_level: e.target.value })}
                className={inputCls}
              />
              <p className="text-slate-400 text-[11px] mt-1">{t('patient_hb_hint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('urgency')}</label>
              <select
                value={formData.urgency_level}
                onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                className={inputCls}
              >
                <option value="normal">{t('normal')}</option>
                <option value="urgent">{t('urgent')}</option>
                <option value="critical">{t('critical')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('when_needed') || 'When needed'}
              </label>
              <select
                value={formData.when_needed}
                onChange={(e) => setFormData({ ...formData, when_needed: e.target.value })}
                className={inputCls}
              >
                {WHEN_NEEDED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{isBn ? o.bn : o.en}</option>
                ))}
              </select>
            </div>
            {formData.when_needed !== 'now' && (
              <>
                {formData.when_needed === 'specific_date' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('needed_date') || 'Needed date'}
                    </label>
                    <input
                      type="date"
                      value={formData.needed_date}
                      onChange={(e) => setFormData({ ...formData, needed_date: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('needed_time') || 'Needed time'}
                  </label>
                  <input
                    type="time"
                    value={formData.needed_time}
                    onChange={(e) => setFormData({ ...formData, needed_time: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('district') || 'District'}</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value, upazila: '' })}
                className={inputCls}
              >
                {RANGPUR_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.name_en}>{isBn ? d.name_bn : d.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('upazila') || 'Upazila'}</label>
              <select
                value={formData.upazila}
                onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                className={inputCls}
              >
                <option value="">{t('select_upazila') || 'Select upazila'}</option>
                {upazilas.map((u) => (
                  <option key={u.id} value={u.name_en}>{isBn ? u.name_bn : u.name_en}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location search bar — always visible, independent of the map.
              Uses the same AI-powered search system as the public request form.
              Users can search for places without opening the map. */}
          <div ref={placeContainerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isBn ? 'স্থান খুঁজুন (বাংলা / English / Banglish)' : 'Search location (Bangla / English / Banglish)'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={placeQuery}
                  onChange={(e) => handlePlaceInput(e.target.value)}
                  onKeyDown={handlePlaceKeyDown}
                  onFocus={() => {
                    if (placeResults.length > 0 || placeError) setShowPlaceResults(true);
                  }}
                  placeholder={isBn ? 'যেমন: রংপুর সদর, saidpur, lalmonirhat, RMCH...' : 'e.g. Rangpur Sadar, saidpur, lalmonirhat, RMCH...'}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm transition-all"
                  autoComplete="off"
                  spellCheck={false}
                />
                {/* Clear button */}
                {placeQuery && !placeSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlaceQuery('');
                      setPlaceResults([]);
                      setPlaceError(null);
                      setShowPlaceResults(false);
                      setSelectedIdx(-1);
                      if (placeAbortRef.current) placeAbortRef.current.abort();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {/* Live-search spinner */}
                {placeSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-red-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
                  handlePlaceSearch();
                }}
                disabled={placeSearching || !placeQuery.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {placeSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isBn ? 'খুঁজুন' : 'Search'}</span>
              </button>
            </div>

            {/* Helper hint line */}
            {placeQuery.trim().length > 0 && placeQuery.trim().length < 2 && (
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {isBn ? 'আরও একটি অক্ষর লিখুন...' : 'Type one more character to search...'}
              </p>
            )}

            {/* Search results dropdown */}
            {showPlaceResults && (placeResults.length > 0 || placeError || placeSearching) && (
              <div
                style={{ animation: 'request-search-dropdown-in 0.15s ease-out' }}
                className="absolute z-50 mt-1 w-full max-w-[calc(100%-5rem)] bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-y-auto"
              >
                {placeSearching && placeResults.length === 0 && (
                  <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    <span>{isBn ? 'AI স্থান খুঁজছি...' : 'AI searching location...'}</span>
                  </div>
                )}
                {placeError && !placeSearching && (
                  <div className="p-3 text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{placeError}</span>
                  </div>
                )}
                {placeResults.map((place, idx) => {
                  const isSelected = idx === selectedIdx;
                  const typeLabel = placeTypeLabel(place, isBn);
                  const typeColor = placeTypeColor(place);
                  return (
                    <button
                      key={place.placeId ?? `${place.lat}-${place.lng}-${idx}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handlePickPlace(place); }}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-b-0 transition-colors ${isSelected ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-red-600' : 'text-red-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-800 truncate flex-1">{place.shortName}</p>
                            {typeLabel && (
                              <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeColor}`}>
                                {typeLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{place.displayName}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <style>{`
            @keyframes request-search-dropdown-in {
              0% { opacity: 0; transform: translateY(-6px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Crosshair className="w-3 h-3" />
            {isBn
              ? 'সার্চ করুন, অথবা ম্যাপ খুলে পিন করুন — জেলা/উপজেলা অটো-ফিল হবে, ভুল হলে ম্যানুয়ালি ঠিক করতে পারেন'
              : 'Search above, or open the map to pin the spot — district/upazila auto-fill but you can manually fix them'}
          </p>

          {/* Map location picker — collapsible, only mounts when expanded */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setMapExpanded(!mapExpanded)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="w-4 h-4 text-red-600" />
                {isBn ? 'ম্যাপে লোকেশন চিহ্নিত করুন' : 'Pin Location on Map'}
                {mapLat != null && mapLng != null && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    ✓ {isBn ? 'সেট করা হয়েছে' : 'Set'}
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-500">
                {mapExpanded ? (isBn ? 'বন্ধ করুন' : 'Collapse') : (isBn ? 'খুলুন' : 'Expand')}
              </span>
            </button>
            {mapExpanded && (
              <div className="p-4 space-y-3">
                <LocationPickerMap
                  label={
                    isBn
                      ? 'হাসপাতাল / রক্তের প্রয়োজনীয় স্থান চিহ্নিত করুন'
                      : 'Pin Hospital / Blood Needed Location'
                  }
                  hint={
                    isBn
                      ? 'ম্যাপে ক্লিক করে পিন সরান, টেনে ফাইন-টিউন করুন, অথবা "Use My Location" ব্যবহার করুন।'
                      : 'Click the map to reposition the pin. Drag to fine-tune, or use "Use My Location".'
                  }
                  height={220}
                  showLocateButton={true}
                  showCoordinates={true}
                  initialLat={mapLat}
                  initialLng={mapLng}
                  flyTrigger={flyTrigger}
                  onLocationChange={handleMapPin}
                  locationName={pickedLocationName}
                  onUseMyLocation={handleUseMyLocation}
                  locating={gpsLoading}
                />
                {mapLat != null && mapLng != null && (
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${mapLat},${mapLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {isBn ? 'গুগল ম্যাপে খুলুন' : 'Open in Google Maps'}
                    </a>
                    <button
                      type="button"
                      onClick={pasteToAddress}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      {isBn ? 'ঠিকানায় পেস্ট করুন' : 'Paste to Address'}
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name')} *</label>
              <input
                type="text"
                value={formData.hospital_name}
                onChange={(e) => {
                  setFormData({ ...formData, hospital_name: e.target.value });
                  setHospitalNameTouched(true);
                }}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_address')}</label>
              <input
                type="text"
                value={formData.hospital_address}
                onChange={(e) => {
                  setFormData({ ...formData, hospital_address: e.target.value });
                  setHospitalAddressTouched(true);
                }}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact_number')} *</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('alternative_number')}</label>
              <input
                type="text"
                value={formData.alternative_number}
                onChange={(e) => setFormData({ ...formData, alternative_number: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('reason')}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t('create_request') || 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
